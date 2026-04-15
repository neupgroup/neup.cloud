"use client";

import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, TerminalSquare, FolderOpen, Rocket, Database, Globe, HardDrive, Shield, ServerIcon, ArrowRight, Loader2, Check } from 'lucide-react';
import { PageTitle } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useServerName } from '@/core/hooks/use-server-name';
import { getServers, selectServer } from "@/services/server/server-service";
import type { Server } from "@/services/server/types";
import Cookies from "universal-cookie";

export default function ServerHomePage() {
    const serverName = useServerName();
    const router = useRouter();
    const [servers, setServers] = useState<Server[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [switchingId, setSwitchingId] = useState<string | null>(null);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

    useEffect(() => {
        const cookies = new Cookies(null, { path: "/" });
        setSelectedServerId(cookies.get("selected_server"));
    }, []);

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
        setSelectedServerId(id);
        router.push("/server/home");
    };

    return (
        <div className="space-y-8">
            <PageTitle
                title="Server"
                description="Open and manage each server area from one dashboard."
                serverName={serverName}
            />

            {/* Server Switcher Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Switch Server</CardTitle>
                    <CardDescription>Select a different server to manage</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Loading servers...</span>
                        </div>
                    ) : servers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No servers found.</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {servers.map(server => (
                                <Button
                                    key={server.id}
                                    variant={selectedServerId === server.id ? "default" : "ghost"}
                                    className="flex items-center justify-between h-auto py-3 px-3"
                                    disabled={!!switchingId}
                                    onClick={() => handleSwitch(server.id, server.name)}
                                >
                                    <span className="flex items-center gap-2">
                                        <ServerIcon className="h-4 w-4" />
                                        <div className="text-left">
                                            <p className="font-medium text-sm">{server.name}</p>
                                            <p className="text-xs text-muted-foreground">{server.username}@{server.publicIp}</p>
                                        </div>
                                    </span>
                                    {switchingId === server.id ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedServerId === server.id && <Check className="h-4 w-4" />}
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Server Features Grid */}
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
