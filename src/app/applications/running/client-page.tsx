'use client';

import { PageTitle } from "@/components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Hash, CircleDot, RotateCw, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupervisorProcesses, restartSupervisorProcess } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Cookies from "universal-cookie";
import { useToast } from "@/hooks/use-toast";
import { useServerName } from "@/hooks/use-server-name";

export default function RunningApplicationsPage() {
    const { toast } = useToast();
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // 'restart-id'
    const serverName = useServerName();

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
            const result = await getSupervisorProcesses();
            if ('error' in result && result.error === 'SUPERVISOR_NOT_INSTALLED') {
                setError("SUPERVISOR_NOT_INSTALLED");
            } else if (Array.isArray(result)) {
                setProcesses(result);
            } else {
                setProcesses([]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch processes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
    }, []);

    const handleRestart = async (proc: any) => {
        const serverId = getServerId();
        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected' });
            return;
        }

        const id = proc.name;
        setActionLoading(`restart-${id}`);

        try {
            const result = await restartSupervisorProcess(serverId, proc.name);

            if (result.error) {
                toast({ variant: 'destructive', title: 'Restart Failed', description: result.error });
            } else {
                toast({ title: 'Process Restarted', description: `Process ${proc.name} has been restarted.` });
                await fetchProcesses();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setActionLoading(null);
        }
    };

    // Helper to determine status color and state
    const getProcessState = (proc: any) => {
        const status = proc.state;
        if (status === 'RUNNING') return 'green';
        if (status === 'STOPPED' || status === 'EXITED') return 'orange';
        if (status === 'FATAL' || status === 'BACKOFF' || status === 'stopped') return 'red';
        return 'gray';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex items-start justify-between">
                <PageTitle
                    title="Running Processes"
                    description="Overview of all processes currently managed by Supervisor."
                    serverName={serverName}
                />
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
                ) : error === "SUPERVISOR_NOT_INSTALLED" ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-yellow-200 bg-yellow-50/50">
                        <Activity className="h-10 w-10 mb-4 text-yellow-500 opacity-80" />
                        <h3 className="text-lg font-medium text-yellow-700">Supervisor Not Installed</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                            The supervisor process manager is not installed on this server. Please install it to manage applications.
                        </p>
                        <Link href="/system/requirement/supervisor">
                            <Button variant="default" className="mt-6 bg-yellow-600 hover:bg-yellow-700 text-white">
                                Install Supervisor
                            </Button>
                        </Link>
                    </Card>
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
                        <p className="text-muted-foreground mt-2">There are currently no processes running under Supervisor.</p>
                    </Card>
                ) : (
                    <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                        {processes.map((proc: any, index: number) => {
                            const state = getProcessState(proc);
                            const uniqueId = proc.name;

                            // Dynamic dot color
                            const dotClass = {
                                green: 'bg-green-500',
                                blue: 'bg-blue-500',
                                orange: 'bg-orange-500',
                                red: 'bg-red-500',
                                gray: 'bg-slate-500'
                            }[state] || 'bg-slate-500';

                            return (
                                <div key={uniqueId} className={cn(
                                    "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                                    index !== processes.length - 1 && "border-b border-border"
                                )}>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            {/* Process Name and Status Indicator */}
                                            <div className="flex-1 min-w-0">
                                                <Link href={`/applications/running/supervisor.${proc.name}`} className="flex flex-wrap items-center gap-2 mb-2 hover:underline group">
                                                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card", dotClass, state === 'green' && "animate-pulse")} />
                                                    <p className="text-sm font-medium text-foreground break-all font-mono leading-tight group-hover:text-primary transition-colors mr-1">
                                                        {proc.name}
                                                    </p>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-slate-200 text-slate-500 shrink-0">
                                                        Supervisor
                                                    </Badge>
                                                </Link>

                                                {/* Metadata Wrapper - Fully Wrappable */}
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                                    {proc.pid && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Hash className="h-3.5 w-3.5" />
                                                            <span className="font-mono">PID: {proc.pid}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <CircleDot className="h-3.5 w-3.5" />
                                                        <span className="capitalize">{proc.state}</span>
                                                    </div>
                                                    {proc.uptime && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Activity className="h-3.5 w-3.5" />
                                                            <span className="font-medium">{proc.uptime}</span>
                                                        </div>
                                                    )}
                                                    {!proc.pid && !proc.uptime && (
                                                        <span className="font-mono text-xs break-all">{proc.description}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="flex items-center self-start sm:self-center shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                                    onClick={() => handleRestart(proc)}
                                                    disabled={actionLoading === `restart-${uniqueId}`}
                                                >
                                                    {actionLoading === `restart-${uniqueId}` ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCw className="h-3.5 w-3.5" />
                                                    )}
                                                    Restart
                                                </Button>
                                            </div>
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
