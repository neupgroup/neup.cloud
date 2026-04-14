export type DatabaseConnectionType = 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'firestore';

export type PostgresAuthConfig = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl?: string;
};

export type MysqlAuthConfig = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
};

export type SqliteAuthConfig = {
  filePath: string;
};

export type FirestoreAuthConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseId?: string;
};

export type DatabaseAuthConfig =
  | PostgresAuthConfig
  | MysqlAuthConfig
  | SqliteAuthConfig
  | FirestoreAuthConfig;

export interface ExternalDatabase {
  id: string;
  title: string;
  description: string;
  connectionType: DatabaseConnectionType;
  connectionStatus: 'connected' | 'failed';
  credentails: string;
  authConfig: DatabaseAuthConfig;
  lastValidatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDatabaseConnectionInput {
  title: string;
  description?: string;
  connectionType: DatabaseConnectionType;
  authConfig: Record<string, string>;
}

export interface DatabaseRelation {
  name: string;
  type: 'table' | 'view' | 'collection';
}

export interface DatabaseTableColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  indexNames: string[];
}

export interface DatabaseTableIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface DatabaseTableProperties {
  relationName: string;
  schema: string | null;
  table: string;
  relationType: DatabaseRelation['type'];
  columns: DatabaseTableColumn[];
  indexes: DatabaseTableIndex[];
  primaryKeyColumns: string[];
  rowCount: number | null;
  supportsSchemaChanges: boolean;
  supportsIndexes: boolean;
}

export interface DatabaseTableDataPage {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  page: number;
  perPage: 10 | 25 | 50;
  hasNextPage?: boolean;
}

export interface DatabaseShellQueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  message?: string;
}
