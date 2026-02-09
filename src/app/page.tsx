'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'universal-cookie';
import {
  Server,
  Activity,
  Cpu,
  Globe,
  ShieldAlert,
  Terminal,
  AppWindow,
  Plus,
  Search,
  Clock,
  History,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getServers, selectServer, getServer, getSystemStats } from "@/app/servers/actions";
import { getServerUptime } from "@/app/status/actions";
import { getRecentActivity, ActivityLog } from "@/app/home/actions";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from "@/firebase/provider";
import { onAuthStateChanged } from "firebase/auth";
import { SystemHealthCard } from "@/components/system-health-card";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const [userFirstName, setUserFirstName] = useState<string>("User");
  const [loading, setLoading] = useState(true);
  const [serverId, setServerId] = useState<string | null>(null);
  const [allServers, setAllServers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);

  // Selected Server Data
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [uptime, setUptime] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemStats, setSystemStats] = useState<{
    cpuUsage: number;
    memory: { total: number; used: number; percentage: number };
  } | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserFirstName(user.displayName?.split(' ')[0] || "User");
      }
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const cookies = new Cookies(null, { path: '/' });
    const id = cookies.get('selected_server');
    setServerId(id);

    const init = async () => {
      try {
        const servers = await getServers();
        setAllServers(servers);

        if (id) {
          await fetchServerDashboardData(id);
        }
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const interval = setInterval(() => {
      if (id) fetchStats(id);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchServerDashboardData = async (id: string) => {
    setLogsLoading(true);
    try {
      const [info, activity] = await Promise.all([
        getServer(id),
        getRecentActivity(id)
      ]);

      if (info) setServerInfo(info);
      setActivityLogs(activity);

      fetchStats(id);
      const uptimeRes = await getServerUptime(id);
      if (uptimeRes.uptime) setUptime(uptimeRes.uptime);

    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchStats = async (id: string) => {
    try {
      const stats = await getSystemStats(id);
      if (stats && !stats.error && stats.cpuUsage !== undefined) {
        setSystemStats(stats as any);
      }
    } catch (err) {
      console.error("Failed to fetch system stats", err);
    }
  };

  const handleSelectServer = async (id: string, name: string) => {
    await selectServer(id, name);
    setServerId(id);
    setLoading(true);
    await fetchServerDashboardData(id);
    setLoading(false);
  };

  const filteredServers = allServers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.publicIp.includes(searchQuery)
  );

  if (loading && !serverId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // --- NO SERVER SELECTED VIEW ---
  if (!serverId) {
    return (
      <div className="flex flex-col gap-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {userFirstName}</h1>
          <p className="text-muted-foreground">Select a server to manage your infrastructure.</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search servers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => router.push('/servers')}>
            <Plus className="mr-2 h-4 w-4" /> Add Server
          </Button>
        </div>

        {filteredServers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServers.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectServer(s.id, s.name)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{s.publicIp}</div>
                  <p className="text-xs text-muted-foreground">{s.provider} • {s.type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <Server className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No servers found</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              {searchQuery ? "Try a different search term." : "Connect your first server to start managing your applications."}
            </p>
            <Button className="mt-6" variant="outline" onClick={() => router.push('/servers')}>
              Connect Server
            </Button>
          </Card>
        )}
      </div>
    );
  }

  // --- SERVER SELECTED DASHBOARD VIEW ---
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Hello {userFirstName}!
          </h1>
          <p className="text-muted-foreground">
            You're managing the "<span className="font-semibold text-foreground">{serverInfo?.name || "..."}</span>" now!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const cookies = new Cookies(null, { path: '/' });
            cookies.remove('selected_server');
            cookies.remove('selected_server_name');
            window.location.reload();
          }}>
            Switch Server
          </Button>
          <Button size="sm" onClick={() => fetchServerDashboardData(serverId)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats ? `${systemStats.memory.percentage}%` : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStats ? `${systemStats.memory.used}MB / ${systemStats.memory.total}MB` : 'Fetching live data...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats ? `${systemStats.cpuUsage.toFixed(1)}%` : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Live utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public IP</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverInfo ? serverInfo.publicIp || 'N/A' : '...'}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {serverInfo?.provider || 'Global Cloud'}
            </p>
          </CardContent>
        </Card>

        <SystemHealthCard uptime={uptime} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Applications', icon: AppWindow, href: '/applications' },
          { title: 'Live Terminal', icon: Terminal, href: '/commands/live' },
          { title: 'Firewall', icon: ShieldAlert, href: '/firewall' },
          { title: 'Monitoring', icon: Activity, href: '/status' },
        ].map((item) => (
          <Button
            key={item.title}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => router.push(item.href)}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-semibold">{item.title}</span>
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">Recent commands and server events.</p>
          </div>
        </div>

        <div className="border border-border/60 rounded-[2rem] bg-white overflow-hidden divide-y divide-border/40 shadow-sm">
          {logsLoading ? (
            // Skeleton Loader
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted/30" />
                  <div className="space-y-2 min-w-0">
                    <div className="h-4 w-32 bg-muted/30 rounded-md" />
                    <div className="h-3 w-48 bg-muted/20 rounded-md" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="h-5 w-16 bg-muted/30 rounded-full" />
                  <div className="h-3 w-20 bg-muted/20 rounded-md" />
                </div>
              </div>
            ))
          ) : activityLogs.length > 0 ? (
            activityLogs.map((log) => (
              <div
                key={log.id}
                className="p-6 flex items-center justify-between gap-4 hover:bg-muted/10 transition-all duration-300 group cursor-default"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110",
                    log.status === 'Success' ? "bg-green-50 text-green-600 border-green-100" :
                      log.status === 'Error' ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-muted/50 text-muted-foreground"
                  )}>
                    {log.status === 'Success' ? <Activity className="h-5 w-5" /> :
                      log.status === 'Error' ? <ShieldAlert className="h-5 w-5" /> :
                        <Clock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm sm:text-base tracking-tight group-hover:text-primary transition-colors" title={log.commandName || log.command}>
                      {log.commandName || log.command}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate max-w-[400px] mt-0.5">
                      {log.command}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge
                    variant={log.status === 'Success' ? 'outline' : log.status === 'Error' ? 'destructive' : 'secondary'}
                    className={cn(
                      "text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md transition-all duration-300 group-hover:scale-105",
                      log.status === 'Success' && "text-green-600 border-green-200 bg-green-50"
                    )}
                  >
                    {log.status}
                  </Badge>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                    {format(new Date(log.runAt), 'MMM d, HH:mm')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-muted/5 border-dashed">
              <History className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Quiet in the console.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
