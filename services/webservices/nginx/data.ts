import { Prisma } from '@prisma/client';
import { prisma } from '@/services/prisma';

function toJsonField(value: Prisma.InputJsonValue | null | undefined) {
  return value === undefined ? undefined : value === null ? Prisma.DbNull : value;
}

export async function saveNginxConfiguration(data: {
  serverId: string;
  serverIp: string;
  configName: string;
  blocks: any[];
  domainRedirects?: any[] | null;
}) {
  return prisma.nginxConfiguration.upsert({
    where: { serverId: data.serverId },
    update: {
      serverIp: data.serverIp,
      configName: data.configName,
      blocks: data.blocks as Prisma.InputJsonValue,
      domainRedirects: toJsonField((data.domainRedirects ?? null) as Prisma.InputJsonValue | null),
      updatedAt: new Date(),
    },
    create: {
      serverId: data.serverId,
      serverIp: data.serverIp,
      configName: data.configName,
      blocks: data.blocks as Prisma.InputJsonValue,
      domainRedirects: toJsonField((data.domainRedirects ?? null) as Prisma.InputJsonValue | null),
      updatedAt: new Date(),
    },
  });
}

export async function getNginxConfiguration(serverId: string) {
  return prisma.nginxConfiguration.findUnique({
    where: { serverId },
  });
}
