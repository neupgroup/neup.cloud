
'use server';

import { executeQuickCommand } from '../commands/actions';
import { getApplication } from './actions';
import { cookies } from 'next/headers';

export async function getApplicationLogs(applicationId: string, lines: number = 50) {
    const app = await getApplication(applicationId) as any;
    if (!app) {
        return { error: 'Application not found' };
    }

    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) {
        return { error: 'No server selected' };
    }

    // Determine the log source based on language/framework
    // Currently primary support is PM2
    // Command: pm2 logs <name> --lines <N> --nostream
    let command = '';

    // For now, assume PM2 is used for everything deployed via our tool
    // If not found in PM2, we might fail or return empty
    // We can use --raw to avoid colors codes if executeQuickCommand doesn't handle them well, 
    // but colors often help in UI if we render them.
    command = `pm2 logs "${app.name}" --lines ${lines} --nostream --raw`;

    const result = await executeQuickCommand(serverId, command);

    if (result.error) {
        return { error: result.error };
    }

    return { logs: result.output };
}
