'use client';

import { useEffect, useState, useCallback } from 'react';
import Cookies from 'universal-cookie';
import { getCommandLog, type CommandLog } from '@/services/logs/command-log';
import { CommandLogList } from '@/app/(main)/server/commands/command-log-card';

export function ApplicationCommandLogs({ applicationId }: { applicationId: string }) {
  const [logs, setLogs] = useState<CommandLog[]>([]);

  const fetchLogs = useCallback(async () => {
    const cookies = new Cookies(null, { path: '/' });
    const serverId = cookies.get('selected_server');
    if (!serverId) return;
    const result = await getCommandLog({ serverId, source: `application:${applicationId}`, limit: 3, offset: 0 });
    setLogs(result);
  }, [applicationId]);

  useEffect(() => {
    void fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  if (logs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Command History</h3>
      <CommandLogList logs={logs} showSourceLink={false} />
    </div>
  );
}
