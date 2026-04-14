import { prisma } from '@/services/prisma';
import { createId } from '@/services/shared/create-id';
// Supervisor service name helpers (inlined)
const SUPERVISOR_SERVICE_SEPARATOR = '_serving_';
const SUPERVISOR_SERVICE_TOKEN_LENGTH = 8;
const supervisorServiceTokenCharacters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function buildSupervisorServiceName(applicationId: string, token: string) {
  return `${applicationId}${SUPERVISOR_SERVICE_SEPARATOR}${token}`;
}
function generateSupervisorServiceToken(length: number = SUPERVISOR_SERVICE_TOKEN_LENGTH) {
  return Array.from(
    { length },
    () => supervisorServiceTokenCharacters[Math.floor(Math.random() * supervisorServiceTokenCharacters.length)]
  ).join('');
}
import type { Application, CreateApplicationData } from './type';
import { toJsonField, mapApplication, checkName } from './utils';

export async function createApplication(data: CreateApplicationData): Promise<Application> {
  if (!checkName(data.name)) throw new Error('Invalid application name');
  const applicationId = createId();
  const information = {
    ...(data.information ?? {}),
    supervisorServiceName:
      data.information?.supervisorServiceName ??
      buildSupervisorServiceName(applicationId, generateSupervisorServiceToken()),
  };
  const record = await prisma.application.create({
    data: {
      id: applicationId,
      name: data.name,
      appIcon: data.appIcon ?? null,
      location: data.location,
      language: data.language,
      repository: data.repository ?? null,
      networkAccess: data.networkAccess ?? [],
      commands: toJsonField((data.commands ?? null)),
      information: toJsonField(information),
      owner: data.owner,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return mapApplication(record);
}
