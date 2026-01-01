'use client';

import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Network, Server as ServerIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Cookies from 'universal-cookie';

const networkConnections = [
    { port: 80, protocol: 'TCP', application: 'Nginx', status: 'Listening' },
    { port: 443, protocol: 'TCP', application: 'Nginx', status: 'Listening' },
    { port: 22, protocol: 'TCP', application: 'SSH', status: 'Established' },
    { port: 3000, protocol: 'TCP', application: 'Node.js App', status: 'Listening' },
    { port: 5432, protocol: 'TCP', application: 'PostgreSQL', status: 'Listening' },
    { port: 6379, protocol: 'TCP', application: 'Redis', status: 'Listening' },
];


export default function NetworkPage() {
  const cookies = new Cookies(null, { path: '/' });
  const serverId = cookies.get('selected_server');
  const serverName = cookies.get('selected_server_name');

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'Listening':
        return 'bg-blue-500/20 text-blue-700 border-blue-400 hover:bg-blue-500/30';
      case 'Established':
        return 'bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-400 hover:bg-gray-500/30';
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Network className="w-8 h-8" />
            Network
        </h1>
        {serverName ? (
            <p className="text-muted-foreground">
            Showing network usage for server: <span className="font-semibold text-foreground">{serverName}</span>
            </p>
        ) : (
            <p className="text-muted-foreground">
            No server selected. Please select a server to view its network status.
            </p>
        )}
      </div>
      
      {!serverId ? (
        <Card className="text-center p-8">
            <ServerIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Server Selected</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Please go to the servers page and select a server to manage.
            </p>
            <Button asChild className="mt-4">
                <Link href="/servers">Go to Servers</Link>
            </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Active Ports</CardTitle>
            <CardDescription>A list of ports currently in use on {serverName}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Port</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {networkConnections.map((conn) => (
                  <TableRow key={conn.port}>
                    <TableCell className="font-medium">{conn.port}</TableCell>
                    <TableCell>{conn.protocol}</TableCell>
                    <TableCell>{conn.application}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className={getBadgeClass(conn.status)}>{conn.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}