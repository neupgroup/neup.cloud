
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, Server, Loader2 } from "lucide-react";
import { startStatusTracking, stopStatusTracking, getStatus, type StatusData } from './actions';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-2">
            <p className="text-sm text-muted-foreground">{format(new Date(label), "MMM d, h:mm a")}</p>
            <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                    {payload[0].name}
                </span>
                <span className="font-bold text-foreground">
                    {payload[0].value}{unit}
                </span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function StatusPage() {
  const { toast } = useToast();
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  const [serverId, setServerId] = useState<string | null>(null);
  const [serverName, setServerName] = useState<string | null>(null);

  useEffect(() => {
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
    }
    
    const serverIdCookie = getCookie('selected_server');
    const serverNameCookie = getCookie('selected_server_name');

    setServerId(serverIdCookie || null);
    setServerName(serverNameCookie ? decodeURIComponent(serverNameCookie) : null);
  }, []);

  useEffect(() => {
    if (!serverId) {
        setIsLoading(false);
        return;
    };
    
    const fetchStatus = async () => {
        setIsLoading(true);
        const { data, error } = await getStatus(serverId);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error });
        } else if (data) {
            setStatusData(data);
        }
        setIsLoading(false);
    }
    fetchStatus();
  }, [serverId, toast]);

  const handleToggleTracking = async () => {
    if (!serverId) return;
    setIsToggling(true);
    
    let result;
    if (statusData?.isTracking) {
        result = await stopStatusTracking(serverId);
        toast({ title: 'Status Tracking Stopped' });
    } else {
        result = await startStatusTracking(serverId);
        toast({ title: 'Status Tracking Started', description: 'It may take a few minutes for data to appear.' });
    }

    if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        const { data } = await getStatus(serverId);
        setStatusData(data || null);
    }

    setIsToggling(false);
  }

  return (
     <div className="grid gap-6">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                <HeartPulse className="w-8 h-8" />
                Server Status
            </h1>
            {serverName ? (
                <p className="text-muted-foreground">
                Showing status for server: <span className="font-semibold text-foreground">{serverName}</span>
                </p>
            ) : (
                <p className="text-muted-foreground">
                No server selected. Please select a server to view its status.
                </p>
            )}
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
        ) : isLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
             <div className="grid gap-6">
                 <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Status Monitoring</CardTitle>
                            <CardDescription>
                                {statusData?.isTracking
                                ? "Historical usage monitoring is active."
                                : "Usage monitoring is not running."}
                            </CardDescription>
                        </div>
                         <Button onClick={handleToggleTracking} disabled={isToggling} variant={statusData?.isTracking ? 'destructive' : 'default'}>
                            {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {statusData?.isTracking ? "Stop Monitoring" : "Start Monitoring"}
                        </Button>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">CPU Usage History</CardTitle>
                        <CardDescription>CPU utilization over the last hour.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] w-full">
                        {statusData && statusData.cpuHistory.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statusData.cpuHistory} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <Tooltip content={<CustomTooltip unit="%" />} />
                                    <Area type="monotone" dataKey="usage" name="CPU" strokeWidth={2} stroke="hsl(var(--primary))" fill="url(#colorCpu)" />
                                    <XAxis dataKey="timestamp" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => format(new Date(value), "h:mm a")} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex justify-center items-center h-full text-muted-foreground">No CPU data available.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">RAM Usage History</CardTitle>
                        <CardDescription>RAM utilization over the last hour.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] w-full">
                        {statusData && statusData.ramHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statusData.ramHistory} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                                     <defs>
                                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <Tooltip content={<CustomTooltip unit="MB"/>} />
                                    <Area type="monotone" dataKey="used" name="RAM" strokeWidth={2} stroke="hsl(var(--accent))" fill="url(#colorRam)" />
                                    <XAxis dataKey="timestamp" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => format(new Date(value), "h:mm a")} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}MB`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                           <div className="flex justify-center items-center h-full text-muted-foreground">No RAM data available.</div>
                        )}
                    </CardContent>
                </Card>

            </div>
        )}
     </div>
  );
}
