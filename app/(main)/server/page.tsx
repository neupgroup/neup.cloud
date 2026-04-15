"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServers, selectServer } from "@/services/servers/actions";
import type { Server } from "@/services/servers/types";
import { Loader2, ServerIcon, ArrowRight } from "lucide-react";

function SidebarServers() {
    const router = useRouter();
    const [servers, setServers] = useState<Server[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [switchingId, setSwitchingId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const data = await getServers();
                setServers(data);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const handleSwitch = async (id: string, name: string) => {
        setSwitchingId(id);
        await selectServer(id, name);
        setSwitchingId(null);
        router.push("/server");
    };

    return (
        <aside className="w-72 p-4 border-r min-h-screen">
            <h2 className="font-semibold mb-4">Servers</h2>
            {isLoading ? (
                <Loader2 className="animate-spin" />
            ) : servers.length === 0 ? (
                <div className="text-muted-foreground">No servers found.</div>
            ) : (
                <div className="flex flex-col gap-2">
                    {servers.map(server => (
                        <Button
                            key={server.id}
                            variant="ghost"
                            className="justify-between"
                            disabled={!!switchingId}
                            onClick={() => handleSwitch(server.id, server.name)}
                        >
                            <span className="flex items-center gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); router.push("/server"); }}>
                                <ServerIcon className="h-4 w-4" />
                                {server.name}
                            </span>
                            {switchingId === server.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        </Button>
                    ))}
                </div>
            )}
        </aside>
    );
}

export default function ServerPage() {
    return (
        <div className="flex">
            <SidebarServers />
            <main className="flex-1 p-8">
                {/* Main server content goes here */}
                <h1 className="text-2xl font-bold mb-4">Server Main Page</h1>
                <p>Select a server from the sidebar to manage or switch.</p>
            </main>
        </div>
    );
}
"use client";

import Link from 'next/link';
import { Activity, TerminalSquare, FolderOpen, Rocket, Database, Globe, HardDrive, Shield } from 'lucide-react';
import { PageTitle } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useServerName } from '@/hooks/use-server-name';

export default function ServerPage() {
    const serverName = useServerName();

    return (
        <div className="space-y-8">
            <PageTitle
                title="Server"
                description="Open and manage each server area from one dashboard."
                serverName={serverName}
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Status</CardTitle>
                        </div>
                        <CardDescription>
                            Monitor live and historical metrics for CPU, memory, temperature, network, and processes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Includes charts, process controls, and connectivity visibility.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/status">Open Status</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TerminalSquare className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Commands</CardTitle>
                        </div>
                        <CardDescription>
                            Run one-off commands, use saved commands, and inspect command execution history.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Supports command execution workflows and live sessions.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/commands">Open Commands</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Files</CardTitle>
                        </div>
                        <CardDescription>
                            Browse and manage files on the selected server.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Quick access to server-side file operations.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/files">Open Files</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Applications</CardTitle>
                        </div>
                        <CardDescription>
                            Manage deployments, app settings, environments, and release operations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Central place for app lifecycle tasks on this server.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/applications">Open Applications</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Database</CardTitle>
                        </div>
                        <CardDescription>
                            Create and manage database instances and credentials.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Covers database configuration, users, and management pages.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/database">Open Database</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Webservices</CardTitle>
                        </div>
                        <CardDescription>
                            Configure Nginx and SSL certificates for hosted applications and domains.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Includes nginx config editing and certificate flows.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/webservices">Open Webservices</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>System</CardTitle>
                        </div>
                        <CardDescription>
                            Handle packages, updates, storage, requirements, and swap settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Core maintenance and system-level controls.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/system">Open System</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Firewall</CardTitle>
                        </div>
                        <CardDescription>
                            Manage server network access, firewall keys, and users.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Security controls for network and access management.
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button asChild className="w-full">
                            <Link href="/server/firewall">Open Firewall</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
