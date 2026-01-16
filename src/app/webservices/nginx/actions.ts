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
    action: 'proxy' | 'return-404';
    proxyTarget?: 'remote-server' | 'local-port';
    serverId?: string;
    serverName?: string;
    serverIp?: string;
    port?: string;
    localPort?: string;
    proxySettings?: ProxySettings;
    subPaths?: SubPath[];
}

interface NginxConfiguration {
    serverIp: string;
    domainId?: string;
    domainName?: string;
    pathRules: PathRule[];
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
        // Sort rules by path length (longest first) for proper Nginx matching
        const sortedRules = config.pathRules && config.pathRules.length > 0
            ? [...config.pathRules].sort((a, b) => b.path.length - a.path.length)
            : [];

        let locationBlocks = '';

        // Process all rules and their sub-paths
        for (const rule of sortedRules) {
            if (rule.action === 'return-404') {
                // Return 404 for this path
                locationBlocks += `
    location ${rule.path} {
        return 404;
    }
`;
            } else if (rule.action === 'proxy') {
                // Determine proxy URL based on target type
                let proxyUrl = '';

                if (rule.proxyTarget === 'local-port' && rule.localPort) {
                    // Proxy to localhost:port
                    proxyUrl = `http://localhost:${rule.localPort}`;
                } else if (rule.proxyTarget === 'remote-server' && rule.serverIp && rule.port) {
                    // Proxy to remote server
                    proxyUrl = `http://${rule.serverIp}:${rule.port}`;
                } else {
                    // Skip if proxy target is not properly configured
                    continue;
                }

                // First, handle sub-paths (they need to come before the main path in nginx)
                if (rule.subPaths && rule.subPaths.length > 0) {
                    // Sort sub-paths by length (longest first)
                    const sortedSubPaths = [...rule.subPaths].sort((a, b) => b.path.length - a.path.length);

                    for (const subPath of sortedSubPaths) {
                        const fullPath = `${rule.path}${subPath.path}`;

                        if (subPath.action === 'serve-local') {
                            // Serve locally - try files first, then return 404
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

                // Then handle the main path proxy
                // Get proxy settings with defaults
                const settings = rule.proxySettings || {};
                const setHost = settings.setHost !== false; // default true
                const setRealIp = settings.setRealIp !== false; // default true
                const setForwardedFor = settings.setForwardedFor !== false; // default true
                const setForwardedProto = settings.setForwardedProto !== false; // default true
                const upgradeWebSocket = settings.upgradeWebSocket !== false; // default true

                let proxyHeaders = '';

                // WebSocket upgrade headers
                if (upgradeWebSocket) {
                    proxyHeaders += `
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;`;
                }

                // Standard proxy headers
                if (setHost) {
                    proxyHeaders += `
        proxy_set_header Host $host;`;
                }
                if (setRealIp) {
                    proxyHeaders += `
        proxy_set_header X-Real-IP $remote_addr;`;
                }
                if (setForwardedFor) {
                    proxyHeaders += `
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`;
                }
                if (setForwardedProto) {
                    proxyHeaders += `
        proxy_set_header X-Forwarded-Proto $scheme;`;
                }

                // Custom headers
                if (settings.customHeaders && settings.customHeaders.length > 0) {
                    for (const header of settings.customHeaders) {
                        if (header.key && header.value) {
                            proxyHeaders += `
        proxy_set_header ${header.key} ${header.value};`;
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

        // Use domain name if available, otherwise use IP
        const serverName = config.domainName || config.serverIp || 'your-server-ip';

        // Check if root path is already defined in rules
        const hasRootRule = sortedRules.some(rule => rule.path === '/');

        // Default location behavior
        let defaultLocation = '';
        if (sortedRules.length === 0) {
            // If no paths are defined, serve everything locally
            defaultLocation = `
    # Default location - serve all paths
    location / {
        try_files $uri $uri/ =404;
    }
`;
        } else if (!hasRootRule) {
            // If paths are defined but root is not, return 404 for undefined paths
            defaultLocation = `
    # Default location - return 404 for undefined paths
    location / {
        return 404;
    }
`;
        }

        const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
${locationBlocks}${defaultLocation}}
`;

        return { success: true, config: nginxConfig };
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

        if (!config || !config.pathRules || config.pathRules.length === 0) {
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
        // 2. Write new config to temp file
        // 3. Move to sites-available with the specific name
        // 4. Create symlink to sites-enabled
        // 5. Test config with nginx -t
        // 6. Restart nginx to apply changes
        const deployCommand = `
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
