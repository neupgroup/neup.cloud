'use server';

/**
 * Unified Database Actions
 * 
 * This file provides a unified API for database operations that automatically
 * routes to the appropriate engine-specific implementation (MariaDB or PostgreSQL).
 */

import type {
    DatabaseInstallation,
    DatabaseInstance,
    DatabaseDetails,
    DatabaseUser,
    DatabaseTable,
    OperationResult,
    BackupResult,
    QueryResult,
    DatabaseSettings
} from './types';

// Import common operations
import {
    checkDatabaseInstallation as _checkDatabaseInstallation,
    installDatabaseEngine as _installDatabaseEngine,
    listAllDatabases as _listAllDatabases
} from './common';

// MariaDB operations
import {
    getMariaDBDetails,
    createMariaDBDatabase,
    listMariaDBUsers,
    createMariaDBUser,
    deleteMariaDBUser,
    updateMariaDBUserPermissions,
    updateMariaDBUserPassword,
    generateMariaDBBackup,
    executeMariaDBQuery
} from './mariadb/operations';

// PostgreSQL operations
import {
    getPostgresDetails,
    createPostgresDatabase,
    listPostgresUsers,
    createPostgresUser,
    deletePostgresUser,
    updatePostgresUserPermissions,
    updatePostgresUserPassword,
    generatePostgresBackup,
    executePostgresQuery
} from './postgresql/operations';

// Settings operations
import { saveMariaDBSettings, getMariaDBSettings } from './mariadb/settings';
import { savePostgresSettings, getPostgresSettings } from './postgresql/settings';

// Re-export types
export type {
    DatabaseInstallation,
    DatabaseInstance,
    DatabaseDetails,
    DatabaseUser,
    DatabaseTable,
    OperationResult,
    BackupResult,
    QueryResult,
    DatabaseSettings,
    EngineStatus
} from './types';

/**
 * Common operations - wrapped to comply with 'use server' requirements
 */

export async function checkDatabaseInstallation(serverId: string): Promise<DatabaseInstallation> {
    return _checkDatabaseInstallation(serverId);
}

export async function installDatabaseEngine(serverId: string, engine: 'mariadb' | 'postgres'): Promise<OperationResult> {
    return _installDatabaseEngine(serverId, engine);
}

export async function listAllDatabases(serverId: string): Promise<DatabaseInstance[]> {
    return _listAllDatabases(serverId);
}

/**
 * Get detailed information about a database
 */
export async function getDatabaseDetails(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string
): Promise<DatabaseDetails> {
    if (engine === 'mariadb') {
        return getMariaDBDetails(serverId, dbName);
    } else {
        return getPostgresDetails(serverId, dbName);
    }
}

/**
 * Create a new database instance with a user
 */
export async function createDatabaseInstance(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    dbUser: string,
    dbPass: string
): Promise<OperationResult> {
    if (engine === 'mariadb') {
        return createMariaDBDatabase(serverId, dbName, dbUser, dbPass);
    } else {
        return createPostgresDatabase(serverId, dbName, dbUser, dbPass);
    }
}

/**
 * List all users for a database
 */
export async function listDatabaseUsers(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string
): Promise<DatabaseUser[]> {
    if (engine === 'mariadb') {
        return listMariaDBUsers(serverId, dbName);
    } else {
        return listPostgresUsers(serverId, dbName);
    }
}

/**
 * Create a new database user
 */
export async function createDatabaseUser(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    username: string,
    password: string,
    permissions: 'full' | 'read' = 'full'
): Promise<OperationResult> {
    if (engine === 'mariadb') {
        return createMariaDBUser(serverId, dbName, username, password, permissions);
    } else {
        return createPostgresUser(serverId, dbName, username, password, permissions);
    }
}

/**
 * Delete a database user
 */
export async function deleteDatabaseUser(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    username: string,
    host: string = '%'
): Promise<OperationResult> {
    if (engine === 'mariadb') {
        return deleteMariaDBUser(serverId, username, host);
    } else {
        return deletePostgresUser(serverId, username);
    }
}

/**
 * Update database user permissions
 */
export async function updateDatabaseUserPermissions(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    username: string,
    host: string = '%',
    permissions: 'full' | 'read'
): Promise<OperationResult> {
    if (engine === 'mariadb') {
        return updateMariaDBUserPermissions(serverId, dbName, username, host, permissions);
    } else {
        return updatePostgresUserPermissions(serverId, dbName, username, permissions);
    }
}

/**
 * Update database user password
 */
export async function updateDatabaseUserPassword(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    username: string,
    newPassword: string,
    host: string = '%'
): Promise<OperationResult> {
    if (engine === 'mariadb') {
        return updateMariaDBUserPassword(serverId, username, newPassword, host);
    } else {
        return updatePostgresUserPassword(serverId, username, newPassword);
    }
}

/**
 * Generate a database backup
 */
export async function generateDatabaseBackup(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    mode: 'full' | 'schema'
): Promise<BackupResult> {
    if (engine === 'mariadb') {
        return generateMariaDBBackup(serverId, dbName, mode);
    } else {
        return generatePostgresBackup(serverId, dbName, mode);
    }
}

/**
 * Execute a database query
 */
export async function executeDatabaseQuery(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string,
    query: string
): Promise<QueryResult> {
    if (engine === 'mariadb') {
        return executeMariaDBQuery(serverId, dbName, query);
    } else {
        return executePostgresQuery(serverId, dbName, query);
    }
}

/**
 * Get database tables
 */
export async function getDatabaseTables(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string
): Promise<DatabaseTable[]> {
    try {
        let query = '';
        if (engine === 'mariadb') {
            query = `
                SELECT 
                    table_name as name, 
                    table_rows as rows, 
                    ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb,
                    create_time as created
                FROM information_schema.TABLES 
                WHERE table_schema = '${dbName}'
                ORDER BY table_name;
            `;
        } else {
            query = `
                SELECT
                    relname as name,
                    n_live_tup as rows,
                    pg_size_pretty(pg_total_relation_size(relid)) as size
                FROM pg_stat_user_tables
                ORDER BY relname;
            `;
        }

        const result = await executeDatabaseQuery(serverId, engine, dbName, query);

        if (!result.success || !result.data) {
            return [];
        }

        return result.data.map(row => ({
            name: row.name,
            rows: parseInt(row.rows || '0'),
            size: engine === 'mariadb' ? `${row.size_mb} MB` : row.size,
            created: row.created
        }));
    } catch (error) {
        console.error('Error fetching database tables:', error);
        return [];
    }
}

/**
 * Save database settings
 */
export async function saveDatabaseSettings(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    settings: DatabaseSettings
): Promise<OperationResult> {
    if (engine === 'mariadb') {
        return saveMariaDBSettings(serverId, settings);
    } else {
        return savePostgresSettings(serverId, settings);
    }
}

/**
 * Get database settings
 */
export async function getDatabaseSettings(
    serverId: string,
    engine: 'mariadb' | 'postgres'
): Promise<DatabaseSettings> {
    if (engine === 'mariadb') {
        return getMariaDBSettings(serverId);
    } else {
        return getPostgresSettings(serverId);
    }
}
