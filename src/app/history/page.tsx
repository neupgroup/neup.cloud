
import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Server } from 'lucide-react';
import { getServerLogs } from '../servers/[id]/actions';
import { HistoryClient } from './history-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'History, Neup.Cloud',
};


export type ServerLog = {
  id: string;
  command: string;
  output: string;
  status: 'Success' | 'Error' | 'pending';
  runAt: string;
}

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const serverId = cookieStore.get('selected_server')?.value;
  const serverName = cookieStore.get('selected_server_name')?.value;

  let logs: ServerLog[] = [];
  let error: string | null = null;

  if (serverId) {
    try {
      logs = await getServerLogs(serverId) as ServerLog[];
    } catch (e: any) {
      error = e.message;
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <History className="w-8 h-8" />
            Command History
          </h1>
          {serverName ? (
            <p className="text-muted-foreground">
              Showing logs for server: <span className="font-semibold text-foreground">{serverName}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              No server selected. Please select a server to view its history.
            </p>
          )}
        </div>
      </div>

      {!serverId ? (
        <Card className="text-center p-8">
          <Server className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No Server Selected</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please go to the servers page and select a server to manage.
          </p>
          <Button asChild className="mt-4">
            <Link href="/servers">Go to Servers</Link>
          </Button>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center text-destructive">
          <p>Error loading command history: {error}</p>
        </Card>
      ) : (
        <HistoryClient initialLogs={logs} serverId={serverId} />
      )}
    </div>
  );
}
