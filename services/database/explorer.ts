import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import type {
  DatabaseRelation,
  DatabaseShellQueryResult,
  DatabaseTableDataPage,
  ExternalDatabase,
  FirestoreAuthConfig,
  MysqlAuthConfig,
  PostgresAuthConfig,
} from '@/app/database/types';
import { createPostgresPool } from '@/services/database/postgres/filesforconnectingandworkingonpostgres';
import {
  listFirestoreCollections,
  listFirestoreCollectionDocuments,
} from '@/services/database/firestore/filesforconnectingandworkingonfirestore';

function assertIdentifierPart(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error('Invalid table or schema name.');
  }
}

function parseTableName(rawName: string) {
  const parts = rawName.split('.');
  if (parts.length === 1) {
    assertIdentifierPart(parts[0]);
    return { schema: null, table: parts[0] };
  }

  if (parts.length === 2) {
    assertIdentifierPart(parts[0]);
    assertIdentifierPart(parts[1]);
    return { schema: parts[0], table: parts[1] };
  }

  throw new Error('Invalid table name.');
}

function quotePostgresIdentifier(rawName: string) {
  const parsed = parseTableName(rawName);
  const schema = parsed.schema || 'public';
  return `"${schema}"."${parsed.table}"`;
}

function quoteMysqlIdentifier(rawName: string) {
  const parsed = parseTableName(rawName);
  return parsed.schema ? `\`${parsed.schema}\`.\`${parsed.table}\`` : `\`${parsed.table}\``;
}

async function listPostgresRelations(connection: ExternalDatabase): Promise<DatabaseRelation[]> {
  const auth = connection.authConfig as PostgresAuthConfig;
  const pool = createPostgresPool(auth);

  try {
    const result = await pool.query<{
      table_schema: string;
      table_name: string;
      table_type: string;
    }>(
      `SELECT table_schema, table_name, table_type
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    );

    return result.rows.map((row) => ({
      name: row.table_schema === 'public' ? row.table_name : `${row.table_schema}.${row.table_name}`,
      type: row.table_type === 'VIEW' ? 'view' : 'table',
    }));
  } finally {
    await pool.end();
  }
}

async function listMysqlRelations(connection: ExternalDatabase): Promise<DatabaseRelation[]> {
  const auth = connection.authConfig as MysqlAuthConfig;

  const db = await mysql.createConnection({
    host: auth.host,
    port: Number(auth.port),
    database: auth.database,
    user: auth.username,
    password: auth.password,
  });

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = ?
       ORDER BY table_name ASC`,
      [auth.database]
    );

    return rows.map((row) => ({
      name: String((row as any).table_name),
      type: String((row as any).table_type) === 'VIEW' ? 'view' : 'table',
    }));
  } finally {
    await db.end();
  }
}

export async function listConnectionRelations(connection: ExternalDatabase): Promise<DatabaseRelation[]> {
  if (connection.connectionType === 'postgres') {
    return listPostgresRelations(connection);
  }

  if (connection.connectionType === 'mysql' || connection.connectionType === 'mariadb') {
    return listMysqlRelations(connection);
  }

  if (connection.connectionType === 'firestore') {
    return listFirestoreCollections(connection.authConfig as FirestoreAuthConfig);
  }

  throw new Error(`${connection.connectionType} table browsing is not supported yet.`);
}

export async function getConnectionRelations(connection: ExternalDatabase): Promise<DatabaseRelation[]> {
  return listConnectionRelations(connection);
}

