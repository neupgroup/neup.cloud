/**
 * Next.js Application Commands
 * Unified command definitions for Next.js applications
 */

import { sanitizeAppName } from './universal';
import { getStartOrRestartSupervisorServiceScript, getStopMatchingSupervisorServicesScript, getPortCheckScript } from './supervisor';
import type { CommandContext, CommandDefinition } from './command-types';
export type { CommandContext, CommandDefinition } from './command-types';

/**
 * Get all commands for Next.js applications
 * Simply add a new object to this array to add a new command!
 */
export const getCommands = (context: CommandContext): CommandDefinition[] => {
    const sanitizedAppName = sanitizeAppName(context.appName);
    const supervisorServiceName = context.supervisorServiceName || sanitizedAppName;
    const stopMatchingServicesScript = getStopMatchingSupervisorServicesScript(context.applicationId);
    const refreshSupervisorServiceScript = getStartOrRestartSupervisorServiceScript(supervisorServiceName);
    const portsStr = context.preferredPorts?.join(' ') || '';

    const portCheckScript = getPortCheckScript(portsStr);
    const preStartScript = `${stopMatchingServicesScript}\n\n${portCheckScript}`.trim();

    return [
        // Build Command
        {
            title: 'Build',
            description: 'Build the application for production',
            icon: 'Hammer',
            status: 'published',
            type: 'normal',
            command: {
                preCommand: `cd ${context.appLocation} && 
                rm -rf .next`,
                mainCommand: `cd ${context.appLocation} &&
                npm install &&
                NEXT_PRIVATE_MAX_WORKERS=1 NODE_OPTIONS="--max-old-space-size=2000" npm run build`
            }
        },

        // Start Command (Production)
        {
            title: 'Start',
            description: 'Start the application in production mode using Supervisor',
            icon: 'PlayCircle',
            status: 'published',
            type: 'success',
            command: {
                preCommand: preStartScript,
                mainCommand: `sudo mkdir -p /etc/supervisor/conf.d/

CONF_FILE="/etc/supervisor/conf.d/${supervisorServiceName}.conf"
LOG_OUT="${context.appLocation}/terminal.output.log"
LOG_ERR="${context.appLocation}/terminal.error.log"
USER_NAME=$(whoami)

cat <<EOF | sudo tee $CONF_FILE
[program:${supervisorServiceName}]
command=npm start -- -p $CHOSEN_PORT
directory=${context.appLocation}
user=$USER_NAME
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=$LOG_ERR
stdout_logfile=$LOG_OUT
environment=PORT="$CHOSEN_PORT",NODE_ENV="production"
EOF

${refreshSupervisorServiceScript}
`
            }
        },

        // Dev Command (Development)
        {
            title: 'Dev',
            description: 'Start the application in development mode using Supervisor',
            icon: 'Terminal',
            status: 'published',
            type: 'normal',
            command: {
                preCommand: preStartScript,
                mainCommand: `sudo mkdir -p /etc/supervisor/conf.d/

CONF_FILE="/etc/supervisor/conf.d/${supervisorServiceName}.conf"
LOG_OUT="${context.appLocation}/terminal.output.log"
LOG_ERR="${context.appLocation}/terminal.error.log"
USER_NAME=$(whoami)

cat <<EOF | sudo tee $CONF_FILE
[program:${supervisorServiceName}]
command=npm run dev
directory=${context.appLocation}
user=$USER_NAME
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=$LOG_ERR
stdout_logfile=$LOG_OUT
environment=PORT="$CHOSEN_PORT"
EOF

${refreshSupervisorServiceScript}
`
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
                mainCommand: `${stopMatchingServicesScript}`
            }
        }
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
export const getStartCommand = (appName: string, appLocation: string, preferredPorts: number[] = [], supervisorServiceName?: string, applicationId?: string) => {
    const commands = getCommands({ appName, appLocation, preferredPorts, supervisorServiceName, applicationId });
    const cmd = commands.find(c => c.title === 'Start');
    if (!cmd) return '';
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};

export const getStopCommand = (appName: string, supervisorServiceName?: string, applicationId?: string) => {
    const commands = getCommands({ appName, appLocation: '', supervisorServiceName, applicationId });
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

export const getDevCommand = (appName: string, appLocation: string, preferredPorts: number[] = [], supervisorServiceName?: string, applicationId?: string) => {
    const commands = getCommands({ appName, appLocation, preferredPorts, supervisorServiceName, applicationId });
    const cmd = commands.find(c => c.title === 'Dev');
    if (!cmd) return '';
    return `${cmd.command.preCommand || ''}\n${cmd.command.mainCommand}`;
};
