'use server';

import { prisma } from '@/services/prisma';

export type CommandLogFilter = {
  serverId?: string | null;
  accountId?: string | null;
  source?: string | null;
  status?: string | null;
  from?: Date | null;
  to?: Date | null;
};

export type CommandLog = {
  id: string;
  serverId: string;
  command: string;
  commandName?: string;
  output?: string;
  status: string;
  runAt: string;
  source?: string | null;
  accountId?: string | null;
};

export async function getCommandLog(filter: CommandLogFilter): Promise<CommandLog[]> {
  const where: Record<string, any> = {};

  if (filter.serverId) where.serverId = filter.serverId;
  if (filter.accountId) where.accountId = filter.accountId;
  if (filter.source) where.source = { startsWith: filter.source };
  if (filter.status) where.status = filter.status;

  if (filter.from || filter.to) {
    where.runAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  const logs = await prisma.serverLog.findMany({
    where,
    orderBy: { runAt: 'desc' },
  });

  return logs.map((log: any) => ({
    id: log.id,
    serverId: log.serverId,
    command: log.command,
    commandName: log.commandName ?? undefined,
    output: log.output ?? undefined,
    status: log.status,
    runAt: log.runAt.toISOString(),
    source: log.source ?? null,
    accountId: log.accountId ?? null,
  }));
}
