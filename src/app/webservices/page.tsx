'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'universal-cookie';
import { getServer } from '@/app/servers/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, Wind, Server, ArrowRight, Settings } from 'lucide-react';
import Link from 'next/link';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function WebServicesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [serverId, setServerId] = useState<string | null>(null);
    const [server, setServer] = useState<any>(null);

    useEffect(() => {
        const fetchServer = async () => {
            const cookies = new Cookies(null, { path: '/' });
            const id = cookies.get('selected_server');

            if (!id) {
                toast({
                    variant: "destructive",
                    title: "No Server Selected",
                    description: "Please select a server first.",
                });
                router.push('/servers');
                return;
            }

            try {
                setServerId(id);
                const data = await getServer(id);
                if (data) {
                    setServer(data);
                }
            } catch (error) {
                console.error("Failed to fetch server:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load server data.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchServer();
    }, [router, toast]);



    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!server) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold">Server not found</h2>
                <Button asChild><Link href="/servers">Go to Servers</Link></Button>
            </div>
        )
    }

    return (
        <div className="grid gap-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Web Services</h1>
                <p className="text-muted-foreground">Manage web server and proxy configurations for {server.name}</p>
            </div>

            {/* Configure Server Card */}
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href="/webservices/configure">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Settings className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">Server Configuration</CardTitle>
                            <CardDescription>
                                Configure proxy handler, load balancer, and network settings.
                            </CardDescription>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                </Link>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold font-headline tracking-tight">Proxy Management</h2>
                    {server.proxyHandler && <Badge variant="secondary">{server.proxyHandler}</Badge>}
                </div>

                {server.proxyHandler === 'Nginx' ? (
                    <div className="grid gap-6">
                        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="p-4 min-w-0 w-full transition-colors hover:bg-muted/50 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground font-mono leading-tight mb-1">
                                            Path Routing Configuration
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Configure Nginx locations, proxy passes, and custom headers
                                        </p>
                                    </div>
                                    <Button asChild variant="default" size="sm" className="ml-4 shrink-0">
                                        <Link href="/webservices/nginx">
                                            Configure
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 min-w-0 w-full transition-colors hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground font-mono leading-tight mb-1">
                                            Terminal Access
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Directly manage Nginx via command line interface
                                        </p>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="ml-4 shrink-0">
                                        <Link href="/commands">
                                            Open Terminal
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : server.proxyHandler && server.proxyHandler !== 'None' ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{server.proxyHandler} Management</CardTitle>
                            <CardDescription>Configuration tools for {server.proxyHandler} are coming soon.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>Currently, automated configuration generation is available for Nginx. You can manually configure your {server.proxyHandler} instance via the terminal.</p>
                            <Button className="mt-4" variant="outline" asChild>
                                <Link href="/commands">Open Terminal</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-dashed">
                        <CardHeader className="text-center">
                            <CardTitle>No Proxy Handler Selected</CardTitle>
                            <CardDescription>Please select a proxy handler above to access management tools.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-6">
                            {/* Visual placeholder or help text */}
                            <Globe className="h-12 w-12 text-muted-foreground opacity-20" />
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold font-headline tracking-tight">Load Balancer Management</h2>
                    {server.loadBalancer && <Badge variant="secondary">{server.loadBalancer}</Badge>}
                </div>

                {server.loadBalancer === 'Nginx' ? (
                    <div className="grid gap-6">
                        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="p-4 min-w-0 w-full transition-colors hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground font-mono leading-tight mb-1">
                                            Load Balancer Config
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Manage upstream servers and balancing rules
                                        </p>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="ml-4 shrink-0">
                                        <Link href="/commands">
                                            Open Terminal
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : server.loadBalancer && server.loadBalancer !== 'None' ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{server.loadBalancer} Management</CardTitle>
                            <CardDescription>Configuration tools for {server.loadBalancer} are coming soon.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>You can manually configure your {server.loadBalancer} instance via the terminal.</p>
                            <Button className="mt-4" variant="outline" asChild>
                                <Link href="/commands">Open Terminal</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-dashed">
                        <CardHeader className="text-center">
                            <CardTitle>No Load Balancer Selected</CardTitle>
                            <CardDescription>Please select a load balancer in the configuration page.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-6">
                            <Wind className="h-12 w-12 text-muted-foreground opacity-20" />
                        </CardContent>
                    </Card>
                )}
            </div>

        </div>
    );
}
