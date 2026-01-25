
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
import { Server } from 'lucide-react';

import { getServerLogs } from '../../servers/[id]/actions';
import { HistoryClient } from './history-client';
import type { Metadata } from 'next';
import { PageTitle } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'History, Neup.Cloud',
};


export type ServerLog = {
  id: string;
  command: string;
  commandName?: string; // Display name for the command (e.g., "MyApp Start Command")
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

  // If we have a server, we render the HistoryClient which now handles the PageTitle
  // to support the client-side reload button integration.
  if (serverId && !error) {
    return (
      <HistoryClient
        initialLogs={logs}
        serverId={serverId}
        serverName={serverName || 'Unknown Server'}
      />
    )
  }

  // Fallback views (No Server or Error) still use the server-side PageTitle
  return (
    <div className="space-y-6">
      <PageTitle
        title="Command History"
        description={serverName ? `Showing logs for server: ${serverName}` : "Please select a server to view history"}
      />

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
      ) : (
        <Card className="p-8 text-center text-destructive">
          <p>Error loading command history: {error}</p>
        </Card>
      )}
    </div>
  );
}
