
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
                sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server mariadb-client && \\
                echo "[mysqld]
# Optimized for No-Swap Environment
performance_schema = OFF
innodb_buffer_pool_size = 64M
innodb_log_file_size = 16M
max_connections = 100" | sudo tee /etc/mysql/mariadb.conf.d/99-neup-cloud.cnf && \\
                sudo systemctl restart mariadb
            `;
        } else {
            installCmd = `
                sudo DEBIAN_FRONTEND=noninteractive apt-get update && \\
                sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib && \\
                sudo sed -i "s/^#\\?shared_buffers = .*/shared_buffers = 64MB/" /etc/postgresql/*/main/postgresql.conf && \\
                sudo sed -i "s/^#\\?max_connections = .*/max_connections = 100/" /etc/postgresql/*/main/postgresql.conf && \\
                sudo systemctl restart postgresql
            `;
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

export type DatabaseDetails = {
    name: string;
    engine: 'mysql' | 'postgres';
    size: string;
    tablesCount: number;
    userCount: number;
    status: 'healthy' | 'warning' | 'error';
};

export async function getDatabaseDetails(serverId: string, engine: 'mysql' | 'postgres', dbName: string): Promise<DatabaseDetails> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        let size = "0 MB";
        let tablesCount = 0;

        if (engine === 'mysql') {
            // Check existence and metrics
            const mysqlResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo mysql -N -s -e "
                    SELECT 'RESULT_START_EXISTS', COUNT(*) FROM information_schema.SCHEMATA WHERE schema_name = '${dbName}';
                    SELECT 'RESULT_START_SIZE', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) FROM information_schema.TABLES WHERE table_schema = '${dbName}';
                    SELECT 'RESULT_START_TABLES', COUNT(*) FROM information_schema.TABLES WHERE table_schema = '${dbName}';
                "`
            );

            if (mysqlResult.code === 0) {
                const lines = mysqlResult.stdout.trim().split('\n');

                const exists = lines.find(l => l.includes('RESULT_START_EXISTS'))?.replace('RESULT_START_EXISTS', '').trim();
                if (exists === '0') throw new Error('Database not found');

                size = `${lines.find(l => l.includes('RESULT_START_SIZE'))?.replace('RESULT_START_SIZE', '').trim() || '0'} MB`;
                tablesCount = parseInt(lines.find(l => l.includes('RESULT_START_TABLES'))?.replace('RESULT_START_TABLES', '').trim() || '0');
            }
        } else {
            // Postgres existence check
            const pgResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo -u postgres psql -t -c "
                    SELECT 'RESULT_START_EXISTS' || count(*) FROM pg_database WHERE datname = '${dbName}';
                    SELECT 'RESULT_START_SIZE' || pg_size_pretty(pg_database_size('${dbName}'));
                    SELECT 'RESULT_START_TABLES' || count(*) FROM information_schema.tables WHERE table_schema = 'public';
                "`
            );

            if (pgResult.code === 0) {
                const lines = pgResult.stdout.trim().split('\n');

                const exists = lines.find(l => l.includes('RESULT_START_EXISTS'))?.replace('RESULT_START_EXISTS', '').trim();
                if (exists === '0') throw new Error('Database not found');

                size = lines.find(l => l.includes('RESULT_START_SIZE'))?.replace('RESULT_START_SIZE', '').trim() || "0 MB";
                tablesCount = parseInt(lines.find(l => l.includes('RESULT_START_TABLES'))?.replace('RESULT_START_TABLES', '').trim() || "0");
            }
        }

        return {
            name: dbName,
            engine,
            size,
            tablesCount,
            userCount: 1,
            status: 'healthy'
        };
    } catch (error: any) {
        if (error.message === 'Database not found') throw error;
        console.error('Error fetching database details:', error);
        throw new Error('Failed to fetch database details.');
    }
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

export type DatabaseUser = {
    username: string;
    host?: string;
    privileges?: string;
};

