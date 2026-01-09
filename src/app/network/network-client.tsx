'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Hash, Activity, ArrowLeftRight, Globe, Search } from "lucide-react";
import { getNetworkConnections, type NetworkConnection } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';

function NetworkList({ connections }: { connections: NetworkConnection[] }) {

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        if (s === 'LISTEN') return 'text-blue-500';
        if (s === 'ESTAB') return 'text-green-500';
        if (s === 'CLOSE_WAIT' || s === 'TIME_WAIT') return 'text-orange-500';
        return 'text-muted-foreground';
    };

    return (
        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
            {connections.map((conn, index) => (
                <div key={`${conn.protocol}-${conn.port}-${conn.pid}-${index}`} className={cn(
                    "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                    index !== connections.length - 1 && "border-b border-border"
                )}>
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
                </div>
            ))}
        </Card>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={cn(
                        "p-4 min-w-0 w-full",
                        i !== 5 && "border-b border-border"
                    )}>
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-1/3" />
                            <div className="flex gap-6">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </Card>
        </div>
    )
}

export default function NetworkClient({ serverId }: { serverId: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [connections, setConnections] = useState<NetworkConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');

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

    // Sync state with URL params if they change externally
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

    const filteredConnections = connections.filter(conn =>
        (conn.process || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.port.toString().includes(searchQuery) ||
        conn.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conn.peerAddress || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.state.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search connections by process, port, protocol..."
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
                    <p>Error loading network stats: {error}</p>
                </Card>
            ) : connections.length === 0 ? (
                <Card className="p-8 text-center">
                    <p>No active network connections found.</p>
                </Card>
            ) : filteredConnections.length === 0 ? (
                <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground">
                    <p>No connections found matching &quot;{searchQuery}&quot;</p>
                </div>
            ) : (
                <NetworkList connections={filteredConnections} />
            )}
        </div>
    );
}
