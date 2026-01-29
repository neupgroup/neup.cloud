'use client';

import { PageTitle } from "@/components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, Cpu, HardDrive, RefreshCw, Hash, CircleDot, RotateCw, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getRunningProcesses, restartApplicationProcess, saveRunningProcesses } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Cookies from "universal-cookie";
import { useToast } from "@/hooks/use-toast";

export default function RunningApplicationsPage() {
    const { toast } = useToast();
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // 'restart-id' or 'save'

    const getServerId = () => {
        const cookies = new Cookies(null, { path: '/' });
        return cookies.get('selected_server');
    };

    const fetchProcesses = async () => {
        setLoading(true);
        setError(null);
        const serverId = getServerId();
        if (!serverId) {
            setError("No server selected. Please select a server to view processes.");
            setLoading(false);
            return;
        }
        try {
            const data = await getRunningProcesses();
            setProcesses(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch processes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
    }, []);

    const handleRestart = async (pmId: string) => {
        const serverId = getServerId();
        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected' });
            return;
        }

        setActionLoading(`restart-${pmId}`);
        try {
            const result = await restartApplicationProcess(serverId, pmId);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Restart Failed', description: result.error });
            } else {
                toast({ title: 'Process Restarted', description: `Process ${pmId} has been restarted.` });
                await fetchProcesses();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setActionLoading(null);
        }
    };

    const handleMakePermanent = async () => {
        const serverId = getServerId();
        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected' });
            return;
        }

        setActionLoading('save');
        try {
            const result = await saveRunningProcesses(serverId);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
            } else {
                toast({ title: 'Process List Saved', description: 'Current process list has been dumped to be resurrected on reboot.' });
                // We re-fetch although save doesn't change process status itself, but good to refresh
                await fetchProcesses();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setActionLoading(null);
        }
    };

    const formatMemory = (bytes: number) => {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatUptime = (ms: number) => {
        const uptime = Date.now() - ms;
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    };

    // Helper to determine status color and state
    const getProcessState = (proc: any) => {
        const status = proc.pm2_env?.status;
        // const autoRestart = proc.pm2_env?.autorestart; // boolean -> This was incorrect for "Permanent" check
        const isPermanent = proc.isPermanent;

        if (status === 'online') {
            if (isPermanent) return 'green'; // Running and Permanent
            return 'blue'; // Running but not permanent
        }
        if (status === 'stopped' || status === 'stopping') {
            return 'orange'; // Cancelled or stopped
        }
        if (status === 'errored') {
            return 'red'; // Errored and closed
        }
        return 'gray'; // Fallback
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex items-start justify-between">
                <PageTitle
                    title="Running Processes"
                    description="Overview of all processes currently managed by and running via PM2."
                />
                <Button variant="outline" onClick={fetchProcesses} disabled={loading} className="gap-2">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="min-h-[300px]">
                {loading ? (
                    <div className="space-y-6">
                        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-4 border-b border-border last:border-0">
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-1/3" />
                                        <div className="flex gap-4">
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </div>
                ) : error ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                        <Activity className="h-10 w-10 mb-4 text-destructive opacity-50" />
                        <h3 className="text-lg font-medium text-destructive">Failed to load processes</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{error}</p>
                        <Button onClick={fetchProcesses} variant="outline" className="mt-6">Try Again</Button>
                    </Card>
                ) : processes.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed bg-muted/10">
                        <Activity className="h-10 w-10 mb-4 text-muted-foreground opacity-30" />
                        <h3 className="text-lg font-medium">No Active Processes</h3>
                        <p className="text-muted-foreground mt-2">There are currently no processes running under PM2.</p>
                    </Card>
                ) : (
                    <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                        {processes.map((proc: any, index: number) => {
                            const state = getProcessState(proc);
                            const dotColor = {
                                green: 'bg-green-500',
                                blue: 'bg-blue-500',
                                orange: 'bg-orange-500',
                                red: 'bg-red-500',
                                gray: 'bg-slate-500'
                            }[state];

                            return (
                                <div key={proc.pm_id} className={cn(
                                    "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                                    index !== processes.length - 1 && "border-b border-border"
                                )}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <Link href={`/applications/running/pm2.${proc.name}`} className="flex items-center gap-3 mb-3 hover:underline group">
                                                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card", dotColor, state === 'green' && "animate-pulse")} />
                                                <p className="text-sm font-medium text-foreground break-all font-mono leading-tight group-hover:text-primary transition-colors">
                                                    {proc.name}
                                                </p>
                                                {state !== 'green' && (
                                                    <Badge variant="outline" className={cn(
                                                        "ml-2 text-[10px] px-1.5 h-5",
                                                        state === 'blue' && "text-blue-500 border-blue-200",
                                                        state === 'orange' && "text-orange-500 border-orange-200",
                                                        state === 'red' && "text-red-500 border-red-200"
                                                    )}>
                                                        {state === 'blue' ? 'Not Permanent' : state === 'orange' ? 'Stopped' : 'Errored'}
                                                    </Badge>
                                                )}
                                            </Link>

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Hash className="h-3.5 w-3.5" />
                                                    <span className="font-mono">ID: {proc.pm_id}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <CircleDot className="h-3.5 w-3.5" />
                                                    <span className="capitalize">{proc.pm2_env?.status}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Cpu className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{proc.monit?.cpu}%</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <HardDrive className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{formatMemory(proc.monit?.memory)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Activity className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{formatUptime(proc.pm2_env?.pm_uptime)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                            {/* Restart Action for non-perfect states */}
                                            {(state === 'red' || state === 'orange' || state === 'blue') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                                    onClick={() => handleRestart(proc.pm_id)}
                                                    disabled={actionLoading === `restart-${proc.pm_id}`}
                                                >
                                                    {actionLoading === `restart-${proc.pm_id}` ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCw className="h-3.5 w-3.5" />
                                                    )}
                                                    Restart
                                                </Button>
                                            )}

                                            {/* Keep 247 Action for Blue state (not permanent) */}
                                            {/* Actually user said "clicking on this should run the app forever" */}
                                            {/* We interpret this as pm2 save to ensure persistence */}
                                            {state === 'blue' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 gap-1.5"
                                                    onClick={handleMakePermanent}
                                                    disabled={actionLoading === 'save'}
                                                >
                                                    {actionLoading === 'save' ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="h-3.5 w-3.5" />
                                                    )}
                                                    Keep 247
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </Card>
                )}
            </div>
        </div>
    );
}
