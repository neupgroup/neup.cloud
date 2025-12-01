
'use server';

import { runCommandOnServer } from '@/services/ssh';
import { getServerForRunner } from '../servers/actions';

export async function executeCommand(serverId: string, command: string) {
  if (!serverId) {
    return { error: "Server not selected" };
  }

  const server = await getServerForRunner(serverId);

  if (!server) {
    return { error: 'Server not found.' };
  }

  if (!server.privateKey) {
    return { error: 'No private key configured for this server.' };
  }

  try {
    const result = await runCommandOnServer(
      server.publicIp,
      server.privateKey,
      command
    );

    if (result.code !== 0) {
      return { output: result.stderr || `Command exited with code ${result.code}` };
    }

    return { output: result.stdout };
  } catch (e: any) {
    return { error: `Failed to execute command: ${e.message}` };
  }
}

