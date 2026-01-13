
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Database, Plus, Server, Settings, Activity, ShieldCheck, Search, CheckCircle, AlertCircle, HardDrive, Trash2, ExternalLink, ChevronRight } from "lucide-react";
import { cookies } from "next/headers";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-header";
import type { Metadata } from 'next';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { checkDatabaseInstallation, listAllDatabases, type DatabaseInstallation, type DatabaseInstance } from "./actions";

export const metadata: Metadata = {
    title: 'Databases | Neup.Cloud',
};

export default async function DatabasePage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    const serverName = cookieStore.get('selected_server_name')?.value;

    let installation: DatabaseInstallation | null = null;
    let databaseInstances: DatabaseInstance[] = [];

    if (serverId) {
        try {
            [installation, databaseInstances] = await Promise.all([
                checkDatabaseInstallation(serverId),
                listAllDatabases(serverId)
            ]);
        } catch (error) {
            console.error("Failed to fetch database data:", error);
        }
    }

    const installedEngines = installation?.details ? Object.entries(installation.details)
        .filter(([_, info]) => info.status === 'installed')
        .map(([name]) => name) : [];

    return (
        <div className="grid gap-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageTitle
                    title={
                        <span className="flex items-center gap-2">
                            <Database className="w-8 h-8 text-primary" />
                            Database Management
                        </span>
                    }
                    description={
                        serverName ? (
                            <span>
                                Manage database engines and instances on <span className="font-semibold text-foreground">{serverName}</span>
                            </span>
                        ) : (
                            "No server selected. Please select a server to manage databases."
                        )
                    }
                />
                {serverId && (
                    <Button asChild className="shrink-0 gap-2 shadow-lg hover:shadow-xl transition-all">
                        <Link href="/database/create">
                            <Plus className="h-4 w-4" />
                            Create Database
                        </Link>
                    </Button>
                )}
            </div>

            {!serverId ? (
                <Card className="text-center p-12 border-dashed bg-muted/20">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Server className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">No Server Selected</h3>
                    <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                        You need to select a server before you can manage its databases.
                    </p>
                    <Button asChild className="mt-6" variant="outline">
                        <Link href="/servers">Go to Servers</Link>
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-primary/5 border-primary/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Databases</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{databaseInstances.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Running Engines</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    {installedEngines.length}
                                    {installedEngines.length > 0 ? (
                                        <Badge variant="outline" className="text-[10px] font-normal uppercase">
                                            {installedEngines.join(', ')}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] font-normal">None</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">~ MB</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Connections</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-500">Auto</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold font-headline tracking-tight">Installed Engines</h2>
                        </div>

                        {installedEngines.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {installedEngines.map((engine) => (
                                    <Card key={engine} className="overflow-hidden border-2 border-primary/5 hover:border-primary/20 transition-all">
                                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${engine === 'mysql' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                    <Database className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg uppercase">{engine}</CardTitle>
                                                    <CardDescription className="text-xs">
                                                        Version {installation?.details[engine].version} installed on {new Date(installation?.details[engine].installed_on || '').toLocaleDateString()}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                                Running
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="pt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Healthy</span>
                                                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Secure</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" className="gap-2">
                                                    Manage <Settings className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed bg-muted/10 p-12 flex flex-col items-center justify-center text-center">
                                <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-medium">No Database Engines Found</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm">
                                    It looks like you haven't installed any database engines on this server yet.
                                    Install MariaDB or PostgreSQL to get started.
                                </p>
                                <div className="flex gap-4">
                                    <Button asChild variant="secondary">
                                        <Link href="/database/create">Install MySQL/MariaDB</Link>
                                    </Button>
                                    <Button asChild variant="secondary">
                                        <Link href="/database/create">Install PostgreSQL</Link>
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="grid gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold font-headline tracking-tight">Databases</h2>
                            <div className="flex items-center gap-4">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search databases..."
                                        className="pl-9 bg-muted/50"
                                    />
                                </div>
                            </div>
                        </div>

                        {databaseInstances.length > 0 ? (
                            <div className="grid gap-4">
                                {databaseInstances.map((db, idx) => (
                                    <Link
                                        key={`${db.engine}-${db.name}-${idx}`}
                                        href={`/database/${db.engine}-${db.name}`}
                                        className="group"
                                    >
                                        <Card className="hover:border-primary/20 hover:shadow-md transition-all">
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${db.engine === 'mysql' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                        <Database className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-lg">{db.name}</span>
                                                            <Badge variant="secondary" className="text-[10px] uppercase">{db.engine}</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                            <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> External Access Enabled</span>
                                                            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> SSL Active</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary transition-colors">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">Database Instances</CardTitle>
                                        </div>
                                    </div>
                                    <CardDescription>No databases created yet.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="p-3 bg-muted rounded-full mb-4">
                                            <Database className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                                            Once you have an engine installed, you can create multiple database instances here.
                                        </p>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href="/database/create">Create Initial Database</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
