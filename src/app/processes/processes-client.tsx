'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Cpu, User, Hash, Search, XCircle, Loader2 } from "lucide-react";
import { getProcesses, killProcess, type Process } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function ProcessesList({ processes, onKill }: { processes: Process[], onKill: (pid: string) => void }) {
    const [killingPid, setKillingPid] = useState<string | null>(null);

    const handleKillClick = async (pid: string) => {
        setKillingPid(pid);
        await onKill(pid);
        setKillingPid(null);
    };

    return (
        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
            {processes.map((process, index) => (
                <div key={process.pid} className={cn(
                    "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                    index !== processes.length - 1 && "border-b border-border"
                )}>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground break-all font-mono leading-tight mb-3">
                            {process.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Hash className="h-3.5 w-3.5" />
                                <span className="font-mono">{process.pid}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <User className="h-3.5 w-3.5" />
                                <span>{process.user}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Cpu className="h-3.5 w-3.5" />
                                <span className="font-medium">{process.cpu} CPU</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-memory-stick"><path d="M6 3v18" /><path d="M18 3v18" /><path d="M6 9h12" /><path d="M6 15h12" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>
                                <span className="font-medium">{process.memory}% RAM</span>
                            </div>
                            <button
                                onClick={() => handleKillClick(process.pid)}
                                disabled={killingPid === process.pid}
                                className="flex items-center gap-1.5 shrink-0 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {killingPid === process.pid ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                )}
                                <span className="font-medium">Kill</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </Card>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className={cn(
                        "p-4 min-w-0 w-full",
                        i !== 8 && "border-b border-border"
                    )}>
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <div className="flex gap-6">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </Card>
        </div>
    )
}


export default function ProcessesClient({ serverId }: { serverId: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [processes, setProcesses] = useState<Process[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');

    const fetchProcesses = async () => {
        // Only show loading on initial fetch or full refresh, not necessarily on every kill?
        // But for consistency let's simple re-fetch
        try {
            const result = await getProcesses(serverId);
            if (result.error) {
                setError(result.error);
                toast({ variant: 'destructive', title: 'Failed to get processes', description: result.error });
            } else if (result.processes) {
                setProcesses(result.processes);
            }
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'An unexpected error occurred', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        fetchProcesses();
    }, [serverId, toast]);

    useEffect(() => {
        const query = searchParams.get('query');
        if (query !== null && query !== searchQuery) {
            setSearchQuery(query);
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps


    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        const params = new URLSearchParams(searchParams.toString());
        if (val) {
            params.set('query', val);
        } else {
            params.delete('query');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const handleKill = async (pid: string) => {
        try {
            const result = await killProcess(serverId, pid);
            if (result.success) {
                toast({ title: 'Process Killed', description: `Successfully killed process ${pid}` });
                // Refresh list
                await fetchProcesses();
            } else {
                toast({ variant: 'destructive', title: 'Failed to kill process', description: result.error });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to kill process', description: e.message });
        }
    };

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pid.toString().includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search processes by name, PID, or user..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                    autoFocus={!!searchQuery}
                />
            </div>

            {isLoading ? (
                <LoadingSkeleton />
            ) : error ? (
                <Card className="p-8 text-center text-destructive">
                    <p>Error loading processes: {error}</p>
                </Card>
            ) : processes.length === 0 ? (
                <Card className="p-8 text-center">
                    <p>No running processes found or unable to fetch them.</p>
                </Card>
            ) : filteredProcesses.length === 0 ? (
                <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground">
                    <p>No processes found matching &quot;{searchQuery}&quot;</p>
                </div>
            ) : (
                <ProcessesList processes={filteredProcesses} onKill={handleKill} />
            )}
        </div>
    );
}
