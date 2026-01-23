'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { runCommandOnServer } from '@/services/ssh';

const { firestore } = initializeFirebase();

interface SubPath {
    id: string;
    path: string;
    action: 'serve-local' | 'return-404';
}

interface ProxySettings {
    setHost?: boolean;
    setRealIp?: boolean;
    setForwardedFor?: boolean;
    setForwardedProto?: boolean;
    upgradeWebSocket?: boolean;
    customHeaders?: { key: string; value: string; id: string }[];
}

interface PathRule {
    id: string;
    path: string;
    action: 'proxy' | 'return-404' | 'redirect-301' | 'redirect-302' | 'redirect-307' | 'redirect-308';
    proxyTarget?: 'remote-server' | 'local-port';
    serverId?: string;
    serverName?: string;
    serverIp?: string;
    port?: string;
    localPort?: string;
    proxySettings?: ProxySettings;
    subPaths?: SubPath[];
    redirectTarget?: string;
    passParameters?: boolean;
}

interface DomainRedirect {
    id: string;
    subdomain?: string;
    domainId: string;
    domainName: string;
    redirectTarget: string;
}

interface DomainBlock {
    id: string;
    domainId: string;
    domainName: string;
    subdomain?: string;
    domainPath?: string;
    httpsRedirection: boolean;
    sslEnabled: boolean;
    pathRules: PathRule[];
}

interface NginxConfiguration {
    serverIp: string;
    configName: string;
    blocks: DomainBlock[];
    domainRedirects?: DomainRedirect[];
    updatedAt?: any;
}

/**
 * Save Nginx configuration for a specific server
 */
