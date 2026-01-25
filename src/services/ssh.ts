
'use server';

import { NodeSSH } from 'node-ssh';
import { UniversalLinux } from '../core/universal/linux';

export async function runCommandOnServer(
    host: string,
    username: string,
    privateKey: string,
    command: string,
    onStdout?: (chunk: Buffer | string) => void,
    onStderr?: (chunk: Buffer | string) => void,
    skipSwap: boolean = false,
    variables: Record<string, string | number | boolean> = {}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: host,
            username: username,
            privateKey: privateKey,
        });

        // Setup Executor wrapper around existing SSH connection
        const executor = async (cmd: string) => {
            return await ssh.execCommand(cmd);
        };

        // Initialize Universal System
        // Detection of OS could be dynamic (uname) or passed in. 
        // For now, defaulting to Linux, but ideally we know the server type. 
        // We know it from the caller often, but here we just have host/user.
        // Let's assume Linux for now as strict typing of OS isn't passed here.
        // OR: run `uname` to check?
        // Optimization: checking OS adds latency. 
        // For now, using Linux implementation as default. 
        // If we want Windows, we should pass an option `osType`.
        // Upgrading signature to support osType later if needed.

        // Replace Memory Variables with Shell Commands
        // This allows using {{NEUP_SERVER_RAM_TOTAL}} in commands to get the server's total RAM
        command = command.replace(/{{NEUP_SERVER_RAM_TOTAL}}/g, "$(grep MemTotal /proc/meminfo | awk '{print $2}')");
        command = command.replace(/{{NEUP_SERVER_RAM_AVAILABLE}}/g, "$(grep MemAvailable /proc/meminfo | awk '{print $2}')");

        const universal = new UniversalLinux({ variables }, executor);
        const processedCommand = await universal.process(command);

        let finalCommand = processedCommand;
        if (!skipSwap) {
            // Wrapper script to manage swap file with sudo
            finalCommand = `
                sudo fallocate -l 4G /tmp/swapfile 2>/dev/null || true;
                sudo chmod 600 /tmp/swapfile 2>/dev/null || true;
                sudo mkswap /tmp/swapfile 2>/dev/null || true;
                sudo swapon /tmp/swapfile 2>/dev/null || true;
                trap "sudo swapoff /tmp/swapfile 2>/dev/null; sudo rm -f /tmp/swapfile 2>/dev/null" EXIT;
                ${processedCommand}
            `;
        }

        const result = await ssh.execCommand(finalCommand, { onStdout, onStderr });

        return {
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
        };

    } finally {
        ssh.dispose();
    }
}

export async function uploadFileToServer(
    host: string,
    username: string,
    privateKey: string,
    localPath: string,
    remotePath: string
): Promise<void> {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: host,
            username: username,
            privateKey: privateKey,
        });
        await ssh.putFile(localPath, remotePath);
    } finally {
        ssh.dispose();
    }
}

export async function uploadDirectoryToServer(
    host: string,
    username: string,
    privateKey: string,
    localPath: string,
    remotePath: string
): Promise<void> {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: host,
            username: username,
            privateKey: privateKey,
        });
        await ssh.putDirectory(localPath, remotePath, {
            recursive: true,
            concurrency: 10,
        });
    } finally {
        ssh.dispose();
    }
}
