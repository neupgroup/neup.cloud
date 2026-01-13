
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
            'cat ~/.database 2>/dev/null || echo "{}"',
            undefined,
            undefined,
            true // skipSwap - Don't use swap space for database operations
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
        const engines = ['mariadb', 'postgres'];
        const finalDetails: Record<string, EngineStatus> = { ...trackDetails };

        for (const engine of engines) {
            const checkCmd = engine === 'mariadb' ? 'mysql --version' : 'psql --version';
            const sysResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                checkCmd,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
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

export async function installDatabaseEngine(serverId: string, engine: 'mariadb' | 'postgres'): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        // PRODUCTION-GRADE INSTALLATION: Using MariaDB for reliability
        let installCmd = "";

        if (engine === 'mariadb') {
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
            installCmd,
            undefined,
            undefined,
            true // skipSwap - Don't use swap space for database operations
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
            'cat ~/.database 2>/dev/null || echo "{}"',
            undefined,
            undefined,
            true // skipSwap - Don't use swap space for database operations
        );

        if (checkResult.code === 0) {
            try {
                const match = checkResult.stdout.match(/\{[\s\S]*\}/);
                if (match) currentDetails = JSON.parse(match[0]);
            } catch (e) { }
        }

        // Get actual version installed (handles MariaDB reporting)
        const versionCmd = engine === 'mariadb' ? 'mysql --version' : 'psql --version';
        const versionResult = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            versionCmd,
            undefined,
            undefined,
            true // skipSwap - Don't use swap space for database operations
        );

        const versionMatch = versionResult.stdout.match(/Distrib\s+([\d\.]+)/)
            || versionResult.stdout.match(/(\d+\.\d+)/);

        currentDetails[engine] = {
            status: 'installed',
            version: versionMatch ? versionMatch[1] : (engine === 'mariadb' ? '10.x' : '14'),
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
EOF`,
            undefined,
            undefined,
            true // skipSwap - Don't use swap space for database operations
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
    engine: 'mariadb' | 'postgres';
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

    // List MariaDB Databases
    if (installation.details['mariadb']?.status === 'installed') {
        try {
            const mysqlResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo mysql -e "SHOW DATABASES;" | grep -v -E "Database|information_schema|performance_schema|mysql|sys"`,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
            );

            if (mysqlResult.code === 0) {
                const dbs = mysqlResult.stdout.trim().split('\n').filter(Boolean);
                dbs.forEach(db => {
                    instances.push({
                        name: db.trim(),
                        engine: 'mariadb'
                    });
                });
            }
        } catch (e) {
            console.error('Failed to list MariaDB databases', e);
        }
    }

    // List PostgreSQL Databases
    if (installation.details['postgres']?.status === 'installed') {
        try {
            const pgResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo -u postgres psql -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';"`,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
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
    engine: 'mariadb' | 'postgres';
    size: string;
    tablesCount: number;
    userCount: number;
    status: 'healthy' | 'warning' | 'error';
};

export async function getDatabaseDetails(serverId: string, engine: 'mariadb' | 'postgres', dbName: string): Promise<DatabaseDetails> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        let size = "0 MB";
        let tablesCount = 0;

        if (engine === 'mariadb') {
            // Check existence and metrics
            const mysqlResult = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo mysql -N -s -e "
                    SELECT 'RESULT_START_EXISTS', COUNT(*) FROM information_schema.SCHEMATA WHERE schema_name = '${dbName}';
                    SELECT 'RESULT_START_SIZE', COALESCE(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), 0) FROM information_schema.TABLES WHERE table_schema = '${dbName}';
                    SELECT 'RESULT_START_TABLES', COUNT(*) FROM information_schema.TABLES WHERE table_schema = '${dbName}';
                "`,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
            );

            if (mysqlResult.code === 0) {
                const lines = mysqlResult.stdout.trim().split('\n');

                const exists = lines.find(l => l.includes('RESULT_START_EXISTS'))?.replace('RESULT_START_EXISTS', '').trim();
                if (exists === '0') throw new Error('Database not found');

                const sizeValue = lines.find(l => l.includes('RESULT_START_SIZE'))?.replace('RESULT_START_SIZE', '').trim() || '0';
                size = `${sizeValue} MB`;
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
                "`,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
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
    engine: 'mariadb' | 'postgres',
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

        if (engine === 'mariadb') {
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
                cmd,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
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
    permissions?: 'full' | 'read' | 'custom';
};

export async function listDatabaseUsers(serverId: string, engine: 'mariadb' | 'postgres', dbName: string): Promise<DatabaseUser[]> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    const users: DatabaseUser[] = [];
    try {
        if (engine === 'mariadb') {
            const result = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo mysql -N -s -e "SELECT 'RESULT_START', User, Host, Select_priv, Insert_priv, Update_priv, Delete_priv, Create_priv FROM mysql.db WHERE Db = '${dbName}';"`,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
            );

            if (result.code === 0) {
                const lines = result.stdout.trim().split('\n');
                lines.filter(l => l.includes('RESULT_START')).forEach(line => {
                    const cleanLine = line.replace('RESULT_START', '').trim();
                    const parts = cleanLine.split(/\s+/);
                    if (parts.length >= 2) {
                        // Detect permissions
                        // parts[2] is Select_priv, parts[3] is Insert_priv, etc.
                        let perms: 'full' | 'read' | 'custom' = 'read';
                        // Check Insert_priv, Update_priv, Delete_priv, Create_priv
                        const hasWrite = parts.slice(3, 7).some(p => p === 'Y'); // parts[3] to parts[6] are Insert, Update, Delete, Create
                        if (hasWrite) perms = 'full';

                        users.push({
                            username: parts[0],
                            host: parts[1],
                            permissions: perms
                        });
                    }
                });
            }
        } else {
            const result = await runCommandOnServer(
                server.publicIp,
                server.username,
                server.privateKey,
                `sudo -u postgres psql -t -c "SELECT 'RESULT_START' || r.rolname || ',' || has_database_privilege(r.rolname, '${dbName}', 'CREATE') FROM pg_roles r WHERE r.rolcanlogin = true;"`,
                undefined,
                undefined,
                true // skipSwap - Don't use swap space for database operations
            );

            if (result.code === 0) {
                const lines = result.stdout.trim().split('\n');
                lines.filter(l => l.includes('RESULT_START')).forEach(line => {
                    const clean = line.replace('RESULT_START', '').trim();
                    const [uname, hasCreate] = clean.split(',');
                    if (uname) {
                        users.push({
                            username: uname,
                            host: 'localhost',
                            permissions: hasCreate === 't' ? 'full' : 'read'
                        });
                    }
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
    engine: 'mariadb' | 'postgres',
    dbName: string,
    username: string,
    password: string,
    permissions: 'full' | 'read' = 'full'
): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server not found or missing credentials.');
    }

    try {
        const safeDb = dbName.replace(/[^a-zA-Z0-9_]/g, '');
        const safeUser = username.replace(/[^a-zA-Z0-9_]/g, '');
        let commands: string[] = [];

        if (engine === 'mariadb') {
            const privs = permissions === 'full' ? 'ALL PRIVILEGES' : 'SELECT, SHOW VIEW';
            commands = [
                `sudo mysql -e "CREATE USER IF NOT EXISTS '${safeUser}'@'%' IDENTIFIED BY '${password}';"`,
                `sudo mysql -e "GRANT ${privs} ON \\\`${safeDb}\\\`.* TO '${safeUser}'@'%';"`,
                `sudo mysql -e "FLUSH PRIVILEGES;"`
            ];
        } else {
            const privs = permissions === 'full' ? 'ALL PRIVILEGES' : 'SELECT';
            commands = [
                `sudo -u postgres psql -c "CREATE USER ${safeUser} WITH PASSWORD '${password}';"`,
                `sudo -u postgres psql -c "GRANT ${privs} ON DATABASE ${safeDb} TO ${safeUser};"`
            ];
            if (permissions === 'read') {
                // For Postgres read-only, we also need to grant on schema tables
                commands.push(`sudo -u postgres psql -d ${safeDb} -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${safeUser};"`);
            }
        }

        for (const cmd of commands) {
            const res = await runCommandOnServer(server.publicIp, server.username, server.privateKey, cmd, undefined, undefined, true); // skipSwap - Don't use swap space for database operations
            if (res.code !== 0 && !res.stderr.toLowerCase().includes('already exists')) {
                throw new Error(res.stderr);
            }
        }

        return { success: true, message: `User ${username} created with ${permissions} access.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to create user.' };
    }
}

export async function deleteDatabaseUser(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    username: string,
    host: string = '%'
): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server missing.');
    }

    try {
        let commands: string[] = [];
        if (engine === 'mariadb') {
            commands = [
                `sudo mysql -e "DROP USER '${username}'@'${host}';"`,
                `sudo mysql -e "FLUSH PRIVILEGES;"`
            ];
        } else {
            commands = [
                `sudo -u postgres psql -c "DROP ROLE ${username};"`
            ];
        }

        for (const cmd of commands) {
            await runCommandOnServer(server.publicIp, server.username, server.privateKey, cmd, undefined, undefined, true); // skipSwap - Don't use swap space for database operations
        }

        return { success: true, message: `User ${username} deleted.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Delete failed.' };
    }
}

