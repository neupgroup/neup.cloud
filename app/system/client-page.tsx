'use client';

import { PageTitle } from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Activity, Cpu, HardDrive } from "lucide-react"; // Removed Power, Loader2, Clock, Button imports as they are inside component or unused
import { useState, useEffect } from 'react';
import { rebootSystem } from '@/app/applications/actions';
import { getSystemUptime } from '@/app/servers/actions';
import { useToast } from "../../hooks/use-toast";
import Cookies from "universal-cookie";
import { SystemHealthCard } from '@/components/system-health-card';
import { useServerName } from '../../hooks/use-server-name';
import { Progress } from '@/components/ui/progress';
import { Folder, File, Database, Server } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import StartupClient from './startup/startup-client';
import { UpdatesClient } from '@/app/updates/updates-client';
import { PackagesClient } from '@/app/packages/packages-client';
import FirewallNetworkClient from '@/app/firewall/network/network-client';

const storageItems = [
    { name: "System Files", size: "25 GB", usage: 50, icon: <HardDrive className="h-5 w-5 text-muted-foreground" /> },
    { name: "Application Data", size: "40 GB", usage: 80, icon: <Folder className="h-5 w-5 text-muted-foreground" /> },
    { name: "User Uploads", size: "15 GB", usage: 30, icon: <File className="h-5 w-5 text-muted-foreground" /> },
    { name: "Database", size: "20 GB", usage: 40, icon: <Database className="h-5 w-5 text-muted-foreground" /> },
];

export default function SystemPage() {
    const { toast } = useToast();
    const [isRebooting, setIsRebooting] = useState(false);
    const [uptime, setUptime] = useState<string | null>(null);
    const [serverId, setServerId] = useState<string | null>(null);
    const serverName = useServerName();

    // Fetch uptime
    useEffect(() => {
        const fetchUptime = async () => {
            const cookies = new Cookies(null, { path: '/' });
            const serverId = cookies.get('selected_server');

            if (!serverId) {
                setServerId(null);
                setUptime(null);
                return;
            }

            setServerId(serverId);

            try {
                const result = await getSystemUptime(serverId);
                if (result.error) {
                    setUptime("Unavailable");
                } else if (result.uptime) {
                    setUptime(result.uptime);
                }
            } catch (error) {
                setUptime("Error");
            }
        };

        fetchUptime();
    }, []);

    const handleReboot = async () => {
        if (!confirm("Are you sure you want to reboot the server? This will cause temporary downtime.")) return;

        const cookies = new Cookies(null, { path: '/' });
        const serverId = cookies.get('selected_server');

        if (!serverId) {
            toast({ variant: "destructive", title: "Error", description: "No server selected." });
            return;
        }

        setIsRebooting(true);
        try {
            const result = await rebootSystem(serverId);
            if (result.error) {
                toast({ variant: "destructive", title: "Reboot Failed", description: result.error });
            } else {
                toast({ title: "Reboot Initiated", description: "Server is rebooting. It may take a few minutes to come back online." });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setTimeout(() => setIsRebooting(false), 5000);
        }
    };

    return (
        <div className="space-y-8">
            <PageTitle
                title="System"
                description="Storage, startup, updates, packages, and firewall in one place"
                serverName={serverName}
            />

            {!serverId ? (
                <Card className="text-center p-8">
                    <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Server Selected</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Please go to the servers page and select a server to manage.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href="/servers">Go to Servers</Link>
                    </Button>
                </Card>
            ) : (
                <>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total CPU
                        </CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12%</div>
                        <p className="text-xs text-muted-foreground">
                            +2% from last hour
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Memory Usage
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2 GB</div>
                        <p className="text-xs text-muted-foreground">
                            total 16 GB
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Disk Space
                        </CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">245 GB</div>
                        <p className="text-xs text-muted-foreground">
                            32% free
                        </p>
                    </CardContent>
                </Card>

                <SystemHealthCard
                    uptime={uptime}
                    onReboot={handleReboot}
                    isRebooting={isRebooting}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Storage Information</CardTitle>
                    <CardDescription>Monitor and manage disk space</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {storageItems.map((item) => (
                            <div key={item.name}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {item.icon}
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{item.size} / 100 GB</span>
                                </div>
                                <Progress value={item.usage} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Startup Information</CardTitle>
                    <CardDescription>View and manage startup services</CardDescription>
                </CardHeader>
                <CardContent>
                    <StartupClient serverId={serverId} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Updates Information</CardTitle>
                    <CardDescription>Check and apply system updates</CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdatesClient serverId={serverId} serverName={serverName || 'Unknown Server'} showTitle={false} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Packages Information</CardTitle>
                    <CardDescription>Browse installed packages and add new ones</CardDescription>
                </CardHeader>
                <CardContent>
                    <PackagesClient serverId={serverId} serverName={serverName || 'Unknown Server'} showTitle={false} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Firewall Information</CardTitle>
                    <CardDescription>Manage firewall status and rules</CardDescription>
                </CardHeader>
                <CardContent>
                    <FirewallNetworkClient serverId={serverId} />
                </CardContent>
            </Card>



            <Card className="p-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">System Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">OS Class</span>
                            <span className="font-mono">Linux</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Distribution</span>
                            <span className="font-mono">Ubuntu 22.04 LTS</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Kernel</span>
                            <span className="font-mono">5.15.0-91-generic</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Architecture</span>
                            <span className="font-mono">x86_64</span>
                        </div>
                    </div>
                </div>
            </Card>
                </>
            )}
        </div>
    );
}
