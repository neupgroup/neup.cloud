
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

export type DatabaseInstance = {
    name: string;
    engine: 'mysql' | 'postgres';
    size?: string;
    created_at?: string;
};

export async function listAllDatabases(serverId: string): Promise<DatabaseInstance[]> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    const instances: DatabaseInstance[] = [];
    const installation = await checkDatabaseInstallation(serverId);

    // List MySQL/MariaDB Databases
    if (installation.details['mysql']?.status === 'installed') {
        try {
            const mysqlResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo mysql -e "SHOW DATABASES;" | grep -v -E "Database|information_schema|performance_schema|mysql|sys"`
            );

            if (mysqlResult.code === 0) {
                const dbs = mysqlResult.stdout.trim().split('\n').filter(Boolean);
                dbs.forEach(db => {
                    instances.push({
                        name: db.trim(),
                        engine: 'mysql'
                    });
                });
            }
        } catch (e) {
            console.error('Failed to list MySQL databases', e);
        }
    }

    // List PostgreSQL Databases
    if (installation.details['postgres']?.status === 'installed') {
        try {
            const pgResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo -u postgres psql -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';"`
            );

            if (pgResult.code === 0) {
                const dbs = pgResult.stdout.trim().split('\n').filter(Boolean);
                dbs.forEach(db => {
                    instances.push({
                        name: db.trim(),
                        engine: 'postgres'
                    });
                });
            }
        } catch (e) {
            console.error('Failed to list Postgres databases', e);
        }
    }

    return instances;
}

export async function createDatabaseInstance(
    serverId: string,
    engine: 'mysql' | 'postgres',
    dbName: string,
    dbUser: string,
    dbPass: string
): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        let commands: string[] = [];

        if (engine === 'mysql') {
            // Sanitize names (simple)
            const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
            const safeDbUser = dbUser.replace(/[^a-zA-Z0-9_]/g, '');

            commands = [
                `sudo mysql -e "CREATE DATABASE IF NOT EXISTS \\\`${safeDbName}\\\`;"`,
                `sudo mysql -e "CREATE USER IF NOT EXISTS '${safeDbUser}'@'%' IDENTIFIED BY '${dbPass}';"`,
                `sudo mysql -e "GRANT ALL PRIVILEGES ON \\\`${safeDbName}\\\`.* TO '${safeDbUser}'@'%';"`,
                `sudo mysql -e "FLUSH PRIVILEGES;"`
            ];
        } else {
            // Postgres logic
            const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
            const safeDbUser = dbUser.replace(/[^a-zA-Z0-9_]/g, '');

            commands = [
                `sudo -u postgres psql -c "CREATE USER ${safeDbUser} WITH PASSWORD '${dbPass}';"`,
                `sudo -u postgres psql -c "CREATE DATABASE ${safeDbName} OWNER ${safeDbUser};"`,
                `sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${safeDbName} TO ${safeDbUser};"`
            ];
        }

        // Run commands sequentially
        for (const cmd of commands) {
            const result = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                cmd
            );

            if (result.code !== 0 && !result.stderr.toLowerCase().includes('already exists')) {
                throw new Error(`Failed to execute: ${cmd}. Error: ${result.stderr}`);
            }
        }

        return {
            success: true,
            message: `Database ${dbName} and user ${dbUser} created successfully.`
        };
    } catch (error: any) {
        console.error('Error creating database instance:', error);
        return {
            success: false,
            message: error.message || 'Database creation failed.'
        };
    }
}
