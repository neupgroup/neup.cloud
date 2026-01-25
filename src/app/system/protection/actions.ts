'use server';

import { runCommandOnServer } from '@/services/ssh';
import { getServerForRunner } from '@/app/servers/actions';

export async function enableSshProtection(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server is missing username or private key configuration for SSH access.' };
    }

    try {
        // Create the directory
        let result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'sudo mkdir -p /etc/systemd/system/ssh.service.d'
        );
        if (result.code !== 0) return { error: `Failed to create directory: ${result.stderr}` };

        // Write the configuration file
        const configContent = `[Service]
OOMScoreAdjust=-1000`;
        const writeCommand = `echo '${configContent}' | sudo tee /etc/systemd/system/ssh.service.d/oom.conf`;

        result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            writeCommand
        );
        if (result.code !== 0) return { error: `Failed to write config: ${result.stderr}` };

        // Reload systemd and restart ssh
        result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'sudo systemctl daemon-reexec && sudo systemctl restart ssh'
        );
        if (result.code !== 0) return { error: `Failed to apply changes: ${result.stderr}` };

        return { success: true };

    } catch (e: any) {
        return { error: e.message };
    }
}

export async function checkSshProtection(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server is missing username or private key configuration for SSH access.' };
    }

    try {
        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'test -f /etc/systemd/system/ssh.service.d/oom.conf && grep -q "OOMScoreAdjust=-1000" /etc/systemd/system/ssh.service.d/oom.conf'
        );

        // If command succeeds (exit code 0), protection is active
        return { enabled: result.code === 0 };
    } catch (e: any) {
        return { error: e.message };
    }
}
