import * as Git from '@/core/github';

export function getCloneCommand(location: string, repoUrl: string, isPrivate: boolean, privateKey?: string) {
  if (isPrivate && privateKey) {
    return `
set -euo pipefail
KEY_PATH="$(mktemp)"
echo "${privateKey}" > "$KEY_PATH"
chmod 600 "$KEY_PATH"
GIT_SSH_COMMAND='ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no' git clone ${repoUrl} ${location}
rm -f "$KEY_PATH"`;
  }
  return Git.getPublicCloneCommand(location, repoUrl);
}
