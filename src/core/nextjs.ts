/**
 * Next.js Application Commands
 * Unified command definitions for Next.js applications
 */

export interface CommandDefinition {
    title: string;
    description: string;
    icon: string;
    status: 'published' | 'unpublished';
    type: 'normal' | 'destructive' | 'success';
    command: {
        preCommand?: string;
        mainCommand: string;
        postCommand?: string;
    };
}

export interface CommandContext {
    appName: string;
    appLocation: string;
    preferredPorts?: number[];
    entryFile?: string;
}

/**
 * Get all commands for Next.js applications
 * Simply add a new object to this array to add a new command!
 */
export const getCommands = (context: CommandContext): CommandDefinition[] => {
    const portsStr = context.preferredPorts?.join(' ') || '';

    const portFinderScript = portsStr ? `
find_port() {
    local PORTS="${portsStr}"
    for port in $PORTS; do
        if ! (echo >/dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    # Fallback to random port
    while true; do
        local rand=$(( ( RANDOM % 10000 ) + 3000 ))
        if ! (echo >/dev/tcp/127.0.0.1/$rand) >/dev/null 2>&1; then
            echo $rand
            return 0
        fi
    done
}
CHOSEN_PORT=$(find_port "${portsStr}")
echo "Selected Port: $CHOSEN_PORT"
` : '';

    return [
        // Install Command
        {
            title: 'Install',
            description: 'Install dependencies and prepare the application',
            icon: 'Download',
            status: 'published',
            type: 'normal',
            command: {
                mainCommand: `cd ${context.appLocation} && npm install`
            }
        },

        // Build Command
        {
            title: 'Build',
            description: 'Build the application for production',
            icon: 'Hammer',
            status: 'published',
            type: 'normal',
            command: {
                preCommand: `cd ${context.appLocation} && rm -rf .next`,
                mainCommand: `cd ${context.appLocation} && NODE_OPTIONS="--max-old-space-size=1400" npm run build`
            }
        },

        // Start Command (Production)
        {
            title: 'Start',
            description: 'Start the application in production mode',
            icon: 'PlayCircle',
            status: 'published',
            type: 'success',
            command: {
                preCommand: portFinderScript,
                mainCommand: `cd ${context.appLocation} && PORT=$CHOSEN_PORT pm2 start npm --name "${context.appName}" -- start -- -p $CHOSEN_PORT`
            }
        },

        // Dev Command (Development)
        {
            title: 'Dev',
            description: 'Start the application in development mode',
            icon: 'Terminal',
            status: 'published',
            type: 'normal',
            command: {
                preCommand: portFinderScript,
                mainCommand: `cd ${context.appLocation} && npm install && PORT=$CHOSEN_PORT pm2 start npm --name "${context.appName}" -- run dev -- -p $CHOSEN_PORT`
            }
        },

        // Stop Command
        {
            title: 'Stop',
            description: 'Stop the running application',
            icon: 'StopCircle',
            status: 'published',
            type: 'destructive',
            command: {
                mainCommand: `pm2 stop ${context.appName} && pm2 delete ${context.appName}`
            }
        },

        // Restart Command
        {
            title: 'Restart',
            description: 'Restart the application with latest changes',
            icon: 'RefreshCw',
            status: 'published',
            type: 'normal',
            command: {
                mainCommand: `pm2 restart "${context.appName}"`
            }
        },
    ];
};

/**
 * Get all commands as a keyed object (for backward compatibility)
 */
export const getAllCommands = (context: CommandContext): Record<string, CommandDefinition> => {
    const commands = getCommands(context);
    const result: Record<string, CommandDefinition> = {};

    commands.forEach(cmd => {
        const key = cmd.title.toLowerCase();
        result[key] = cmd;
    });

    return result;
};

/**
 * Legacy compatibility functions
 */
export const getStartCommand = (appName: string, appLocation: string, preferredPorts: number[] = []) => {
    const commands = getCommands({ appName, appLocation, preferredPorts });
    const cmd = commands.find(c => c.title === 'Start');
    if (!cmd) return '';
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};

export const getStopCommand = (appName: string) => {
    const commands = getCommands({ appName, appLocation: '' });
    const cmd = commands.find(c => c.title === 'Stop');
    return cmd?.command.mainCommand || '';
};

export const getBuildCommand = (appLocation: string) => {
    const commands = getCommands({ appName: '', appLocation });
    const cmd = commands.find(c => c.title === 'Build');
    if (!cmd) return '';
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};

export const getInstallCommand = (appLocation: string) => {
    const commands = getCommands({ appName: '', appLocation });
    const cmd = commands.find(c => c.title === 'Install');
    return cmd?.command.mainCommand || '';
};

export const getDevCommand = (appName: string, appLocation: string, preferredPorts: number[] = []) => {
    const commands = getCommands({ appName, appLocation, preferredPorts });
    const cmd = commands.find(c => c.title === 'Dev');
    if (!cmd) return '';
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};
