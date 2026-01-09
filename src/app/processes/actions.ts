
'use server';

import { getServerForRunner } from '../servers/actions';
import { runCommandOnServer } from '@/services/ssh';

export type Process = {
    pid: string;
    user: string;
    cpu: string;
    memory: string;
    name: string;
};

function parsePsOutput(output: string): Process[] {
    if (!output) return [];
    const lines = output.trim().split('\n');
    const processes: Process[] = [];

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;

        const [pid, user, cpu, memory] = parts;
        const name = parts.slice(4).join(' ');

        processes.push({
            pid,
            user,
            cpu: `${cpu}%`,
            memory, // ps %mem is already a percentage
            name
        });
    }

    return processes;
}

export async function getProcesses(serverId: string): Promise<{ processes?: Process[], error?: string }> {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'No username or private key configured for this server.' };
    }

    try {
        // First check the operating system
        const osCheck = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'uname -s',
            undefined,
            undefined,
            true // skipSwap
        );

        if (osCheck.code !== 0) {
            return { error: `Failed to detect operating system. Exit code: ${osCheck.code}` };
        }

        const os = osCheck.stdout.trim();

        if (os !== 'Linux') {
            return { error: `Operating system '${os}' is not supported. Only Linux is supported.` };
        }

        const command = "ps -eo pid,user,%cpu,%mem,cmd --no-headers";
        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            command,
            undefined,
            undefined,
            true // skipSwap
        );

        if (result.code !== 0) {
            return { error: result.stderr || `Failed to get process list. Exit code: ${result.code}` };
        }

        const processes = parsePsOutput(result.stdout);
        // Sort by CPU usage descending
        processes.sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu));

        return { processes };

    } catch (e: any) {
        return { error: `Failed to get process list: ${e.message}` };
    }
}
