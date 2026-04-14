import { Pool, type QueryResultRow } from 'pg';
import type { PostgresAuthConfig } from '@/services/database/types';

function parsePort(port: string) {
  const parsed = Number(port);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid PostgreSQL port.');
  }

  return parsed;
}

export function createPostgresPool(auth: PostgresAuthConfig) {
  return new Pool({
    host: auth.host,
    port: parsePort(auth.port),
    database: auth.database,
    user: auth.username,
    password: auth.password,
    ssl: auth.ssl === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 8000,
  });
}

export async function testPostgresConnection(auth: PostgresAuthConfig) {
  const pool = createPostgresPool(auth);

  try {
    await pool.query('SELECT 1');
  } finally {
    await pool.end();
  }
}

export async function runPostgresQuery<T extends QueryResultRow = QueryResultRow>(
  auth: PostgresAuthConfig,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = createPostgresPool(auth);

  try {
    const result = await pool.query<T>(query, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}
