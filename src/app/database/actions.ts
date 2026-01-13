
'use server';

import { getServerForRunner } from '@/app/servers/actions';
import { runCommandOnServer } from '@/services/ssh';

export type EngineStatus = {
    status: 'installed' | 'cancelled';
    version: string;
    installed_on: string;
};

export type DatabaseInstallation = {
    installed: boolean;
    details: Record<string, EngineStatus>;
};

export async function checkDatabaseInstallation(serverId: string): Promise<DatabaseInstallation> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        // 1. Read the .database tracking file
        let trackDetails: Record<string, EngineStatus> = {};
        const trackResult = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'cat ~/.database 2>/dev/null || echo "{}"'
        );

        if (trackResult.code === 0) {
            try {
                // Find potential JSON in output (strip banners/noise)
                const match = trackResult.stdout.match(/\{[\s\S]*\}/);
                if (match) {
                    trackDetails = JSON.parse(match[0]);
                }
            } catch (e) {
                console.error('Failed to parse .database file JSON', e);
            }
        }

        // 2. Cross-verify with system status
        const engines = ['mysql', 'postgres'];
        const finalDetails: Record<string, EngineStatus> = { ...trackDetails };

        for (const engine of engines) {
            const checkCmd = engine === 'mysql' ? 'mysql --version' : 'psql --version';
            const sysResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                checkCmd
            );

            if (sysResult.code === 0) {
                // In system but maybe not in JSON
                if (!finalDetails[engine] || finalDetails[engine].status !== 'installed') {
                    // Improved version parsing for MariaDB and standard MySQL/Postgres
                    const versionMatch = sysResult.stdout.match(/Distrib\s+([\d\.]+)/)
                        || sysResult.stdout.match(/(\d+\.\d+)/);

                    finalDetails[engine] = {
                        status: 'installed',
                        version: versionMatch ? versionMatch[1] : 'detected',
                        installed_on: finalDetails[engine]?.installed_on || new Date().toISOString(),
                    };
                }
            } else if (finalDetails[engine]?.status === 'installed') {
                // In JSON but deleted from system
                finalDetails[engine].status = 'cancelled';
            }
        }

        return {
            installed: Object.values(finalDetails).some(d => d.status === 'installed'),
            details: finalDetails
        };
    } catch (error) {
        console.error('Error checking database installation:', error);
        return { installed: false, details: {} };
    }
}

export async function installDatabaseEngine(serverId: string, engine: 'mysql' | 'postgres'): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        // PRODUCTION-GRADE INSTALLATION: Using MariaDB as the default "mysql" engine for reliability
        let installCmd = "";

        if (engine === 'mysql') {
            installCmd = `
                sudo DEBIAN_FRONTEND=noninteractive apt-get update && \\
                sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server mariadb-client
            `;
        } else {
            installCmd = 'sudo DEBIAN_FRONTEND=noninteractive apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib';
        }

        const installResult = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            installCmd
        );

        if (installResult.code !== 0) {
            return { success: false, message: `System installation failed: ${installResult.stderr}` };
        }

        // Fetch current file content to merge
        let currentDetails: Record<string, EngineStatus> = {};
        const checkResult = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            'cat ~/.database 2>/dev/null || echo "{}"'
        );

        if (checkResult.code === 0) {
            try {
                const match = checkResult.stdout.match(/\{[\s\S]*\}/);
                if (match) currentDetails = JSON.parse(match[0]);
            } catch (e) { }
        }

        // Get actual version installed (handles MariaDB reporting)
        const versionCmd = engine === 'mysql' ? 'mysql --version' : 'psql --version';
        const versionResult = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            versionCmd
        );

        const versionMatch = versionResult.stdout.match(/Distrib\s+([\d\.]+)/)
            || versionResult.stdout.match(/(\d+\.\d+)/);

        currentDetails[engine] = {
            status: 'installed',
            version: versionMatch ? versionMatch[1] : (engine === 'mysql' ? '10.x' : '14'),
            installed_on: new Date().toISOString(),
        };

        const jsonString = JSON.stringify(currentDetails, null, 2);

        // Save to hidden file
        const writeResult = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            `cat <<EOF > ~/.database
${jsonString}
EOF`
        );

        if (writeResult.code !== 0) {
            throw new Error(`Failed to write .database track file: ${writeResult.stderr}`);
        }

        return { success: true, message: `${engine.toUpperCase()} installation and verification completed successfully.` };
    } catch (error: any) {
        console.error('Error installing database engine:', error);
        return { success: false, message: error.message || 'Installation failed.' };
    }
}
