'use server';

import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getServerLogsByServerId } from '@/services/server-logs/data';
import { runCustomCommandOnServer as runCustomCommandOnServerLogic } from '@/services/servers/logic';
import { runCommandOnServer, uploadFileToServer } from '@/services/ssh';
import { getServerForRunner } from '../actions';

export async function runCustomCommandOnServer(serverId: string, command: string) {
  const result = await runCustomCommandOnServerLogic(serverId, command);
  revalidatePath(`/servers/${serverId}`);
  return result;
}

export async function rebootServer(serverId: string) {
  return runCustomCommandOnServer(serverId, 'sudo reboot');
}

export async function getServerLogs(serverId: string) {
  const logs = await getServerLogsByServerId(serverId);

  return logs.map((log) => ({
    ...log,
    commandName: log.commandName ?? undefined,
    output: log.output ?? undefined,
    runAt: log.runAt.toISOString(),
  }));
}

export type FileOrFolder = {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  lastModified: string;
  permissions: string;
  linkTarget?: string;
};
