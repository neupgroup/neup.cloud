import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import type {
  CreateDatabaseConnectionInput,
  DatabaseAuthConfig,
  DatabaseConnectionType,
  FirestoreAuthConfig,
  MysqlAuthConfig,
  PostgresAuthConfig,
  SqliteAuthConfig,
} from '@/services/database/types';
import { testPostgresConnection } from '@/services/database/postgres/filesforconnectingandworkingonpostgres';
import { testFirestoreConnection } from '@/services/database/firestore/firestore-auth';

function requireField(authConfig: Record<string, string>, field: string) {
  const value = authConfig[field]?.trim();
  if (!value) {
    throw new Error(`${field} is required for this connection type.`);
  }

  return value;
}

function parseConnectionType(value: string): DatabaseConnectionType {
  if (value === 'postgres' || value === 'mysql' || value === 'mariadb' || value === 'sqlite' || value === 'firestore') {
    return value;
  }

  throw new Error('Invalid connection type.');
}

export function normalizeDatabaseConnectionInput(input: CreateDatabaseConnectionInput) {
  const connectionType = parseConnectionType(input.connectionType);

  switch (connectionType) {
    case 'postgres': {
      const auth: PostgresAuthConfig = {
        host: requireField(input.authConfig, 'host'),
        port: requireField(input.authConfig, 'port'),
        database: requireField(input.authConfig, 'database'),
        username: requireField(input.authConfig, 'username'),
        password: requireField(input.authConfig, 'password'),
        ssl: input.authConfig.ssl?.trim() || undefined,
      };

      return { connectionType, authConfig: auth } as const;
    }

    case 'mysql':
    case 'mariadb': {
      const auth: MysqlAuthConfig = {
        host: requireField(input.authConfig, 'host'),
        port: requireField(input.authConfig, 'port'),
        database: requireField(input.authConfig, 'database'),
        username: requireField(input.authConfig, 'username'),
        password: requireField(input.authConfig, 'password'),
      };

      return { connectionType, authConfig: auth } as const;
    }

    case 'sqlite': {
      const auth: SqliteAuthConfig = {
        filePath: requireField(input.authConfig, 'filePath'),
      };

      return { connectionType, authConfig: auth } as const;
    }

    case 'firestore': {
      const auth: FirestoreAuthConfig = {
        projectId: requireField(input.authConfig, 'projectId'),
        clientEmail: requireField(input.authConfig, 'clientEmail'),
        privateKey: requireField(input.authConfig, 'privateKey'),
        databaseId: input.authConfig.databaseId?.trim() || undefined,
      };

      return { connectionType, authConfig: auth } as const;
    }
  }
}

export async function testDatabaseConnection(connectionType: DatabaseConnectionType, authConfig: DatabaseAuthConfig) {
  switch (connectionType) {
    case 'postgres': {
      await testPostgresConnection(authConfig as PostgresAuthConfig);
      return;
    }

    case 'mysql':
    case 'mariadb': {
      const mysqlAuth = authConfig as MysqlAuthConfig;
      const connection = await mysql.createConnection({
        host: mysqlAuth.host,
        port: Number(mysqlAuth.port),
        database: mysqlAuth.database,
        user: mysqlAuth.username,
        password: mysqlAuth.password,
      });

      try {
        await connection.ping();
      } finally {
        await connection.end();
      }

      return;
    }

    case 'sqlite': {
      const sqliteAuth = authConfig as SqliteAuthConfig;
      await fs.access(sqliteAuth.filePath);
      return;
    }

    case 'firestore': {
      await testFirestoreConnection(authConfig as FirestoreAuthConfig);
      return;
    }
  }
}

export function buildCredentialsSummary(connectionType: DatabaseConnectionType, authConfig: DatabaseAuthConfig) {
  switch (connectionType) {
    case 'postgres':
    case 'mysql':
    case 'mariadb': {
      const auth = authConfig as MysqlAuthConfig;
      return `${auth.username}@${auth.host}:${auth.port}/${auth.database}`;
    }

    case 'sqlite': {
      const auth = authConfig as SqliteAuthConfig;
      return auth.filePath;
    }

    case 'firestore': {
      const auth = authConfig as FirestoreAuthConfig;
      return `${auth.projectId} (${auth.databaseId || '(default)'})`;
    }
  }
}
