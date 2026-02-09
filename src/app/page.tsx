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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getServers, selectServer, getServer, getSystemStats } from "@/app/servers/actions";
import { getServerUptime } from "@/app/status/actions";
import { getRecentActivity, ActivityLog } from "@/app/home/actions";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from "@/firebase/provider";
import { onAuthStateChanged } from "firebase/auth";
import { SystemHealthCard } from "@/components/system-health-card";
import { ServerNameLink } from "@/components/server-name-link";
import { RunningProcessesCard } from "@/components/running-processes-card";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const [userFirstName, setUserFirstName] = useState<string>("User");
  const [loading, setLoading] = useState(true);
  const [serverId, setServerId] = useState<string | null>(null);
  const [allServers, setAllServers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [showAllServers, setShowAllServers] = useState(false);

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
    if (id === serverId) return; // Already selected
    await selectServer(id, name);
    setServerId(id);
    setLoading(true);
    await fetchServerDashboardData(id);
    setLoading(false);
    // Optionally close the list or reset search
    // setShowAllServers(false);
  };

  const filteredServers = allServers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.publicIp.includes(searchQuery)
  );

  // If loading, show Skeleton Dashboard instead of simple spinner
  if (loading && !serverId && allServers.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[300px] rounded-[2rem]" />
        </div>
      </div>
    );
  }



  // --- SERVER SELECTED DASHBOARD VIEW ---
  // List of servers to display for switching
  const serversToDisplay = showAllServers ? filteredServers : allServers.slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {serverId ? `Hello ${userFirstName}!` : `Welcome, ${userFirstName}`}
          </h1>
          <p className="text-muted-foreground">
            {serverId ? (
              <>
                You're managing the "
                <ServerNameLink name={serverInfo?.name || "..."} />
                " now!
              </>
            ) : (
              "Select a server to manage your infrastructure."
            )}
          </p>
        </div>

      </div>

      {/* Status Cards - Only show if server selected */}
      {serverId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {systemStats ? `${systemStats.memory.percentage}%` : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {systemStats ? `${systemStats.memory.used}MB / ${systemStats.memory.total}MB` : 'Fetching live data...'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {systemStats ? `${systemStats.cpuUsage.toFixed(1)}%` : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground">Live utilization</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public IP</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {serverInfo ? serverInfo.publicIp || 'N/A' : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {serverInfo?.provider || 'Global Cloud'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <SystemHealthCard uptime={uptime} />
        </div>
      )}

      {/* Server Switcher List */}
      {!serverId && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            {/* Show More toggle if needed */}
            {allServers.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => setShowAllServers(!showAllServers)}
              >
                {showAllServers ? (
                  <>Show Less <ChevronUp className="ml-1 h-3 w-3" /></>
                ) : (
                  <>Show More <ChevronDown className="ml-1 h-3 w-3" /></>
                )}
              </Button>
            )}
          </div>

          {showAllServers && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search servers..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {serversToDisplay.map((s) => (
              <Card
                key={s.id}
                onClick={() => handleSelectServer(s.id, s.name)}
                className={cn(
                  "cursor-pointer hover:border-primary transition-all",
                  serverId === s.id ? "border-primary bg-primary/5 check-mark-indicator" : ""
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium truncate">{s.name}</CardTitle>
                  <Server className={cn("h-4 w-4 text-muted-foreground", serverId === s.id && "text-primary")} />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-lg font-bold truncate">{s.publicIp}</div>
                  <p className="text-xs text-muted-foreground truncate">{s.provider}</p>
                </CardContent>
              </Card>
            ))}
            {/* Add Server Button */}
            <Card
              onClick={() => router.push('/servers')}
              className="flex flex-col items-center justify-center p-4 cursor-pointer hover:border-primary border-dashed transition-all"
            >
              <Plus className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs font-bold text-muted-foreground">Add New</span>
            </Card>
          </div>
        </div>
      )}

      {serverId && (
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
      )}

      {/* Running Processes Section */}
      {serverId && (
        <RunningProcessesCard serverId={serverId} />
      )}

      {serverId && (logsLoading || activityLogs.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Recent commands and server events.</p>
            </div>
          </div>

          <div className="border border-border/60 rounded-[2rem] bg-white overflow-hidden divide-y divide-border/40 shadow-sm">
            {logsLoading || loading ? (
              // Skeleton Loader
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="space-y-2 min-w-0">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3 w-20" />
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
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
