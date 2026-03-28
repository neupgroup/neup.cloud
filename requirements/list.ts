
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
    },
    {
        id: 'nginx',
        title: 'Nginx Web Server',
        description: 'High-performance HTTP server and reverse proxy. Essential for serving web applications and handling SSL/TLS.',
        icon: 'Globe',
        steps: [
            {
                name: 'Install Nginx',
                description: 'Install Nginx from official repositories.',
                icon: 'Download',
                checkCommand: 'nginx -v',
                installCommand: 'sudo apt-get update && sudo apt-get install -y nginx',
                uninstallCommand: 'sudo apt-get purge -y nginx && sudo apt-get autoremove -y'
            },
            {
                name: 'Verify Service',
                description: 'Ensure Nginx is running and enabled.',
                icon: 'Activity',
                checkCommand: 'sudo systemctl is-active nginx',
                installCommand: 'sudo systemctl start nginx && sudo systemctl enable nginx',
                uninstallCommand: 'sudo systemctl stop nginx || true'
            },
            {
                name: 'Firewall Configuration',
                description: 'Allow HTTP and HTTPS traffic through ufw.',
                icon: 'ShieldCheck',
                checkCommand: 'sudo ufw status | grep -q "Nginx Full"',
                installCommand: 'sudo ufw allow "Nginx Full"',
                uninstallCommand: 'sudo ufw delete allow "Nginx Full" || true'
            }
        ]
    },
    {
        id: 'system-logger',
        title: 'System Performance Logger',
        description: 'Enables high-resolution performance monitoring and historical data collection. Essential for real-time server health tracking.',
        icon: 'Activity',
        steps: [
            {
                name: 'Install Logging Script',
                description: 'Deploy the background monitoring script to your home directory.',
                icon: 'FileCode',
                checkCommand: '[ -f ~/.status/logger.sh ]',
                installCommand: `mkdir -p ~/.status && cat << 'EOF' > ~/.status/logger.sh
#!/bin/bash
STATUS_DIR=".status"
CPU_LOG="cpu.usage"
RAM_LOG="ram.usage"
NET_LOG="network.usage"

mkdir -p ~/$STATUS_DIR
cd ~/$STATUS_DIR

# Detect Interface
IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
if [ -z "$IFACE" ]; then IFACE=$(ls /sys/class/net | grep -v lo | head -n1); fi

get_net_bytes() {
    grep "$IFACE" /proc/net/dev | sed 's/:/ /' | awk '{print $2, $10}'
}

read PREV_RX PREV_TX <<< $(get_net_bytes)

while true; do
    cpu_info=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')
    echo "$(date +%s) $cpu_info" >> $CPU_LOG
    ram_info=$(free -m | grep Mem | awk '{print $2, $3, $4}')
    echo "$(date +%s) $ram_info" >> $RAM_LOG
    read CURR_RX CURR_TX <<< $(get_net_bytes)
    DIFF_RX=$((CURR_RX - PREV_RX))
    DIFF_TX=$((CURR_TX - PREV_TX))
    if [ $DIFF_RX -lt 0 ]; then DIFF_RX=0; fi
    if [ $DIFF_TX -lt 0 ]; then DIFF_TX=0; fi
    echo "$(date +%s) $DIFF_RX $DIFF_TX" >> $NET_LOG
    PREV_RX=$CURR_RX
    PREV_TX=$CURR_TX
    sleep 60
done
EOF
chmod +x ~/.status/logger.sh`
            },
            {
                name: 'Configure System Service',
                description: 'Setup a systemd service to ensure the logger starts on boot and restarts on failure.',
                icon: 'Settings',
                checkCommand: '[ -f /etc/systemd/system/neup-logger.service ]',
                installCommand: `cat << EOF | sudo tee /etc/systemd/system/neup-logger.service
[Unit]
Description=Neup.Cloud System Performance Logger
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$HOME
ExecStart=/bin/bash -c "exec -a neup-logger /bin/bash $HOME/.status/logger.sh"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload`
            },
            {
                name: 'Enable and Start',
                description: 'Activate the monitoring service.',
                icon: 'Play',
                checkCommand: 'sudo systemctl is-active neup-logger && sudo systemctl is-enabled neup-logger',
                installCommand: 'sudo systemctl enable neup-logger && sudo systemctl start neup-logger'
            }
        ]
    },
    {
        id: 'uncrashable',
        title: 'Uncrashable',
        description: 'Hardens the server against total lockups and ensures SSH priority even under heavy load.',
        icon: 'ShieldAlert',
        steps: [
            {
                name: 'SSH Immunity',
                description: 'Protects the SSH process from being killed by the OOM (Out-of-Memory) killer.',
                icon: 'Shield',
                checkCommand: '[ -f /etc/systemd/system/ssh.service.d/override.conf ] && grep -q "OOMScoreAdjust=-1000" /etc/systemd/system/ssh.service.d/override.conf',
                installCommand: `sudo mkdir -p /etc/systemd/system/ssh.service.d && echo -e "[Service]\nOOMScoreAdjust=-1000" | sudo tee /etc/systemd/system/ssh.service.d/override.conf && sudo systemctl daemon-reload && sudo systemctl restart ssh`
            },
            {
                name: 'Emergency RAM Buffer (5%)',
                description: 'Reserves 5% of system RAM for kernel and emergency admin operations to prevent total system freezes.',
                icon: 'Zap',
                checkCommand: '[ -f /etc/sysctl.d/99-emergency-buffer.conf ]',
                installCommand: `TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}') && FIVE_PERCENT=$((TOTAL_KB * 5 / 100)) && echo "vm.min_free_kbytes = $FIVE_PERCENT" | sudo tee /etc/sysctl.d/99-emergency-buffer.conf && sudo sysctl -p /etc/sysctl.d/99-emergency-buffer.conf`
            }
        ]
    }
];
