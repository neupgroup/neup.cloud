'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Cpu, User, Hash } from "lucide-react";
import { getProcesses, type Process } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function ProcessesList({ processes }: { processes: Process[] }) {
    return (
        <div className="grid grid-cols-1 gap-4">
            {processes.map((process) => (
                <Card key={process.pid} className="min-w-0 w-full hover:border-primary transition-colors">
                    <CardContent className="p-4">
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
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4">
            {[...Array(9)].map((_, i) => (
                <Card key={i} className="min-w-0">
                    <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <div className="flex gap-6">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}


export default function ProcessesClient({ serverId }: { serverId: string }) {
    const { toast } = useToast();
    const [processes, setProcesses] = useState<Process[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProcesses() {
            setIsLoading(true);
            setError(null);
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
        }
        fetchProcesses();
    }, [serverId, toast]);

    if (isLoading) return <LoadingSkeleton />;

    if (error) {
        return (
            <Card className="p-8 text-center text-destructive">
                <p>Error loading processes: {error}</p>
            </Card>
        );
    }

    if (processes.length === 0) {
        return (
            <Card className="p-8 text-center">
                <p>No running processes found or unable to fetch them.</p>
            </Card>
        );
    }

    return <ProcessesList processes={processes} />;
}
