'use client';

import { PageTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Terminal, Activity, Clock, FileCode, Play, Square, Trash2, Loader2, Cpu, HardDrive } from "lucide-react";
import { getProcessDetails, restartApplicationProcess, restartSupervisorProcess } from "../../actions"; // Adjust import path
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const idParam = params.id as string;

    const [loading, setLoading] = useState(true);
    const [processData, setProcessData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Parse ID: provider.appName
    // e.g. pm2.my-app
    const [provider, setProvider] = useState<string>('');
    const [appName, setAppName] = useState<string>('');

    useEffect(() => {
        if (!idParam) return;

        // Decode in case of special chars, though nextjs usually handles it
        const decodedId = decodeURIComponent(idParam);
        const parts = decodedId.split('.');

        if (parts.length < 2) {
            setError("Invalid process identifier format. Expected 'provider.appName'");
            setLoading(false);
            return;
        }

        const prov = parts[0];
        // Join the rest in case name has dots
        const name = parts.slice(1).join('.');

        setProvider(prov);
        setAppName(name);

        if (prov !== 'pm2' && prov !== 'supervisor') {
            setError(`Provider '${prov}' is not currently supported.`);
            setLoading(false);
            return;
        }

        fetchDetails(prov, name);
    }, [idParam]);

    const fetchDetails = async (prov: string, name: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProcessDetails(prov, name);
            if (!data) {
                setError("Process not found or could not be fetched.");
            } else {
                setProcessData(data);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch process details");
        } finally {
            setLoading(false);
        }
    };

    const handleRestart = async () => {
        if (!processData) return;
        setActionLoading('restart');
        try {
            let result;
            if (provider === 'supervisor') {
                 result = await restartSupervisorProcess(await getServerId(), processData.name);
            } else {
                 result = await restartApplicationProcess(await getServerId(), processData.pm_id);
            }

            if (result.error) {
                toast({ variant: 'destructive', title: 'Restart Failed', description: result.error });
            } else {
                toast({ title: 'Restarted', description: `Process ${appName} restarted.` });
                await fetchDetails(provider, appName);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setActionLoading(null);
        }
    };

    // Helper to get server ID (client side hack if needed, but actions usually handle it via cookies)
    // Actually restartApplicationProcess in actions.ts gets cookie itself. 
    // Wait, existing restartApplicationProcess params: (serverId, pmId).
    // So Client needs to provide serverId?
    // Let's check actions.ts: yes, "export async function restartApplicationProcess(serverId: string, pmId: string | number)"
    // So I need to get cookie here.
    const getServerId = async () => {
        // We can import 'universal-cookie' or just let the action handle it if we modify it? 
        // No, the action requires it as arg. 
        // I'll assume we can get it from document.cookie or use a library.
        // Let's use the same pattern as other pages. 
        // Or simpler: Update the action to read cookie if not provided?
        // Existing code in page.tsx: "const cookies = new Cookies(null, { path: '/' }); return cookies.get('selected_server');"
        // I will do the same.
        const match = document.cookie.match(new RegExp('(^| )selected_server=([^;]+)'));
        if (match) return match[2];
        return "";
    };

    const formatMemory = (bytes: number) => {
        if (!bytes) return '0 B';
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatUptime = (ms: number) => {
        if (!ms) return '0s';
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

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="text-destructive font-semibold">Error</div>
                <p className="text-muted-foreground">{error}</p>
                <Link href="/applications/running">
                    <Button variant="outline">Back to Processes</Button>
                </Link>
            </div>
        );
    }

    if (!processData) return null;

    const pmEnv = processData.pm2_env || {};
    const status = pmEnv.status;
    const isOnline = status === 'online';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <Link href="/applications/running" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="h-3 w-3" /> Running Processes
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">{provider}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <PageTitle
                            title={processData.name}
                            description={`ID: ${processData.pm_id} • ${provider === 'pm2' ? 'PM2 Managed' : 'System Process'}`}
                        />
                        <Badge variant={isOnline ? "default" : "destructive"} className={cn("mb-6 ml-2", isOnline && "bg-green-600 hover:bg-green-700")}>
                            {status}
                        </Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchDetails(provider, appName)} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="default" size="sm" onClick={handleRestart} disabled={!!actionLoading}>
                        {actionLoading === 'restart' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Restart
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Status Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">CPU Usage</span>
                            <div className="flex items-center gap-2 text-2xl font-mono">
                                <Cpu className="h-5 w-5 text-muted-foreground" />
                                {processData.monit?.cpu}%
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Memory Usage</span>
                            <div className="flex items-center gap-2 text-2xl font-mono">
                                <HardDrive className="h-5 w-5 text-muted-foreground" />
                                {formatMemory(processData.monit?.memory)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Uptime</span>
                            <div className="flex items-center gap-2 text-xl font-mono">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                {formatUptime(pmEnv.pm_uptime)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Restarts</span>
                            <div className="flex items-center gap-2 text-xl font-mono">
                                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                                {pmEnv.restart_time || 0}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileCode className="h-5 w-5 text-primary" />
                            Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Script Path</span>
                            <code className="bg-muted p-1.5 rounded block text-xs break-all font-mono">
                                {pmEnv.pm_exec_path}
                            </code>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Working Directory</span>
                            <code className="bg-muted p-1.5 rounded block text-xs break-all font-mono">
                                {pmEnv.pm_cwd}
                            </code>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Interpreter</span>
                            <div className="font-medium">{pmEnv.exec_interpreter}</div>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Instances</span>
                            <div className="font-medium">{pmEnv.instances}</div>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Node Version</span>
                            <div className="font-medium">{pmEnv.node_version}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logs Card */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            Log Paths
                        </CardTitle>
                        <CardDescription>
                            Locations of the log files for this process.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Output Log</span>
                                <div className="bg-black/5 p-2 rounded border border-border/50 font-mono text-xs break-all text-muted-foreground">
                                    {pmEnv.pm_out_log_path}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Error Log</span>
                                <div className="bg-black/5 p-2 rounded border border-border/50 font-mono text-xs break-all text-destructive/80">
                                    {pmEnv.pm_err_log_path}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Environment Variables can be large, maybe collapsible? */}
            </div>
        </div>
    );
}