export async function updateDatabaseUserPermissions(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    username: string,
    host: string = '%',
    permissions: 'full' | 'read'
): Promise<{ success: boolean; message: string }> {
    const server = await getServerForRunner(serverId);
    if (!server || !server.username || !server.privateKey) {
        throw new Error('Server missing.');
    }

    try {
        const safeDb = dbName.replace(/[^a-zA-Z0-9_]/g, '');
        let commands: string[] = [];

        if (engine === 'mariadb') {
            const privs = permissions === 'full' ? 'ALL PRIVILEGES' : 'SELECT, SHOW VIEW';
            commands = [
                `sudo mysql -e "REVOKE ALL PRIVILEGES ON \\\`${safeDb}\\\`.* FROM '${username}'@'${host}';"`,
                `sudo mysql -e "GRANT ${privs} ON \\\`${safeDb}\\\`.* TO '${username}'@'${host}';"`,
                `sudo mysql -e "FLUSH PRIVILEGES;"`
            ];
        } else {
            const privs = permissions === 'full' ? 'ALL PRIVILEGES' : 'SELECT';
            commands = [
                `sudo -u postgres psql -c "REVOKE ALL PRIVILEGES ON DATABASE ${safeDb} FROM ${username};"`,
                `sudo -u postgres psql -c "GRANT ${privs} ON DATABASE ${safeDb} TO ${username};"`
            ];
            if (permissions === 'read') {
                commands.push(`sudo -u postgres psql -d ${safeDb} -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${username};"`);
            }
        }

        for (const cmd of commands) {
            await runCommandOnServer(server.publicIp, server.username, server.privateKey, cmd, undefined, undefined, true); // skipSwap - Don't use swap space for database operations
        }

        return { success: true, message: `Permissions updated to ${permissions}.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Update failed.' };
    }
}

export async function generateDatabaseBackup(
    serverId: string,
    engine: 'mariadb' | 'postgres',
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

        if (engine === 'mariadb') {
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
            backupCmd,
            undefined,
            undefined,
            true // skipSwap - Don't use swap space for database operations
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
