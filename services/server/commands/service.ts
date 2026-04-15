
import {
  executeCommand as executeSavedCommand,
  executeQuickCommand as executeSavedQuickCommand,
} from '@/services/saved-commands/saved-commands-service';

export async function executeCommand(serverId: string, command: string, description: string, rawCommand?: string) {
  return executeSavedCommand(serverId, command, description, rawCommand ?? command);
}

export async function executeQuickCommand(serverId: string, command: string) {
  return executeSavedQuickCommand(serverId, command);
}
