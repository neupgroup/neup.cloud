
'use server';

import { NodeSSH } from 'node-ssh';

export async function runCommandOnServer(
    host: string,
    username: string,
    privateKey: string,
    command: string,
    onStdout?: (chunk: Buffer | string) => void,
    onStderr?: (chunk: Buffer | string) => void
): Promise<{ stdout: string; stderr: string; code: number | null }> {
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: host,
            username: username,
            privateKey: privateKey,
        });

        // Wrapper script to manage swap file
        const swapCommand = `
            fallocate -l 4G /tmp/swapfile;
            chmod 600 /tmp/swapfile;
            mkswap /tmp/swapfile;
            swapon /tmp/swapfile;
            trap "swapoff /tmp/swapfile; rm -f /tmp/swapfile" EXIT;
            ${command}
        `;

        const result = await ssh.execCommand(swapCommand, { onStdout, onStderr });
        
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
        };

    } finally {
        ssh.dispose();
    }
}