async function getPostgresTableDataPage(
  connection: ExternalDatabase,
  tableName: string,
  page: number,
  perPage: 10 | 25 | 50
): Promise<DatabaseTableDataPage> {
  const auth = connection.authConfig as PostgresAuthConfig;
  const pool = createPostgresPool(auth);
  const offset = (page - 1) * perPage;
  const qualifiedTable = quotePostgresIdentifier(tableName);

  try {
    const countResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${qualifiedTable}`);

    const rowsResult = await pool.query<Record<string, unknown>>(
      `SELECT * FROM ${qualifiedTable} LIMIT $1 OFFSET $2`,
      [perPage, offset]
    );

    const columns = rowsResult.rows.length > 0
      ? Object.keys(rowsResult.rows[0])
      : (() => {
          const parsed = parseTableName(tableName);
          const schema = parsed.schema || 'public';
          return [] as string[];
        })();

    if (columns.length === 0) {
      const parsed = parseTableName(tableName);
      const schema = parsed.schema || 'public';
      const cols = await pool.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, parsed.table]
      );

      return {
        columns: cols.rows.map((c) => c.column_name),
        rows: rowsResult.rows,
        totalRows: Number(countResult.rows[0]?.count || 0),
        page,
        perPage,
      };
    }

    return {
      columns,
      rows: rowsResult.rows,
      totalRows: Number(countResult.rows[0]?.count || 0),
      page,
      perPage,
    };
  } finally {
    await pool.end();
  }
}

async function getMysqlTableDataPage(
  connection: ExternalDatabase,
  tableName: string,
  page: number,
  perPage: 10 | 25 | 50
): Promise<DatabaseTableDataPage> {
  const auth = connection.authConfig as MysqlAuthConfig;
  const offset = (page - 1) * perPage;
  const qualifiedTable = quoteMysqlIdentifier(tableName);

  const db = await mysql.createConnection({
    host: auth.host,
    port: Number(auth.port),
    database: auth.database,
    user: auth.username,
    password: auth.password,
  });

  try {
    const [countRows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM ${qualifiedTable}`);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${qualifiedTable} LIMIT ? OFFSET ?`,
      [perPage, offset]
    );

    const parsedRows = rows.map((row) => row as unknown as Record<string, unknown>);
    const columns = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

    if (columns.length === 0) {
      const parsed = parseTableName(tableName);
      const [colRows] = await db.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ORDINAL_POSITION ASC`,
        [auth.database, parsed.table]
      );

      return {
        columns: colRows.map((c) => String((c as any).COLUMN_NAME)),
        rows: parsedRows,
        totalRows: Number((countRows[0] as any)?.count || 0),
        page,
        perPage,
      };
    }

    return {
      columns,
      rows: parsedRows,
      totalRows: Number((countRows[0] as any)?.count || 0),
      page,
      perPage,
    };
  } finally {
    await db.end();
  }
}

export async function getConnectionTableDataPage(
  connection: ExternalDatabase,
  tableName: string,
  page: number,
  perPage: 10 | 25 | 50
): Promise<DatabaseTableDataPage> {
  if (connection.connectionType === 'postgres') {
    return getPostgresTableDataPage(connection, tableName, page, perPage);
  }

  if (connection.connectionType === 'mysql' || connection.connectionType === 'mariadb') {
    return getMysqlTableDataPage(connection, tableName, page, perPage);
  }

  if (connection.connectionType === 'firestore') {
    return listFirestoreCollectionDocuments(connection.authConfig as FirestoreAuthConfig, tableName, page, perPage);
  }

  throw new Error(`${connection.connectionType} table browsing is not supported yet.`);
}

function parseMysqlExecutionResult(result: unknown) {
  if (Array.isArray(result)) {
    const rows = (result as RowDataPacket[]).map((row) => row as unknown as Record<string, unknown>);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      rows,
      columns,
      rowCount: rows.length,
      message: `Returned ${rows.length} rows`,
    };
  }

  const header = result as { affectedRows?: number };
  const affectedRows = Number(header?.affectedRows || 0);

  return {
    rows: [] as Record<string, unknown>[],
    columns: [] as string[],
    rowCount: affectedRows,
    message: `Query OK, ${affectedRows} rows affected`,
  };
}

async function executePostgresShellQuery(connection: ExternalDatabase, query: string): Promise<DatabaseShellQueryResult> {
  const auth = connection.authConfig as PostgresAuthConfig;
  const pool = createPostgresPool(auth);
  const startedAt = Date.now();

  try {
    const result = await pool.query<Record<string, unknown>>(query);
    const rows = result.rows;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      success: true,
      rows,
      columns,
      rowCount: typeof result.rowCount === 'number' ? result.rowCount : rows.length,
      executionTimeMs: Date.now() - startedAt,
      message: rows.length > 0 ? `Returned ${rows.length} rows` : `Query OK, ${result.rowCount ?? 0} rows affected`,
    };
  } finally {
    await pool.end();
  }
}

async function executeMysqlShellQuery(connection: ExternalDatabase, query: string): Promise<DatabaseShellQueryResult> {
  const auth = connection.authConfig as MysqlAuthConfig;
  const db = await mysql.createConnection({
    host: auth.host,
    port: Number(auth.port),
    database: auth.database,
    user: auth.username,
    password: auth.password,
  });
  const startedAt = Date.now();

  try {
    const [result] = await db.query(query);
    const parsed = parseMysqlExecutionResult(result);

    return {
      success: true,
      rows: parsed.rows,
      columns: parsed.columns,
      rowCount: parsed.rowCount,
      executionTimeMs: Date.now() - startedAt,
      message: parsed.message,
    };
  } finally {
    await db.end();
  }
}

export async function executeConnectionShellQuery(
  connection: ExternalDatabase,
  query: string
): Promise<DatabaseShellQueryResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error('Query cannot be empty.');
  }

  if (connection.connectionType === 'postgres') {
    return executePostgresShellQuery(connection, normalizedQuery);
  }

  if (connection.connectionType === 'mysql' || connection.connectionType === 'mariadb') {
    return executeMysqlShellQuery(connection, normalizedQuery);
  }

  throw new Error(`${connection.connectionType} shell execution is not supported yet.`);
}
