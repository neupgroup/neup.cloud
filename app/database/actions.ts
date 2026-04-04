'use server';

import { revalidatePath } from 'next/cache';
import {
  createDatabase as createDatabaseRecord,
  getDatabaseById,
  getDatabases as getDatabasesData,
} from '@/services/databases/data';
import type { CreateDatabaseConnectionInput, DatabaseShellQueryResult, ExternalDatabase } from './types';
import {
  buildCredentialsSummary,
  normalizeDatabaseConnectionInput,
  testDatabaseConnection,
} from '@/services/database/connection-service';
import { executeConnectionShellQuery } from '@/services/database/explorer';

export async function getDatabases(): Promise<ExternalDatabase[]> {
  try {
    return await getDatabasesData();
  } catch (error) {
    console.error('Failed to load databases:', error);
    return [];
  }
}

export async function createDatabaseConnection(data: CreateDatabaseConnectionInput) {
  if (!data.title?.trim()) {
    throw new Error('Title is required.');
  }

  const normalized = normalizeDatabaseConnectionInput(data);

  await testDatabaseConnection(normalized.connectionType, normalized.authConfig);

  await createDatabaseRecord({
    title: data.title.trim(),
    description: data.description?.trim() || 'External database connection',
    connectionType: normalized.connectionType,
    connectionStatus: 'connected',
    authConfig: normalized.authConfig,
    credentails: buildCredentialsSummary(normalized.connectionType, normalized.authConfig),
    lastValidatedAt: new Date().toISOString(),
  });

  revalidatePath('/database');
}

export async function executeDatabaseShellQuery(connectionId: string, query: string): Promise<DatabaseShellQueryResult> {
  if (!connectionId?.trim()) {
    throw new Error('Connection id is required.');
  }

  const connection = await getDatabaseById(connectionId);

  if (!connection) {
    throw new Error('Database connection not found.');
  }

  return executeConnectionShellQuery(connection, query);
}
