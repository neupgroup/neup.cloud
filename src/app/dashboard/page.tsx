"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Server, Loader2, Clock, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getServerUptime } from "@/app/status/actions";
import { getServer } from "@/app/servers/actions";
import Cookies from 'universal-cookie';
import { format } from 'date-fns';
import { getRecentActivity, ActivityLog } from "./actions";

export default function DashboardPage() {
  const router = useRouter();


  const [loading, setLoading] = useState(true);
  const [serverId, setServerId] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [uptime, setUptime] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const cookies = new Cookies(null, { path: '/' });
    const id = cookies.get('selected_server');
    setServerId(id);

    if (id) {
      fetchServerInfo(id);
      fetchActivity(id);
    } else {
      fetchActivity();
      setLoading(false);
    }
  }, []);

  const fetchServerInfo = async (id: string) => {
    try {
      const server = await getServer(id);
      if (server) {
        setServerInfo(server);
        const uptimeRes = await getServerUptime(id);
        if (uptimeRes.uptime) {
          setUptime(uptimeRes.uptime);
        }
      }
    } catch (err) {
      console.error("Failed to fetch server info", err);
    }
  };

  const fetchActivity = async (id?: string) => {
    try {
      const logs = await getRecentActivity(id);
      setActivityLogs(logs);
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
    }
  };



  return (
    <div className="flex flex-col gap-8">

      {/* Server Hero Section */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {/* 1. Server Identity Card */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Identity</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverInfo ? serverInfo.name || 'Server' : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {serverInfo ? serverInfo.username || 'root' : '...'}
            </p>
          </CardContent>
        </Card>

        {/* 2. Live Servers (Servers Online) */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servers Online</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 / 1</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        {/* 3. Public Address Card */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Address</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverInfo ? serverInfo.publicIp || 'N/A' : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={serverInfo?.publicIpv6}>
              {serverInfo ? (serverInfo.publicIpv6 ? 'IPv6 Configured' : 'IPv4 Only') : '...'}
            </p>
          </CardContent>
        </Card>

        {/* 4. System Health Card */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uptime ? 'Active' : 'Checking...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {uptime ? `Up ${uptime}` : 'Waiting for status'}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Recent commands and server events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Command</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[150px]" title={log.commandName || log.command}>
                          {log.commandName || log.command}
                        </div>
                        <div className="hidden text-xs text-muted-foreground md:inline truncate max-w-[200px]">
                          {log.command}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === 'Success' ? 'outline' : log.status === 'Error' ? 'destructive' : 'secondary'}
                          className={log.status === 'Success' ? 'text-green-500 border-green-500' : ''}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-xs">
                        {format(new Date(log.runAt), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No recent activity.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}