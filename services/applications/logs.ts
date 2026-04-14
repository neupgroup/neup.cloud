import { executeQuickCommand } from '../../commands/actions';
import { sanitizeAppName } from '@/core/universal';

export async function getApplicationLogs(serverId: string, appName: string, lines: number = 50) {
  const sanitizedName = sanitizeAppName(appName);
  const command = `pm2 logs "${sanitizedName}" --lines ${lines} --nostream --raw`;
  const result = await executeQuickCommand(serverId, command);
  if (result.error) {
    return { error: result.error };
  }
  return { logs: result.output };
}
