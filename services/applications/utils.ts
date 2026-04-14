import { Prisma } from '@prisma/client';
import type { Application } from './type';

export function toJsonField(value: Prisma.InputJsonValue | null | undefined) {
  return value === undefined ? undefined : value === null ? Prisma.DbNull : value;
}

export function mapApplication(record: any): Application {
  return {
    id: record.id,
    name: record.name,
    appIcon: record.appIcon ?? undefined,
    location: record.location,
    language: record.language,
    repository: record.repository ?? undefined,
    networkAccess: record.networkAccess,
    commands: (record.commands as Record<string, string> | null) ?? undefined,
    information: (record.information as Record<string, any> | null) ?? undefined,
    owner: record.owner,
    createdAt: record.createdAt?.toISOString?.() ?? record.createdAt,
    updatedAt: record.updatedAt?.toISOString?.() ?? record.updatedAt,
  };
}

export function checkName(name: string): boolean {
  // Example: name must be 1-64 chars, alphanumeric, dashes/underscores allowed
  return /^[a-zA-Z0-9-_]{1,64}$/.test(name);
}

export function getName(app: Application): string {
  return app.name;
}

export function updateName(app: Application, newName: string): Application {
  if (!checkName(newName)) throw new Error('Invalid name');
  return { ...app, name: newName };
}
