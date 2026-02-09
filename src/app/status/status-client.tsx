'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, Server, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { startStatusTracking, stopStatusTracking, getStatus, type StatusData } from './actions';
import { useToast } from '@/hooks/use-toast';
import { PageTitleWithComponent } from '@/components/page-header';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-1 gap-2">
                    <p className="text-sm text-muted-foreground">
                        {(() => {
                            const date = new Date(label);
                            return !isNaN(date.getTime()) ? format(date, "MMM d, h:mm a") : "";
                        })()}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {entry.name}
                            </span>
                            <span className="font-bold text-foreground">
                                {entry.value}{unit}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const TIME_FRAMES = {
    '1h': { label: 'Last 1 Hour', minutes: 60 },
    '24h': { label: 'Last 24 Hours', minutes: 1440 },
    '7d': { label: 'Last 7 Days', minutes: 10080 },
    '30d': { label: 'Last 30 Days', minutes: 43200 },
};

export default function StatusClient({ serverId, serverName }: { serverId?: string, serverName?: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const [statusData, setStatusData] = useState<StatusData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);

    const [endTime, setEndTime] = useState<number>(Date.now());
    const [timeFrame, setTimeFrame] = useState<keyof typeof TIME_FRAMES>('1h');

    useEffect(() => {
        if (!serverId) {
            setIsLoading(false);
            return;
        };

        const fetchStatus = async () => {
            setIsLoading(true);
            const duration = TIME_FRAMES[timeFrame].minutes;
            const { data, error } = await getStatus(serverId, endTime, duration);
            if (error) {
                toast({ variant: 'destructive', title: 'Error', description: error });
                setStatusData(null);
            } else if (data) {
                setStatusData(data);
            }
            setIsLoading(false);
        }
        fetchStatus();
    }, [serverId, toast, endTime, timeFrame]);

    const handleToggleTracking = async () => {
        if (!serverId) return;

        if (!statusData?.isTracking) {
            router.push('/system/requirement/system-logger');
            return;
        }

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
            // Refresh data
            const duration = TIME_FRAMES[timeFrame].minutes;
            const { data } = await getStatus(serverId, endTime, duration);
            setStatusData(data || null);
        }

        setIsToggling(false);
    }

    const handlePreviousTime = () => {
        const duration = TIME_FRAMES[timeFrame].minutes * 60 * 1000;
        setEndTime(prev => prev - duration);
    };

    const handleNextTime = () => {
        const duration = TIME_FRAMES[timeFrame].minutes * 60 * 1000;
        setEndTime(prev => Math.min(prev + duration, Date.now()));
    };

    const isCurrentTime = endTime >= Date.now() - 1000; // tolerance

    const calculateAverage = (data: any[], key: string) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, curr) => acc + curr[key], 0);
        return (sum / data.length).toFixed(1);
    };

    const avgCpu = statusData ? calculateAverage(statusData.cpuHistory, 'usage') : 0;
    const avgRam = statusData ? calculateAverage(statusData.ramHistory, 'used') : 0; // Avg used MB
    const totalRam = statusData?.ramHistory[0]?.total || 0;
    const avgRamPercent = totalRam > 0 ? ((Number(avgRam) / totalRam) * 100).toFixed(1) : 0;


    const startTime = new Date(endTime - TIME_FRAMES[timeFrame].minutes * 60 * 1000);

    return (
        <div className="grid gap-6">
            {/* Page Title with Controls */}
            {/* Page Title */}
            <PageTitleWithComponent
                title="Server Status"
                description="Historical and real-time performance indicators"
                serverName={serverName}
                actionComponent={undefined}
            />
            {/* Date/Time Controls */}
            {serverId && (
                <div className="flex items-center gap-2 bg-card p-1 rounded-md border shadow-sm w-fit">
                    <Button variant="ghost" size="icon" onClick={handlePreviousTime}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-2 text-sm font-medium min-w-[200px] text-center">
                        {format(startTime, "MMM d, h:mm a")} - {format(new Date(endTime), "MMM d, h:mm a")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleNextTime} disabled={isCurrentTime}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <Select value={timeFrame} onValueChange={(v: any) => setTimeFrame(v)}>
                        <SelectTrigger className="w-[140px] border-0 focus:ring-0 shadow-none bg-transparent">
                            <SelectValue placeholder="Time Frame" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(TIME_FRAMES).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
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
                                        ? "System performance logger is active and recording data."
                                        : "Performance logger is not currently active on this server."}
                                </CardDescription>
                            </div>
                            {!statusData?.isTracking && (
                                <Button onClick={handleToggleTracking} variant="default">
                                    Configure Monitoring
                                </Button>
                            )}
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="font-headline">CPU Usage History</CardTitle>
                                    <CardDescription>
                                        Average for selected period: <span className="font-semibold text-foreground">{avgCpu}%</span>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[250px] w-full">
                            {statusData && statusData.cpuHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={statusData.cpuHistory} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <Tooltip content={<CustomTooltip unit="%" />} />
                                        <Area type="monotone" dataKey="usage" name="CPU" strokeWidth={2} stroke="hsl(var(--primary))" fill="url(#colorCpu)" />
                                        <XAxis
                                            dataKey="timestamp"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => {
                                                const date = new Date(value);
                                                if (isNaN(date.getTime())) return "";
                                                return format(date, timeFrame === '1h' ? "h:mm a" : "MMM d");
                                            }}
                                            interval="preserveStartEnd"
                                            minTickGap={30}
                                        />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex justify-center items-center h-full text-muted-foreground">No CPU data available for this period.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="font-headline">RAM Usage History</CardTitle>
                                    <CardDescription>
                                        Average for selected period: <span className="font-semibold text-foreground">{avgRamPercent}% ({avgRam}MB)</span>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[250px] w-full">
                            {statusData && statusData.ramHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={statusData.ramHistory} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRamUsed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorRamTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <Tooltip content={<CustomTooltip unit="MB" />} />
                                        <Area type="monotone" dataKey="total" name="Total RAM" strokeWidth={1} stroke="hsl(var(--muted-foreground))" fill="url(#colorRamTotal)" fillOpacity={0.3} />
                                        <Area type="monotone" dataKey="used" name="Used RAM" strokeWidth={2} stroke="hsl(var(--accent))" fill="url(#colorRamUsed)" />
                                        <XAxis
                                            dataKey="timestamp"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => {
                                                const date = new Date(value);
                                                if (isNaN(date.getTime())) return "";
                                                return format(date, timeFrame === '1h' ? "h:mm a" : "MMM d");
                                            }}
                                            interval="preserveStartEnd"
                                            minTickGap={30}
                                        />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}MB`} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex justify-center items-center h-full text-muted-foreground">No RAM data available for this period.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="font-headline">Network Traffic</CardTitle>
                                    <CardDescription>
                                        Bandwidth usage (Incoming/Outgoing) per minute
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[250px] w-full">
                            {statusData && statusData.networkHistory && statusData.networkHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={statusData.networkHistory} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorNetRx" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorNetTx" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <Tooltip content={<CustomTooltip unit="MB" />} />
                                        <Area type="monotone" dataKey="incoming" name="Incoming" strokeWidth={2} stroke="hsl(var(--chart-1))" fill="url(#colorNetRx)" />
                                        <Area type="monotone" dataKey="outgoing" name="Outgoing" strokeWidth={2} stroke="hsl(var(--chart-2))" fill="url(#colorNetTx)" />
                                        <XAxis
                                            dataKey="timestamp"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => {
                                                const date = new Date(value);
                                                if (isNaN(date.getTime())) return "";
                                                return format(date, timeFrame === '1h' ? "h:mm a" : "MMM d");
                                            }}
                                            interval="preserveStartEnd"
                                            minTickGap={30}
                                        />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}MB`} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex justify-center items-center h-full text-muted-foreground">No Network data available for this period.</div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    );
}
