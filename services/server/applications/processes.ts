import { executeQuickCommand } from '@/services/saved-commands/saved-commands-service';

export async function getRunningProcesses(serverId: string) {
  const delimiter = '---NEUP_CLOUD_SPLIT---';
  const command = `
        if command -v pm2 &> /dev/null; then
            pm2 jlist && echo "${delimiter}" && (if [ -s ~/.pm2/dump.pm2 ]; then cat ~/.pm2/dump.pm2; else echo "[]"; fi)
        else
            echo "[]${delimiter}[]"
        fi
    `;

  const result = await executeQuickCommand(serverId, command);
  if (result.error) {
    return [];
  }

  try {
    const parts = (result.output || '').split(delimiter);
    const runningListRaw = parts[0]?.trim();
    const savedListRaw = parts[1]?.trim();
    const runningList = JSON.parse(runningListRaw || '[]');

    let savedList = [];
    try {
      savedList = JSON.parse(savedListRaw || '[]');
    } catch {
      savedList = [];
    }

    const savedNames = new Set(savedList.map((process: any) => process.name));

    return runningList.map((process: any) => ({
      ...process,
      isPermanent: savedNames.has(process.name),
    }));
  } catch {
    return [];
  }
}

export async function getSupervisorProcesses(serverId: string) {
  const command = `
    if command -v supervisorctl &> /dev/null; then 
        sudo supervisorctl status 2>/dev/null || true
    elif [ -f /usr/bin/supervisorctl ]; then
        sudo /usr/bin/supervisorctl status 2>/dev/null || true
    elif [ -f /usr/local/bin/supervisorctl ]; then
        sudo /usr/local/bin/supervisorctl status 2>/dev/null || true
    else
        echo "SUPERVISORCTL_NOT_FOUND"
    fi`;

  const result = await executeQuickCommand(serverId, command);
  if (result.error) {
    return [];
  }

  try {
    const output = (result.output || '').trim();
    if (!output || output === 'SUPERVISORCTL_NOT_FOUND') return [];

    const lines = output.split('\n');
    const processes = [];

    for (const line of lines) {
      if (!line) continue;

      const match = line.match(/^(\S+)\s+(\S+)(?:\s+(.*))?$/);
      if (!match) continue;

      const name = match[1];
      const state = match[2];
      const description = match[3] || '';

      let pid = null;
      let uptime = null;

      const pidMatch = description.match(/pid (\d+)/);
      if (pidMatch) {
        pid = parseInt(pidMatch[1], 10);
      }

      const uptimeMatch = description.match(/uptime (\S+)/);
      if (uptimeMatch) {
        uptime = uptimeMatch[1];
      }

      processes.push({
        name,
        state,
        description,
        pid,
        uptime,
        source: 'supervisor' as const,
        isPermanent: true,
      });
    }

    return processes;
  } catch {
    return [];
  }
}
