

'use server';


import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  createServer as createServerRecord,
  deleteServer as deleteServerRecord,
  getServerById,
  getServers as getServersData,
  toPublicServer,
  updateServer as updateServerRecord,
} from '@/services/servers/data';
import {
  getRamUsage as getRamUsageLogic,
  getServerForRunner as getServerForRunnerLogic,
  getServerMemory as getServerMemoryLogic,
  getSystemStats as getSystemStatsLogic,
  getSystemUptime as getSystemUptimeLogic,
} from '@/services/servers/logic';

export const getSystemStats = getSystemStatsLogic;
export const deleteServer = deleteServerRecord;

export async function selectServer(serverId: string, serverName: string) {
  // Only use cookies and revalidatePath in server context
  const cookieStore = await cookies();
  cookieStore.set('selected_server', serverId);
  cookieStore.set('selected_server_name', serverName);
  revalidatePath('/');
  return { success: true };
}

export async function getServers() {
  const servers = await getServersData();
  return servers.map(toPublicServer);
}

export async function getServer(id: string) {
  const server = await getServerById(id);
  return server ? toPublicServer(server) : null;
}

export async function getServerForRunner(id: string) {
  return getServerForRunnerLogic(id);
}
