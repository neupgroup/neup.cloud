
'use server';

import { NodeSSH } from 'node-ssh';

export async function runCommandOnServer(
    host: string,
    username: string,
    privateKey: string,
    command: string
): Promise<{ stdout: string; stderr: string; code: number | null }> {
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: host,
            username: username,
            privateKey: privateKey,
        });

        const result = await ssh.execCommand(command);
        
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
        };

    } finally {
        ssh.dispose();
    }
}
