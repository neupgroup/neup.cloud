'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Hash, Activity, ArrowLeftRight, Globe, Shield } from "lucide-react";
import { getNetworkConnections, type NetworkConnection } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function NetworkList({ connections }: { connections: NetworkConnection[] }) {

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        if (s === 'LISTEN') return 'text-blue-500';
        if (s === 'ESTAB') return 'text-green-500';
        if (s === 'CLOSE_WAIT' || s === 'TIME_WAIT') return 'text-orange-500';
        return 'text-muted-foreground';
    };

    return (
        <div className="grid grid-cols-1 gap-4">
            {connections.map((conn, index) => (
                <Card key={`${conn.protocol}-${conn.port}-${conn.pid}-${index}`} className="min-w-0 w-full hover:border-primary transition-colors">
                    <CardContent className="p-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground break-all font-mono leading-tight mb-3">
                                {conn.process !== '-' ? conn.process : 'System / Unknown'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Hash className="h-3.5 w-3.5" />
                                    <span className="font-mono">{conn.port}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                    <span>{conn.protocol}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 shrink-0 ${getStatusColor(conn.state)}`}>
                                    <Activity className="h-3.5 w-3.5" />
                                    <span className="font-medium">{conn.state}</span>
                                </div>
                                {conn.state !== 'LISTEN' && (
                                    <div className="flex items-center gap-1.5 shrink-0" title={`Peer: ${conn.peerAddress}`}>
                                        <Globe className="h-3.5 w-3.5" />
                                        <span className="font-mono truncate max-w-[150px]">{conn.peerAddress}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="min-w-0">
                    <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <div className="flex gap-6">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default function NetworkClient({ serverId }: { serverId: string }) {
    const { toast } = useToast();
    const [connections, setConnections] = useState<NetworkConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchNetworkStats() {
            setIsLoading(true);
            setError(null);
            try {
                const result = await getNetworkConnections(serverId);
                if (result.error) {
                    setError(result.error);
                    toast({ variant: 'destructive', title: 'Failed to get network stats', description: result.error });
                } else if (result.connections) {
                    setConnections(result.connections);
                }
            } catch (e: any) {
                setError(e.message);
                toast({ variant: 'destructive', title: 'An unexpected error occurred', description: e.message });
            } finally {
                setIsLoading(false);
            }
        }
        fetchNetworkStats();
    }, [serverId, toast]);

    if (isLoading) return <LoadingSkeleton />;

    if (error) {
        return (
            <Card className="p-8 text-center text-destructive">
                <p>Error loading network stats: {error}</p>
            </Card>
        );
    }

    if (connections.length === 0) {
        return (
            <Card className="p-8 text-center">
                <p>No active network connections found.</p>
            </Card>
        );
    }

    return <NetworkList connections={connections} />;
}
