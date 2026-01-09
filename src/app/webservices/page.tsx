'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'universal-cookie';
import { getServer } from '@/app/servers/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, Wind } from 'lucide-react';
import Link from 'next/link';
import { NginxConfigGenerator } from '@/components/nginx/configuration-generator';
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

            {/* Overview Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proxy Handler</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{server.proxyHandler || 'Not Configured'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Handles incoming web traffic
                        </p>
                        <div className="mt-4">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/settings/server">Configure</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Load Balancer</CardTitle>
                        <Wind className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{server.loadBalancer || 'Not Configured'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Distributes traffic across instances
                        </p>
                        <div className="mt-4">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/settings/server">Configure</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold font-headline tracking-tight">Proxy Management</h2>
                    {server.proxyHandler && <Badge variant="secondary">{server.proxyHandler}</Badge>}
                </div>

                {server.proxyHandler === 'Nginx' ? (
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Nginx Management</CardTitle>
                                <CardDescription>
                                    Tools to manage your Nginx web server. Use the generator below to create configuration files.
                                </CardDescription>
                            </CardHeader>
                            {/* Future: Add status check, reload buttons, etc. */}
                        </Card>

                        <NginxConfigGenerator defaultDomain={server.publicIp || 'example.com'} />
                    </div>
                ) : server.proxyHandler ? (
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
                            <CardDescription>Please select a proxy handler in the server settings to access management tools.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-6">
                            <Button asChild>
                                <Link href="/settings/server">Go to Settings</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

        </div>
    );
}
