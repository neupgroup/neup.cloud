/**
 * Python Application Commands
 * Unified command definitions for Python applications
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
 * Get all commands for Python applications
 * Simply add a new object to this array to add a new command!
 */
export const getCommands = (context: CommandContext): CommandDefinition[] => {
    const portsStr = context.preferredPorts?.join(' ') || '';
    const entryFile = context.entryFile || 'main.py';

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
        // Start Command (Production)
        {
            title: 'Start',
            description: 'Start the Python application',
            icon: 'PlayCircle',
            status: 'published',
            type: 'success',
            command: {
                preCommand: portFinderScript,
                mainCommand: `cd ${context.appLocation} && PORT=$CHOSEN_PORT pm2 start ${entryFile} --name "${context.appName}" --interpreter python3`
            }
        },

        // Stop Command
        {
            title: 'Stop',
            description: 'Stop the running Python application',
            icon: 'StopCircle',
            status: 'published',
            type: 'destructive',
            command: {
                mainCommand: `pm2 stop ${context.appName}`
            }
        },

        // Restart Command
        {
            title: 'Restart',
            description: 'Restart the Python application with latest changes',
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
export const getStartCommand = (appName: string, appLocation: string, entryFile: string = 'main.py', preferredPorts: number[] = []) => {
    const commands = getCommands({ appName, appLocation, entryFile, preferredPorts });
    const cmd = commands.find(c => c.title === 'Start');
    if (!cmd) return '';
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};

export const getStopCommand = (appName: string) => {
    const commands = getCommands({ appName, appLocation: '' });
    const cmd = commands.find(c => c.title === 'Stop');
    return cmd?.command.mainCommand || '';
};
