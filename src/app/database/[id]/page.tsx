
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Database, Settings, Activity, ShieldCheck, HardDrive, Trash2, Key, Users, Table, Terminal, RefreshCw, ChevronRight, Plus } from "lucide-react";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { PageTitleBack } from "@/components/page-header";
import type { Metadata } from 'next';
import { Badge } from "@/components/ui/badge";
import { getDatabaseDetails } from "../actions";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: 'Database Details | Neup.Cloud',
};

type Props = {
    params: Promise<{ id: string }>
}

export default async function DatabaseDetailsPage({ params }: Props) {
    const { id } = await params;
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) notFound();

    // Parse ID: Format is "engine-name"
    const parts = id.split('-');
    if (parts.length < 2) notFound();

    const engine = parts[0] as 'mysql' | 'postgres';
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageTitleBack
                    backHref="/database"
                    title={
                        <span className="flex items-center gap-3">
                            <span className="p-2.5 bg-primary/10 rounded-xl">
                                <Database className="w-6 h-6 text-primary" />
                            </span>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold tracking-tight">{details.name}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase bg-primary/5 text-primary border-primary/20">
                                        {details.engine}
                                    </Badge>
                                </div>
                                <span className="text-sm font-normal text-muted-foreground">Database Instance</span>
                            </div>
                        </span>
                    }
                />
                <div className="flex items-center gap-2 px-1">
                    <Button variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all">
                        <Trash2 className="h-3.5 w-3.5" /> Drop Database
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Size on Disk</CardTitle>
                        <HardDrive className="h-4 w-4 text-primary opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{details.size}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Activity className="h-3 w-3 text-green-500" /> Usage stable
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tables</CardTitle>
                        <Table className="h-4 w-4 text-muted-foreground opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{details.tablesCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Schema defined</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{details.userCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Authorized roles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Health Status</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-500 opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">OPTIMAL</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Integrity verified</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-2 border-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between bg-muted/20">
                            <div>
                                <CardTitle className="text-lg">Credentials & Access</CardTitle>
                                <CardDescription>Manage users and connection strings</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" className="gap-2">
                                <Plus className="h-3.5 w-3.5" /> Add User
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                <div className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Key className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Primary Owner</p>
                                            <p className="text-xs text-muted-foreground">Internal role with full access</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-xs">View Credentials</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/5">
                        <CardHeader className="bg-muted/20">
                            <CardTitle className="text-lg">Remote Connection</CardTitle>
                            <CardDescription>How to connect to this database externally</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="p-3 bg-black rounded-lg font-mono text-xs text-green-400 overflow-x-auto shadow-inner border border-white/5">
                                    {details.engine === 'mysql'
                                        ? `mysql -h ${details.name}.neup.cloud -u owner -p`
                                        : `psql "postgresql://owner@${details.name}.neup.cloud:5432/${details.name}"`
                                    }
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> SSL Mode Required</span>
                                    <span className="flex items-center gap-1.5 font-mono">Port: {details.engine === 'mysql' ? '3306' : '5432'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-2 border-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-primary" />
                                Quick Shell
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button className="w-full justify-between" variant="secondary">
                                Opening Interactive SQL <ChevronRight className="h-4 w-4" />
                            </Button>
                            <p className="text-[10px] text-muted-foreground text-center">
                                Runs a secure temporary session on the server
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="h-4 w-4 text-primary" />
                                Engine Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-all">
                                <span className="text-sm">Slow Query Log</span>
                                <Badge variant="secondary">OFF</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-all">
                                <span className="text-sm">Max Connections</span>
                                <span className="text-sm font-bold">150</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-all">
                                <span className="text-sm">Data Retention</span>
                                <span className="text-sm font-bold text-muted-foreground">30d</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <Activity className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Maintenance</span>
                        </div>
                        <p className="text-[11px] text-amber-900/70 dark:text-amber-500/70 leading-relaxed">
                            Backups are scheduled every 24 hours. The next backup is scheduled for midnight (GMT).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
