/**
 * Nginx Configuration Generator
 * Unified module for generating Nginx configurations
 */

export interface NginxLocation {
    path: string;
    proxyPass?: string; // If proxying to another server/upstream
    isStatic?: boolean; // If served locally (ignored path)
    root?: string; // For static files
}

export interface NginxConfigInput {
    domain: string; // The server name (e.g., example.com)
    port?: number;
    locations: NginxLocation[];
    mainAppPort?: number; // Default local app port
}

export function generateNginxConfig(input: NginxConfigInput): string {
    const { domain, locations, mainAppPort = 3000 } = input;
    const port = input.port || 80;

    // Sort locations by path length (longest first) to ensure correct matching order in Nginx
    const sortedLocations = [...locations].sort((a, b) => b.path.length - a.path.length);

    let locationBlocks = '';

    // Handle specific locations
    sortedLocations.forEach((loc) => {
        locationBlocks += `
    location ${loc.path} {
`;

        if (loc.isStatic) {
            // If it's a static/local path we want to serve from this server.
            // Usually this means we don't proxy_pass, or we proxy_pass to the local main app if it handles it.
            // Based on user prompt: "serve on the same server".
            // If the main app handles it, it's just proxy_pass http://localhost:MAIN_PORT
            // If it's purely static files, we'd use 'root'. 
            // Assuming for now "same server" means the default local upstream.
            locationBlocks += `        proxy_pass http://localhost:${mainAppPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
`;
        } else if (loc.proxyPass) {
            locationBlocks += `        proxy_pass ${loc.proxyPass};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
`;
        } else {
            // Fallback or empty? keeping it basic.
            locationBlocks += `        # No configuration provided for this location
`;
        }

        locationBlocks += `    }
`;
    });

    // Default root location / check if already defined
    const hasRoot = sortedLocations.some(l => l.path === '/');
    if (!hasRoot) {
        locationBlocks += `
    location / {
        proxy_pass http://localhost:${mainAppPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
`;
    }

    return `server {
    listen ${port};
    listen [::]:${port};
    server_name ${domain};

    # Logging
    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;

${locationBlocks}
}
`;
}
