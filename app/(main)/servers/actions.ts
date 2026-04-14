import { getServerForRunner as getServerForRunnerImpl } from '@/services/servers/actions';

export async function getServerForRunner(id: string) {
  return getServerForRunnerImpl(id);
}
import { getServer as getServerImpl } from '@/services/servers/actions';

export async function getServer(id: string) {
  return getServerImpl(id);
}

export async function getRamUsage(serverId: string) {
  return getRamUsageLogic(serverId);
}

export async function getSystemStats(serverId: string) {
  return getSystemStatsLogic(serverId);
}

export async function getSystemUptime(serverId: string) {
  return getSystemUptimeLogic(serverId);
}

export async function getServerMemory(serverId: string) {
  return getServerMemoryLogic(serverId);
}

export async function createServer(serverData: {
  name: string;
  username: string;
  type: string;
  provider: string;
  ram?: string;
  storage?: string;
  moreDetails?: string;
  publicIp: string;
  privateIp: string;
  privateKey: string;
}) {
  await createServerRecord(serverData);
  revalidatePath('/servers');
}

export async function updateServer(
  id: string,
  serverData: Partial<{
    name: string;
    username: string;
    type: string;
    provider: string;
    ram: string;
    storage: string;
    moreDetails: string;
    publicIp: string;
    privateIp: string;
    privateKey: string;
    proxyHandler: string;
    loadBalancer: string;
  }>
) {
  const filteredData = Object.fromEntries(
    Object.entries(serverData).filter(([key, value]) => {
      if ((key === 'privateIp' || key === 'privateKey') && (value === '' || value === undefined)) {
        return false;
      }

      return value !== undefined;
    })
  );

  if (Object.keys(filteredData).length === 0) {
    return;
  }

  await updateServerRecord(id, filteredData);
  revalidatePath(`/servers/${id}`);
  revalidatePath('/servers');
}

export async function deleteServer(id: string) {
  await deleteServerRecord(id);
  revalidatePath('/servers');
}