export async function listDatabaseUsers(serverId: string, engine: 'mysql' | 'postgres', dbName: string): Promise<DatabaseUser[]> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    const users: DatabaseUser[] = [];
    try {
        if (engine === 'mysql') {
            // Get users with access to this specific database
            const result = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo mysql -N -s -e "SELECT 'RESULT_START', User, Host FROM mysql.db WHERE Db = '${dbName}';"`
            );

            if (result.code === 0) {
                const lines = result.stdout.trim().split('\n');
                lines.filter(l => l.includes('RESULT_START')).forEach(line => {
                    const [_, user, host] = line.replace('RESULT_START', '').trim().split(/\s+/);
                    if (user) {
                        users.push({ username: user, host: host || '%' });
                    }
                });
            }
        } else {
            // PostgreSQL: Get users/roles that have permissions on this database
            const result = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo -u postgres psql -t -c "SELECT 'RESULT_START' || rolname FROM pg_roles r JOIN pg_auth_members m ON r.oid = m.member WHERE r.rolcanlogin = true;"`
            );

            if (result.code === 0) {
                const lines = result.stdout.trim().split('\n');
                lines.filter(l => l.includes('RESULT_START')).forEach(line => {
                    const user = line.replace('RESULT_START', '').trim();
                    if (user) users.push({ username: user });
                });
            }
        }
    } catch (e) {
        console.error('Failed to list database users', e);
    }
    return users;
}

export async function createDatabaseUser(
    serverId: string,
    engine: 'mysql' | 'postgres',
    dbName: string,
    username: string,
    password: string
): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        const safeDb = dbName.replace(/[^a-zA-Z0-9_]/g, '');
        const safeUser = username.replace(/[^a-zA-Z0-9_]/g, '');
        let commands: string[] = [];

        if (engine === 'mysql') {
            commands = [
                `sudo mysql -e "CREATE USER IF NOT EXISTS '${safeUser}'@'%' IDENTIFIED BY '${password}';"`,
                `sudo mysql -e "GRANT ALL PRIVILEGES ON \\\`${safeDb}\\\`.* TO '${safeUser}'@'%';"`,
                `sudo mysql -e "FLUSH PRIVILEGES;"`
            ];
        } else {
            commands = [
                `sudo -u postgres psql -c "CREATE USER ${safeUser} WITH PASSWORD '${password}';"`,
                `sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${safeDb} TO ${safeUser};"`
            ];
        }

        for (const cmd of commands) {
            const res = await runCommandOnServer(server.publicIp, server.username, server.privateKey, cmd);
            if (res.code !== 0 && !res.stderr.toLowerCase().includes('already exists')) {
                throw new Error(res.stderr);
            }
        }

        return { success: true, message: `User ${username} created and granted access to ${dbName}.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to create user.' };
    }
}

export async function generateDatabaseBackup(
    serverId: string,
    engine: 'mysql' | 'postgres',
    dbName: string,
    mode: 'full' | 'schema'
): Promise<{ success: boolean; content?: string; filename?: string; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${dbName}_${mode}_${timestamp}.sql`;
        let backupCmd = "";

        if (engine === 'mysql') {
            const options = mode === 'schema' ? '--no-data' : '';
            // Using sudo to ensure we have access to the databases
            backupCmd = `sudo mysqldump ${options} ${dbName}`;
        } else {
            const options = mode === 'schema' ? '--schema-only' : '';
            backupCmd = `sudo -u postgres pg_dump ${options} ${dbName}`;
        }

        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            backupCmd
        );

        if (result.code !== 0) {
            throw new Error(`Backup failed: ${result.stderr}`);
        }

        // For very large databases, this might hit memory limits in the Next.js process.
        // In a real production app, we would stream this to S3 and return a signed URL.
        return {
            success: true,
            content: result.stdout,
            filename,
            message: 'Backup generated successfully.'
        };
    } catch (error: any) {
        console.error('Backup error:', error);
        return {
            success: false,
            message: error.message || 'Failed to generate backup.'
        };
    }
}
