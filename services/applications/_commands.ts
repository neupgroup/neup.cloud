import { executeCommand, executeQuickCommand } from '@/services/commands/command-service';

export async function runApplicationCommand(serverId: string, command: string, description: string) {
  return executeCommand(serverId, command, description, command);
}

export async function runQuickCommand(serverId: string, command: string) {
  return executeQuickCommand(serverId, command);
}
