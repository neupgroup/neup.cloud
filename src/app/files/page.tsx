
import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, Server } from 'lucide-react';
import ServerFilesPageContent from './files-client';

export const metadata: Metadata = {
  title: 'File Manager, Neup.Cloud',
};


export default async function FilesPage() {
  const cookieStore = cookies();
  const serverId = cookieStore.get('selected_server')?.value;
  const serverName = cookieStore.get('selected_server_name')?.value;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <FolderKanban className="w-8 h-8" />
            File Manager
          </h1>
          {serverName ? (
            <p className="text-muted-foreground">
              Browsing files for server: <span className="font-semibold text-foreground">{serverName}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              No server selected. Please select a server to manage its files.
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
      ) : (
        <ServerFilesPageContent serverId={serverId} />
      )}
    </div>
  );
}
