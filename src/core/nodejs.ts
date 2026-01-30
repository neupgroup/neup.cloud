/**
 * Node.js Application Commands
 * Unified command definitions for Node.js applications
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
 * Port finder utility script
 */
const getPortFinderScript = (preferredPorts: number[] = []) => {
    const portsStr = preferredPorts.join(' ');
    return `
find_port() {
    local PORTS="$1"
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
`;
};

/**
 * Build Command
 */
export const build = (context: CommandContext): CommandDefinition => ({
    title: 'Build',
    description: 'Build the application for production',
    icon: 'Hammer',
    status: 'published',
    type: 'normal',
    command: {
        mainCommand: `cd ${context.appLocation} && npm install && if grep -q "\\"build\\":" "package.json"; then npm run build; fi`
    }
});

/**
 * Start Command (Production)
 */
export const start = (context: CommandContext): CommandDefinition => {
    const entryFile = context.entryFile || 'index.js';
    return {
        title: 'Start',
        description: 'Start the application in production mode',
        icon: 'PlayCircle',
        status: 'published',
        type: 'success',
        command: {
            preCommand: getPortFinderScript(context.preferredPorts || []),
            mainCommand: `cd ${context.appLocation} && PORT=$CHOSEN_PORT pm2 start ${entryFile} --name "${context.appName}"`
        }
    };
};

/**
 * Stop Command
 */
export const stop = (context: CommandContext): CommandDefinition => ({
    title: 'Stop',
    description: 'Stop the running application',
    icon: 'StopCircle',
    status: 'published',
    type: 'destructive',
    command: {
        mainCommand: `pm2 stop ${context.appName}`
    }
});

/**
 * Restart Command
 */
export const restart = (context: CommandContext): CommandDefinition => ({
    title: 'Restart',
    description: 'Restart the application with latest changes',
    icon: 'RefreshCw',
    status: 'published',
    type: 'normal',
    command: {
        mainCommand: `pm2 restart "${context.appName}"`
    }
});

/**
 * Get all available commands for Node.js
 */
export const getAllCommands = (context: CommandContext): Record<string, CommandDefinition> => ({
    build: build(context),
    start: start(context),
    stop: stop(context),
    restart: restart(context),
});

/**
 * Get command by name
 */
export const getCommand = (name: string, context: CommandContext): CommandDefinition | null => {
    const commands = getAllCommands(context);
    return commands[name] || null;
};

/**
 * Legacy compatibility - get command string
 */
export const getStartCommand = (appName: string, appLocation: string, entryFile: string = 'index.js', preferredPorts: number[] = []) => {
    const cmd = start({ appName, appLocation, entryFile, preferredPorts });
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};

export const getStopCommand = (appName: string) => {
    const cmd = stop({ appName, appLocation: '' });
    return cmd.command.mainCommand;
};

export const getBuildCommand = (appLocation: string) => {
    const cmd = build({ appName: '', appLocation });
    return cmd.command.mainCommand;
};