export async function saveNginxConfiguration(
    serverId: string,
    config: NginxConfiguration
) {
    try {
        const configRef = doc(firestore, 'nginx-configurations', serverId);

        await setDoc(configRef, {
            ...config,
            updatedAt: new Date().toISOString(),
        });

        revalidatePath('/webservices/nginx');

        return { success: true };
    } catch (error: any) {
        console.error('Error saving nginx configuration:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Nginx configuration for a specific server
 */
export async function getNginxConfiguration(serverId: string) {
    try {
        const configRef = doc(firestore, 'nginx-configurations', serverId);
        const configDoc = await getDoc(configRef);

        if (!configDoc.exists()) {
            return null;
        }

        return configDoc.data() as NginxConfiguration;
    } catch (error: any) {
        console.error('Error fetching nginx configuration:', error);
        return null;
    }
}

/**
 * Fetch the public IP of a server by running a command on it
 */
export async function getServerPublicIp(serverId: string) {
    try {
        // Get server details
        const serverRef = doc(firestore, 'servers', serverId);
        const serverDoc = await getDoc(serverRef);

        if (!serverDoc.exists()) {
            return { success: false, error: 'Server not found' };
        }

        const server = serverDoc.data();

        // Check if we already have the public IP
        if (server.publicIp) {
            return { success: true, publicIp: server.publicIp };
        }

        // If not, try to fetch it via SSH
        if (!server.username || !server.privateKey) {
            return {
                success: false,
                error: 'Server credentials not configured for SSH access'
            };
        }

        // Use a reliable method to get public IP
        // We'll try multiple services in case one fails
        const commands = [
            'curl -s ifconfig.me',
            'curl -s icanhazip.com',
            'curl -s ipecho.net/plain',
            'dig +short myip.opendns.com @resolver1.opendns.com',
        ];

        let publicIp = '';

        for (const command of commands) {
            try {
                const result = await runCommandOnServer(
                    server.publicIp || server.privateIp,
                    server.username,
                    server.privateKey,
                    command,
                    undefined,
                    undefined,
                    true // Skip swap for quick commands
                );

                if (result.code === 0 && result.stdout.trim()) {
                    publicIp = result.stdout.trim();
                    break;
                }
            } catch (e) {
                // Try next command
                continue;
            }
        }

        if (!publicIp) {
            return {
                success: false,
                error: 'Failed to fetch public IP from server'
            };
        }

        return { success: true, publicIp };
    } catch (error: any) {
        console.error('Error fetching server public IP:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate Nginx configuration file content from current context/form state
 * This allows generating config without requiring saved configuration
 */
export async function generateNginxConfigFromContext(config: NginxConfiguration) {
    try {
        let nginxConfig = '';

        // Process domain redirects (global)
        if (config.domainRedirects && config.domainRedirects.length > 0) {
            for (const redirect of config.domainRedirects) {
                const redirectName = redirect.subdomain ? `${redirect.subdomain}.${redirect.domainName}` : redirect.domainName;
                nginxConfig += `
server {
    listen 80;
    listen [::]:80;
    server_name ${redirectName};
    return 301 ${redirect.redirectTarget};
}
`;
            }
        }

        // Process domain blocks
        for (const block of config.blocks) {
            // Sort rules by path length (longest first) for proper Nginx matching
            const sortedRules = block.pathRules && block.pathRules.length > 0
                ? [...block.pathRules].sort((a, b) => b.path.length - a.path.length)
                : [];

            let locationBlocks = '';

            // Process all rules and their sub-paths
            for (const rule of sortedRules) {
                if (rule.action === 'return-404') {
                    locationBlocks += `
    location ${rule.path} {
        return 404;
    }
`;
                } else if (rule.action.startsWith('redirect-')) {
                    let statusCode = rule.action.split('-')[1];
                    let target = rule.redirectTarget || 'https://google.com';

                    if (rule.passParameters) {
                        if (target.endsWith('/')) target = target.slice(0, -1);
                        target = `${target}$request_uri`;
                    }

                    locationBlocks += `
    location ${rule.path} {
        return ${statusCode} ${target};
    }
`;
                } else if (rule.action === 'proxy') {
                    let proxyUrl = '';
                    if (rule.proxyTarget === 'local-port' && rule.localPort) {
                        proxyUrl = `http://localhost:${rule.localPort}`;
                    } else if (rule.proxyTarget === 'remote-server' && rule.serverIp && rule.port) {
                        proxyUrl = `http://${rule.serverIp}:${rule.port}`;
                    } else {
                        continue;
                    }

                    if (rule.subPaths && rule.subPaths.length > 0) {
                        const sortedSubPaths = [...rule.subPaths].sort((a, b) => b.path.length - a.path.length);
                        for (const subPath of sortedSubPaths) {
                            const fullPath = `${rule.path}${subPath.path}`;
                            if (subPath.action === 'serve-local') {
                                locationBlocks += `
    location ${fullPath} {
        try_files $uri $uri/ =404;
    }
`;
                            } else if (subPath.action === 'return-404') {
                                locationBlocks += `
    location ${fullPath} {
        return 404;
    }
`;
                            }
                        }
                    }

                    const settings = rule.proxySettings || {};
                    const upgradeWebSocket = settings.upgradeWebSocket !== false;
                    let proxyHeaders = '';

                    if (upgradeWebSocket) {
                        proxyHeaders += `
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;`;
                    }

                    if (settings.setHost !== false) proxyHeaders += `\n        proxy_set_header Host $host;`;
                    if (settings.setRealIp !== false) proxyHeaders += `\n        proxy_set_header X-Real-IP $remote_addr;`;
                    if (settings.setForwardedFor !== false) proxyHeaders += `\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`;
                    if (settings.setForwardedProto !== false) proxyHeaders += `\n        proxy_set_header X-Forwarded-Proto $scheme;`;

                    if (settings.customHeaders && settings.customHeaders.length > 0) {
                        for (const header of settings.customHeaders) {
                            if (header.key && header.value) {
                                proxyHeaders += `\n        proxy_set_header ${header.key} ${header.value};`;
                            }
                        }
                    }

                    locationBlocks += `
    location ${rule.path} {
        proxy_pass ${proxyUrl};${proxyHeaders}
    }
`;
                }
            }

            let serverName = block.domainName;
            if (block.subdomain) {
                if (block.subdomain === '@') {
                    // Root domain only (no subdomain)
                    serverName = block.domainName;
                } else if (block.subdomain === '#') {
                    // Catch-all wildcard for all other subdomains
                    serverName = `*.${block.domainName}`;
                } else {
                    // Specific subdomain
                    serverName = `${block.subdomain}.${block.domainName}`;
                }
            }

            const hasRootRule = sortedRules.some(rule => rule.path === '/');
            let defaultLocation = '';
            if (sortedRules.length === 0) {
                defaultLocation = `
    location / {
        try_files $uri $uri/ =404;
    }
`;
            } else if (!hasRootRule) {
                defaultLocation = `
    location / {
        return 404;
    }
`;
            }

            if (block.sslEnabled) {
                const sslKeyPath = `/etc/nginx/ssl/${config.configName}.key`;
                const sslCertPath = `/etc/nginx/ssl/${config.configName}.pem`;

                // 1. HTTP Block (Port 80)
                // If HTTPS redirection is on, we redirect 80 -> 443
                // Otherwise, we serve content on 80 as well
                if (block.httpsRedirection) {
                    nginxConfig += `
server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};
    return 301 https://$host$request_uri;
}
`;
                } else {
                    nginxConfig += `
server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

${locationBlocks}${defaultLocation}}
`;
                }

                // 2. HTTPS Block (Port 443)
                nginxConfig += `
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${serverName};

    ssl_certificate ${sslCertPath};
    ssl_certificate_key ${sslKeyPath};

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

${locationBlocks}${defaultLocation}}
`;
            } else {
                // SSL Disabled - Serve Standard HTTP
                // Triggers if sslEnabled is false, regardless of httpsRedirection setting
                // (Prevents generating a redirect to a non-existent HTTPS server)
                nginxConfig += `
server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

${locationBlocks}${defaultLocation}}
`;
            }
        }

        return { success: true, config: nginxConfig.trim() };
    } catch (error: any) {
        console.error('Error generating nginx config from context:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate Nginx configuration file content from path rules
 */
export async function generateNginxConfigFile(serverId: string) {
    try {
        const config = await getNginxConfiguration(serverId);

        if (!config || !config.blocks || config.blocks.length === 0) {
            return {
                success: false,
                error: 'No configuration found for this server'
            };
        }

        // Use the new context-based generator
        return await generateNginxConfigFromContext(config);
    } catch (error: any) {
        console.error('Error generating nginx config:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete Nginx configuration from the server
 * Removes from both sites-available and sites-enabled, then reloads nginx
 */
export async function deleteNginxConfig(serverId: string, configName: string) {
    try {
        // Get server details
        const serverRef = doc(firestore, 'servers', serverId);
        const serverDoc = await getDoc(serverRef);

        if (!serverDoc.exists()) {
            return { success: false, error: 'Server not found' };
        }

        const server = serverDoc.data();

        if (!server.username || !server.privateKey) {
            return {
                success: false,
                error: 'Server credentials not configured'
            };
        }

        // Prevent deletion of default config
        if (configName === 'default') {
            return {
                success: false,
                error: 'Cannot delete default configuration'
            };
        }

        // Delete config from both sites-enabled and sites-available, then reload nginx
        const deleteCommand = `
            sudo rm -f /etc/nginx/sites-enabled/${configName} && \
            sudo rm -f /etc/nginx/sites-available/${configName} && \
            sudo nginx -t && \
            sudo systemctl reload nginx
        `;

        const result = await runCommandOnServer(
            server.publicIp || server.privateIp,
            server.username,
            server.privateKey,
            deleteCommand,
            undefined,
            undefined,
            false
        );

        if (result.code !== 0) {
            return {
                success: false,
                error: `Deletion failed: ${result.stderr}`
            };
        }

        return {
            success: true,
            message: `Nginx configuration '${configName}' deleted and nginx reloaded successfully`,
            output: result.stdout
        };
    } catch (error: any) {
        console.error('Error deleting nginx config:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deploy the generated Nginx configuration to the server
 */
export async function deployNginxConfig(serverId: string, configContent?: string, configName?: string) {
    try {
        let finalConfig = configContent;

        // If no config content provided, try to generate it from the saved state (backward compatibility)
        if (!finalConfig) {
            const configResult = await generateNginxConfigFile(serverId);
            if (!configResult.success || !configResult.config) {
                return {
                    success: false,
                    error: configResult.error || 'Failed to generate config'
                };
            }
            finalConfig = configResult.config;
        }

        // Get server details
        const serverRef = doc(firestore, 'servers', serverId);
        const serverDoc = await getDoc(serverRef);

        if (!serverDoc.exists()) {
            return { success: false, error: 'Server not found' };
        }

        const server = serverDoc.data();

        if (!server.username || !server.privateKey) {
            return {
                success: false,
                error: 'Server credentials not configured'
            };
        }

        // Determine file name (default to 'default' if not provided)
        const siteName = configName || 'default';
        const configFileName = `/tmp/nginx-${serverId}-${siteName}.conf`;

        // Escape the config content for shell
        const escapedConfig = finalConfig.replace(/'/g, "'\\''");

        // Deploy the config
        // 1. Remove previous config files if they exist (from both sites-enabled and sites-available)
        // 2. Also remove .conf variant if we are deploying a name without extension (to avoid dangling symlinks/conflicts)
        // 3. Write new config to temp file
        // 4. Move to sites-available with the specific name
        // 5. Create symlink to sites-enabled
        // 6. Test config with nginx -t
        // 7. Restart nginx to apply changes

        let cleanupExtra = '';
        if (!siteName.endsWith('.conf')) {
            cleanupExtra = `sudo rm -f /etc/nginx/sites-enabled/${siteName}.conf && sudo rm -f /etc/nginx/sites-available/${siteName}.conf && `;
        }

        const deployCommand = `
            ${cleanupExtra}
            sudo rm -f /etc/nginx/sites-enabled/${siteName} && \
            sudo rm -f /etc/nginx/sites-available/${siteName} && \
            echo '${escapedConfig}' > ${configFileName} && \
            sudo cp ${configFileName} /etc/nginx/sites-available/${siteName} && \
            sudo ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/${siteName} && \
            sudo nginx -t && \
            sudo systemctl restart nginx
        `;

        const result = await runCommandOnServer(
            server.publicIp || server.privateIp,
            server.username,
            server.privateKey,
            deployCommand,
            undefined,
            undefined,
            false // Use enhanced runner (with swap) for deployment
        );

        if (result.code !== 0) {
            return {
                success: false,
                error: `Deployment failed: ${result.stderr}`
            };
        }

        return {
            success: true,
            message: `Nginx configuration '${siteName}' deployed and reloaded successfully`,
            output: result.stdout
        };
    } catch (error: any) {
        console.error('Error deploying nginx config:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate SSL certificate using Certbot
 */
export async function generateSslCertificate(serverId: string, domain: string, configName: string) {
    try {
        // Get server details
        const serverRef = doc(firestore, 'servers', serverId);
        const serverDoc = await getDoc(serverRef);

        if (!serverDoc.exists()) {
            return { success: false, error: 'Server not found' };
        }

        const server = serverDoc.data();

        if (!server.username || !server.privateKey) {
            return {
                success: false,
                error: 'Server credentials not configured'
            };
        }

        const sslDir = '/etc/nginx/ssl';
        const certName = configName; // configName is required now
        const keyPath = `${sslDir}/${certName}.key`;
        const certPath = `${sslDir}/${certName}.pem`;

        // 1. Ensure SSL directory exists
        // 2. Ensure firewall allows HTTP/HTTPS
        // 3. Install certbot
        // 4. Create temporary self-signed certificate if missing (to fix Nginx "catch-22" where it won't start/test without the files)
        // 5. Try to generate certificate
        // 6. Copy with -L to follow symlinks to predictable paths
        const command = `
            sudo mkdir -p ${sslDir} && \
            sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && \
            sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx && \
            ( [ -f ${certPath} ] || sudo openssl req -x509 -nodes -days 1 -newkey rsa:2048 -keyout ${keyPath} -out ${certPath} -subj "/CN=${domain}" ) && \
            sudo systemctl start nginx || true && \
            sudo certbot certonly --nginx -d ${domain} --cert-name ${domain} --non-interactive --agree-tos --register-unsafely-without-email --force-renewal && \
            sudo cp -L /etc/letsencrypt/live/${domain}/privkey.pem ${keyPath} && \
            sudo cp -L /etc/letsencrypt/live/${domain}/fullchain.pem ${certPath} && \
            sudo chmod 600 ${keyPath} && \
            sudo chmod 644 ${certPath}
        `;

        const result = await runCommandOnServer(
            server.publicIp || server.privateIp,
            server.username,
            server.privateKey,
            command,
            undefined,
            undefined,
            false
        );

        if (result.code !== 0) {
            return {
                success: false,
                error: `Certificate generation failed: ${result.stderr}`
            };
        }

        return {
            success: true,
            message: `Certificate for ${domain} generated and saved as ${certName}.key/pem`,
            output: result.stdout
        };
    } catch (error: any) {
        console.error('Error generating SSL certificate:', error);
        return { success: false, error: error.message };
    }
}
