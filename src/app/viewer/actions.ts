'use server';

import { getServerForRunner } from '../servers/actions';
import { runCommandOnServer } from '@/services/ssh';
import { revalidatePath } from 'next/cache';

export async function getFileContent(serverId: string, path: string, isBinary: boolean = false) {
    const server = await getServerForRunner(serverId);
    if (!server) return { error: 'Server not found.' };
    if (!server.username || !server.privateKey) return { error: 'SSH config missing.' };

    try {
        let command;
        if (isBinary) {
            // Read binary file as base64
            command = `base64 -w 0 ${path}`;
        } else {
            // Read text file
            command = `cat ${path}`;
        }

        const result = await runCommandOnServer(server.publicIp, server.username, server.privateKey, command);

        if (result.code !== 0) {
            return { error: result.stderr || 'Failed to read file.' };
        }

        return { content: result.stdout };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function saveFileContent(serverId: string, path: string, content: string) {
    const server = await getServerForRunner(serverId);
    if (!server) return { error: 'Server not found.' };
    if (!server.username || !server.privateKey) return { error: 'SSH config missing.' };

    try {
        // Escape content carefully. 
        // A robust way to write content is to cat from a heredoc or echo, but special characters are tricky.
        // Better approach: encode to base64 locally, then decode on server.
        // This avoids all shell escaping issues.
        const base64Content = Buffer.from(content).toString('base64');
        const command = `echo "${base64Content}" | base64 -d > ${path}`;

        const result = await runCommandOnServer(server.publicIp, server.username, server.privateKey, command);

        if (result.code !== 0) {
            return { error: result.stderr || 'Failed to save file.' };
        }

        revalidatePath('/viewer'); // In case anyone is looking
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
