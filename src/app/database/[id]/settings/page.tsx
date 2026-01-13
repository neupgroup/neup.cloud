
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Database, Settings, Terminal, Globe, Zap, Activity } from "lucide-react";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { PageTitleBack } from "@/components/page-header";
import type { Metadata } from 'next';
import { Badge } from "@/components/ui/badge";
import { getDatabaseDetails } from "../../actions";
import { notFound } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
    title: 'Database Settings | Neup.Cloud',
};

type Props = {
    params: Promise<{ id: string }>
}

export default async function DatabaseSettingsPage({ params }: Props) {
    const { id } = await params;
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) notFound();

    // Parse ID: Format is "engine-name"
    const parts = id.split('-');
    if (parts.length < 2) notFound();

    const engine = parts[0] as 'mariadb' | 'postgres';
    const dbName = parts.slice(1).join('-');

    let details = null;
    try {
        details = await getDatabaseDetails(serverId, engine, dbName);
    } catch (error) {
        console.error(error);
        notFound();
    }

    return (
        <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <PageTitleBack
                backHref={`/database/${id}`}
                title={
                    <span className="flex items-center gap-3">
                        <span className="p-2.5 bg-primary/10 rounded-xl">
                            <Settings className="w-6 h-6 text-primary" />
                        </span>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-bold tracking-tight">Database Settings</span>
                            </div>
                            <span className="text-sm font-normal text-muted-foreground">{details.name}</span>
                        </div>
                    </span>
                }
            />

            <div className="space-y-6">
                {/* Remote Connection Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            <CardTitle>Remote Connection</CardTitle>
                        </div>
                        <CardDescription>
                            Control external access to this database instance
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label htmlFor="remote-access" className="text-base font-semibold">
                                    Enable Remote Access
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow connections from external IP addresses
                                </p>
                            </div>
                            <Switch id="remote-access" defaultChecked />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="allowed-ips">Allowed IP Addresses</Label>
                                <Input
                                    id="allowed-ips"
                                    placeholder="0.0.0.0/0 (All IPs)"
                                    defaultValue="0.0.0.0/0"
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Comma-separated list of IP addresses or CIDR blocks. Use 0.0.0.0/0 for all IPs.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="ssl-required" className="text-base font-semibold">
                                        Require SSL/TLS
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Force encrypted connections only
                                    </p>
                                </div>
                                <Switch id="ssl-required" defaultChecked disabled />
                            </div>
                        </div>

                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <p className="text-xs text-blue-900/70 dark:text-blue-500/70">
                                <strong>Note:</strong> SSL/TLS is always required for security. Changes to remote access settings may take up to 60 seconds to apply.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Shell Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            <CardTitle>Quick Shell</CardTitle>
                        </div>
                        <CardDescription>
                            Configure interactive SQL shell behavior
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label htmlFor="shell-enabled" className="text-base font-semibold">
                                    Enable Quick Shell
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow interactive SQL sessions through the dashboard
                                </p>
                            </div>
                            <Switch id="shell-enabled" defaultChecked />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                                <Input
                                    id="session-timeout"
                                    type="number"
                                    defaultValue="30"
                                    min="5"
                                    max="120"
                                    className="w-32"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Automatically close inactive shell sessions after this duration
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="query-logging" className="text-base font-semibold">
                                        Log Shell Queries
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Record all commands executed in shell sessions
                                    </p>
                                </div>
                                <Switch id="query-logging" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Engine Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            <CardTitle>Engine Configuration</CardTitle>
                        </div>
                        <CardDescription>
                            Performance and behavior settings for {details.engine.toUpperCase()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max-connections">Max Connections</Label>
                                <Input
                                    id="max-connections"
                                    type="number"
                                    defaultValue="150"
                                    min="10"
                                    max="1000"
                                    className="w-32"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Maximum number of concurrent database connections
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="buffer-pool">Buffer Pool Size (MB)</Label>
                                <Input
                                    id="buffer-pool"
                                    type="number"
                                    defaultValue="64"
                                    min="16"
                                    max="512"
                                    className="w-32"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Memory allocated for caching data and indexes
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="slow-query-log" className="text-base font-semibold">
                                        Slow Query Log
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Log queries that take longer than 2 seconds
                                    </p>
                                </div>
                                <Switch id="slow-query-log" />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="query-cache" className="text-base font-semibold">
                                        Query Cache
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Cache frequently executed query results
                                    </p>
                                </div>
                                <Switch id="query-cache" defaultChecked />
                            </div>
                        </div>

                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                                <Activity className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Performance Impact</span>
                            </div>
                            <p className="text-xs text-amber-900/70 dark:text-amber-500/70">
                                Changing these settings may require a database restart and could affect performance. Test changes in a non-production environment first.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                        Changes will be applied immediately and may require a brief service interruption.
                    </p>
                    <Button size="lg" className="px-8">
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
