
'use server';

import { executeQuickCommand } from '../commands/actions';
import { getApplication } from './actions';
import { cookies } from 'next/headers';

export type AppStatusResult = {
    processStatus: 'running' | 'stopped' | 'error' | 'unknown';
    availability: 'active' | 'inactive' | 'checking' | 'unknown';
    uptime: string;
    metrics: {
        memory?: string;
        cpu?: string;
    };
    lastChecked: string;
    details?: string;
};

export async function checkApplicationStatus(applicationId: string): Promise<AppStatusResult> {
    const app = await getApplication(applicationId) as any;
    if (!app) {
        return { processStatus: 'unknown', availability: 'unknown', uptime: 'N/A', metrics: {}, lastChecked: new Date().toISOString() };
    }

    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) {
        return { processStatus: 'unknown', availability: 'unknown', uptime: 'N/A', metrics: {}, lastChecked: new Date().toISOString(), details: 'No server selected' };
    }

    // Step 1: Check Process via PM2
    // We use pm2 jlist to get detailed JSON info
    const pm2Command = `pm2 jlist`;
    const pm2Result = await executeQuickCommand(serverId, pm2Command);

    let processStatus: AppStatusResult['processStatus'] = 'unknown';
    let uptime = 'N/A';
    let memory = undefined;
    let cpu = undefined;

    if (pm2Result.exitCode === 0) {
        try {
            const processes = JSON.parse(pm2Result.output);
            const appProcess = processes.find((p: any) => p.name === app.name);

            if (appProcess) {
                if (appProcess.pm2_env.status === 'online') {
                    processStatus = 'running';
                    // Calculate uptime
                    const uptimeMs = Date.now() - appProcess.pm2_env.pm_uptime;
                    const uptimeSeconds = Math.floor(uptimeMs / 1000);
                    const hours = Math.floor(uptimeSeconds / 3600);
                    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                    uptime = `${hours}h ${minutes}m`;

                    // Metrics
                    if (appProcess.monit) {
                        memory = `${(appProcess.monit.memory / 1024 / 1024).toFixed(1)} MB`;
                        cpu = `${appProcess.monit.cpu}%`;
                    }
                } else {
                    processStatus = 'stopped';
                    uptime = '0m';
                }
            } else {
                processStatus = 'stopped'; // App not found in PM2 list usually means not running
                uptime = '0m';
            }
        } catch (e) {
            console.error("Failed to parse PM2 output:", e);
            processStatus = 'error';
        }
    } else {
        processStatus = 'error';
    }

    // Step 2: Check Availability
    // Only run if process is running
    let availability: AppStatusResult['availability'] = 'unknown';

    if (processStatus === 'running') {
        // If app has network access (ports), try to curl the first port
        // Default check strategy: HTTP GET on localhost:<port>
        if (app.networkAccess && app.networkAccess.length > 0) {
            const port = app.networkAccess[0];
            // Simple curl check - returns HTTP status code
            // -s silent, -o dev/null (ignore body), -w display http code
            // 5 second timeout
            const curlCmd = `curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:${port}`;

            const curlResult = await executeQuickCommand(serverId, curlCmd);

            if (curlResult.exitCode === 0) {
                const httpCode = parseInt(curlResult.output.trim());
                if (!isNaN(httpCode) && httpCode >= 200 && httpCode < 400) {
                    availability = 'active';
                } else {
                    availability = 'inactive'; // returned 404, 500, etc.
                }
            } else {
                availability = 'inactive'; // curl failed (connection refused)
            }
        } else {
            // If no ports, we assume "Active" if process is running since we can't probe it easily without config
            // Or strictly: 'unknown'
            availability = 'unknown';
        }
    } else {
        availability = 'inactive';
    }

    return {
        processStatus,
        availability,
        uptime,
        metrics: { memory, cpu },
        lastChecked: new Date().toISOString()
    };
}
