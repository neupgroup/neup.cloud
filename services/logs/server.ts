let prisma: any = null;
let createId: any = null;
if (typeof window === 'undefined') {
  prisma = require('@/services/prisma').prisma;
  createId = require('@/core/create-id').createId;
}

export async function createServerLog(data: {
  serverId: string;
  command: string;
  commandName?: string | null;
  output?: string | null;
  status: string;
  runAt?: Date;
}) {
  return prisma.serverLog.create({
    data: {
      id: createId(),
      serverId: data.serverId,
      command: data.command,
      commandName: data.commandName ?? null,
      output: data.output ?? null,
      status: data.status,
      runAt: data.runAt ?? new Date(),
    },
  });
}

export async function updateServerLog(id: string, data: {
  commandName?: string | null;
  output?: string | null;
  status?: string;
}) {
  return prisma.serverLog.update({
    where: { id },
    data: {
      ...(data.commandName !== undefined ? { commandName: data.commandName } : {}),
      ...(data.output !== undefined ? { output: data.output } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
}

export async function getServerLogById(id: string) {
  return prisma.serverLog.findUnique({
    where: { id },
  });
}

export async function getRecentServerLogs(serverId?: string) {
  return prisma.serverLog.findMany({
    where: serverId ? { serverId } : undefined,
    orderBy: { runAt: 'desc' },
    take: 10,
  });
}

export async function getServerLogsByServerId(serverId: string) {
  return prisma.serverLog.findMany({
    where: { serverId },
    orderBy: { runAt: 'desc' },
  });
}
