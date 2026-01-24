
'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Activity, Cpu, HardDrive, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getRunningProcesses } from "./actions";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function RunningProcessesDialog() {
    const [open, setOpen] = useState(false);
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProcesses = async () => {
        setLoading(true);
        setError(null);
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
        if (open) {
            fetchProcesses();
        }
    }, [open]);

    const formatMemory = (bytes: number) => {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatUptime = (ms: number) => {
        // PM2 returns uptime as timestamp of start. current - start = uptime
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Running Processes
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div>
                            <DialogTitle>PM2 Running Processes</DialogTitle>
                            <DialogDescription>
                                Overview of all processes currently managed by PM2 on the server.
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchProcesses} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px]">
                    {loading ? (
                        <div className="space-y-3 p-1">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-destructive p-4 text-center">
                            <Activity className="h-8 w-8 mb-2 opacity-50" />
                            <p>{error}</p>
                            <p className="text-sm text-balance mt-1 text-muted-foreground">Make sure PM2 is installed and running on your server.</p>
                        </div>
                    ) : processes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>No active processes found.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="grid gap-4 py-2">
                                {processes.map((proc: any) => (
                                    <div key={proc.pm_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors gap-4">
                                        <div className="flex flex-col gap-1 min-w-[30%]">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2.5 w-2.5 rounded-full ${proc.pm2_env?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="font-semibold truncate">{proc.name}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">ID: {proc.pm_id} • Mode: {proc.pm2_env?.exec_mode}</span>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm text-muted-foreground flex-1 justify-end w-full sm:w-auto">
                                            <div className="flex flex-col items-end">
                                                <span className="flex items-center gap-1.5">
                                                    <Cpu className="h-3.5 w-3.5 opacity-70" />
                                                    {proc.monit?.cpu}%
                                                </span>
                                                <span className="text-[10px] uppercase opacity-70">CPU</span>
                                            </div>

                                            <div className="flex flex-col items-end">
                                                <span className="flex items-center gap-1.5">
                                                    <HardDrive className="h-3.5 w-3.5 opacity-70" />
                                                    {formatMemory(proc.monit?.memory)}
                                                </span>
                                                <span className="text-[10px] uppercase opacity-70">Memory</span>
                                            </div>

                                            <div className="flex flex-col items-end min-w-[60px]">
                                                <Badge variant={proc.pm2_env?.status === 'online' ? 'secondary' : 'outline'} className="h-5 px-1.5 text-[10px] uppercase mb-0.5">
                                                    {proc.pm2_env?.status}
                                                </Badge>
                                                <span className="text-[10px] uppercase opacity-70 whitespace-nowrap">
                                                    Up: {formatUptime(proc.pm2_env?.pm_uptime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
