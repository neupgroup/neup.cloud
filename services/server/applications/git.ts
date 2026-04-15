import * as Git from '@/services/core/github';
import { executeCommand } from '@/services/server/commands/service';

export async function performGitOperation({
  serverId,
  location,
  repoUrl,
  operation,
  isPrivate = false,
  privateKey = undefined,
}: {
  serverId: string;
  location: string;
  repoUrl: string;
  operation: 'clone' | 'pull' | 'pull-force' | 'reset-main';
  isPrivate?: boolean;
  privateKey?: string;
}) {
  let command = '';
  let description = '';
  const wrapWithKey = (cmdGenerator: (keyPath: string) => string) => {
    if (!privateKey) return cmdGenerator('');
    return `
set -euo pipefail
KEY_PATH="$(mktemp)"
echo "${privateKey}" > "$KEY_PATH"
chmod 600 "$KEY_PATH"
${cmdGenerator('"$KEY_PATH"')}
rm -f "$KEY_PATH"`;
  };
  switch (operation) {
    case 'clone':
      description = 'Cloning Repository';
      command = isPrivate && privateKey
        ? wrapWithKey((keyPath) => Git.getPrivateCloneCommand(location, repoUrl, keyPath))
        : Git.getPublicCloneCommand(location, repoUrl);
      break;
    case 'pull':
      description = 'Pulling Repository';
      command = isPrivate && privateKey
        ? wrapWithKey((keyPath) => Git.getPrivatePullCommand(location, keyPath, 'main'))
        : Git.getPullCommand(location, 'main');
      break;
    case 'pull-force':
      description = 'Force Pulling Repository';
      command = isPrivate && privateKey
        ? wrapWithKey((keyPath) => Git.getPrivatePullForceCommand(location, keyPath, 'main'))
        : Git.getPullForceCommand(location, 'main');
      break;
    case 'reset-main':
      description = 'Resetting to Main';
      command = isPrivate && privateKey
        ? wrapWithKey((keyPath) => Git.getPrivateResetCommand(location, keyPath, 'origin/main'))
        : Git.getResetCommand(location, 'origin/main');
      break;
  }
  if (!command) throw new Error('Could not generate command');
  return executeCommand(serverId, command, description, command);
}
