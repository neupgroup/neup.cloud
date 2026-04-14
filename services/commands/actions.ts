import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export async function executeCommand(serverId: string, command: string, description: string, rawCommand?: string) {
  // Placeholder: Implement server command execution logic
  // This should connect to the server and run the command
  return { output: '', error: null };
}

export async function executeQuickCommand(serverId: string, command: string) {
  // Placeholder: Implement quick command execution logic
  // This should connect to the server and run the command
  return { output: '', error: null };
}
