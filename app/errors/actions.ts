'use server';

import { getErrors as getErrorsData } from '@/services/errors/data';

type AppError = {
  id: string;
  message: string;
  level: 'ERROR' | 'WARNING' | 'INFO';
  source: string;
  timestamp: string;
  stack?: string;
};

export async function getErrors(): Promise<AppError[]> {
  const errors = await getErrorsData();

  return errors.map((error) => ({
    id: error.id,
    message: error.message,
    level: error.level as AppError['level'],
    source: error.source,
    timestamp: error.timestamp.toISOString(),
    stack: error.stack ?? undefined,
  }));
}
