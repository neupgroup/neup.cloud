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

export async function enableMemoryProtection(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server is missing username or private key configuration for SSH access.' };
    }

    try {
        // Fetch RAM using shared utility
        const { getServerMemory } = await import('@/app/servers/actions');
        const memoryInfo = await getServerMemory(serverId);

        if (memoryInfo.error || !memoryInfo.totalKb) {
            return { error: memoryInfo.error || 'Failed to fetch total RAM.' };
        }

        const totalRamKb = memoryInfo.totalKb;

        // Calculate 10% for min_free_kbytes (capped at reasonable limits if needed, but per request 10%)
        // User request: "keep minimum of 10% of the ram always available"
        const minFreeKbytes = Math.floor(totalRamKb * 0.10);

        const configContent = `vm.min_free_kbytes = ${minFreeKbytes}
vm.overcommit_memory = 2
vm.swappiness = 10`;

        // Write to a dedicated sysctl file for persistence
        const writeCommand = `echo '${configContent}' | sudo tee /etc/sysctl.d/99-neup-memory.conf`;
        let result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            writeCommand
        );
        if (result.code !== 0) return { error: `Failed to write sysctl config: ${result.stderr}` };

        // Apply using sysctl -p on the specific file
        result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'sudo sysctl -p /etc/sysctl.d/99-neup-memory.conf'
        );
        if (result.code !== 0) return { error: `Failed to apply sysctl changes: ${result.stderr}` };

        return { success: true };

    } catch (e: any) {
        return { error: e.message };
    }
}

export async function checkMemoryProtection(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server is missing username or private key configuration for SSH access.' };
    }

    try {
        // Check if our specific config file exists and has content
        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'test -f /etc/sysctl.d/99-neup-memory.conf && grep -q "vm.min_free_kbytes" /etc/sysctl.d/99-neup-memory.conf'
        );

        return { enabled: result.code === 0 };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function disableSshProtection(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server is missing username or private key configuration for SSH access.' };
    }

    try {
        // Remove config and restart service
        const command = `sudo rm -f /etc/systemd/system/ssh.service.d/oom.conf && sudo systemctl daemon-reexec && sudo systemctl restart ssh`;
        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            command
        );
        if (result.code !== 0) return { error: `Failed to disable SSH protection: ${result.stderr}` };

        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function disableMemoryProtection(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) {
        return { error: 'Server not found.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server is missing username or private key configuration for SSH access.' };
    }

    try {
        // Remove sysctl file and reset min_free_kbytes to a safe default (12288KB approx 12MB)
        // This ensures the memory is immediately released back to applications without needing a reboot
        const command = `sudo rm -f /etc/sysctl.d/99-neup-memory.conf && sudo sysctl -w vm.min_free_kbytes=12288 && sudo sysctl -w vm.swappiness=60`;
        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            command
        );
        if (result.code !== 0) return { error: `Failed to disable memory protection: ${result.stderr}` };

        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
