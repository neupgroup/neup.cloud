
export interface RequirementStep {
    name: string;
    description: string;
    icon: string; // Lucide icon name
    checkCommand: string; // Exit 0 = complete
    installCommand: string;
    uninstallCommand?: string;
}

export interface RequirementDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    steps: RequirementStep[];
}

export const requirements: RequirementDefinition[] = [
    {
        id: 'nodejs',
        title: 'Node.js',
        description: 'Install this if you plan to host applications built with Node.js (e.g., Next.js, Express, NestJS).',
        icon: 'Hexagon',
        steps: [
            {
                name: 'Install Node.js (LTS)',
                description: 'Install Node.js v20.x from NodeSource.',
                icon: 'Download',
                checkCommand: 'node -v',
                installCommand: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs`,
                uninstallCommand: 'sudo apt-get purge -y nodejs'
            },
            {
                name: 'Verify NPM',
                description: 'Ensure NPM is installed and working.',
                icon: 'Package',
                checkCommand: 'npm -v',
                installCommand: 'sudo apt-get install -y npm', // Usually comes with nodejs, but just in case
                uninstallCommand: 'sudo apt-get purge -y npm'
            }
        ]
    },
    {
        id: 'pm2',
        title: 'PM2 Process Manager',
        description: 'Required for keeping your Node.js applications alive forever. Install this after Node.js.',
        icon: 'Activity',
        steps: [
            {
                name: 'Install PM2',
                description: 'Install PM2 globally using NPM.',
                icon: 'Download',
                checkCommand: 'pm2 -v',
                installCommand: 'sudo npm install -g pm2',
                uninstallCommand: 'sudo npm uninstall -g pm2'
            },
            {
                name: 'Configure Startup',
                description: 'Setup PM2 to resurrect processes on boot.',
                icon: 'Settings',
                // check if systemd file exists or if startup command was run? 
                // Hard to check perfectly, but checking if the service is enabled is a good proxy.
                checkCommand: 'systemctl is-enabled pm2-root',
                installCommand: 'pm2 startup && pm2 save',
                uninstallCommand: 'pm2 unstartup'
            }
        ]
    },
    {
        id: 'supervisor',
        title: 'Supervisor',
        description: 'Essential for managing background processes and workers (like Python/Gunicorn, Go binaries, or queue workers). Install this to ensure your apps auto-restart on failure.',
        icon: 'Box',
        steps: [
            {
                name: 'Install Supervisor',
                description: 'Install the supervisor package from apt repositories.',
                icon: 'Download',
                checkCommand: 'supervisord --version',
                installCommand: `sudo apt-get update && sudo apt-get install -y supervisor`,
                uninstallCommand: 'sudo apt-get purge -y supervisor'
            },
            {
                name: 'Create Directories',
                description: 'Create required directories and set permissions.',
                icon: 'Folder',
                checkCommand: '[ -d /etc/supervisor/conf.d ] && [ -d /var/log/supervisor ] && [ -d /var/run ]',
                installCommand: `sudo mkdir -p /etc/supervisor/conf.d && sudo mkdir -p /var/log/supervisor && sudo mkdir -p /var/run && sudo chmod 755 /etc/supervisor && sudo chmod 755 /etc/supervisor/conf.d && sudo chmod 755 /var/log/supervisor`,
                uninstallCommand: 'sudo rm -rf /etc/supervisor && sudo rm -rf /var/log/supervisor && sudo rm -rf /var/run/supervisor*'
            },
            {
                name: 'Verify Main Config',
                description: 'Ensure the main supervisord.conf exists with correct content.',
                icon: 'FileText',
                checkCommand: '[ -f /etc/supervisor/supervisord.conf ]',
                installCommand: `
if [ ! -f /etc/supervisor/supervisord.conf ]; then
cat <<EOF | sudo tee /etc/supervisor/supervisord.conf
[unix_http_server]
file=/var/run/supervisor.sock
chmod=0700

[supervisord]
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
childlogdir=/var/log/supervisor

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

[include]
files = /etc/supervisor/conf.d/*.conf
EOF
fi`,
                uninstallCommand: 'sudo rm -f /etc/supervisor/supervisord.conf'
            },
            {
                name: 'Start Supervisor',
                description: 'Start the supervisor service.',
                icon: 'Play',
                checkCommand: 'sudo systemctl is-active supervisor',
                installCommand: 'sudo systemctl start supervisor',
                uninstallCommand: 'sudo systemctl stop supervisor || true'
            },
            {
                name: 'Enable Auto Start',
                description: 'Enable supervisor to start on boot.',
                icon: 'Zap',
                checkCommand: 'sudo systemctl is-enabled supervisor',
                installCommand: 'sudo systemctl enable supervisor',
                uninstallCommand: 'sudo systemctl disable supervisor || true'
            }
        ]
    },
    {
        id: 'go',
        title: 'Go (Golang)',
        description: 'Install the Go programming language to build and run high-performance applications and binaries.',
        icon: 'Binary',
        steps: [
            {
                name: 'Install Go',
                description: 'Install the latest stable version of Go from the official Ubuntu repositories.',
                icon: 'Download',
                checkCommand: 'go version',
                installCommand: 'sudo apt-get update && sudo apt-get install -y golang-go',
                uninstallCommand: 'sudo apt-get purge -y golang-go && sudo apt-get autoremove -y'
            },
            {
                name: 'Environment Setup',
                description: 'Verify Go workspace and environment variables.',
                icon: 'Settings',
                checkCommand: 'go env GOROOT',
                installCommand: 'go env',
                uninstallCommand: 'echo "Environment variables will be removed with the package"'
            }
        ]
    }
];
