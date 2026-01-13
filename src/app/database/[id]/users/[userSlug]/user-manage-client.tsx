
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, ShieldCheck, Trash2, Key, ChevronLeft, Loader2, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDatabaseUserPermissions, deleteDatabaseUser, getDatabaseDetails } from "../../../actions";
import Link from 'next/link';

interface UserManageClientProps {
    serverId: string;
    engine: 'mariadb' | 'postgres';
    dbName: string;
    username: string;
    host: string;
}

export function UserManageClient({ serverId, engine, dbName, username, host }: UserManageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [permissions, setPermissions] = useState<'full' | 'read'>('full');

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const res = await updateDatabaseUserPermissions(serverId, engine, dbName, username, host, permissions);
            if (res.success) {
                toast({ title: 'Permissions updated', description: res.message });
            } else {
                toast({ variant: 'destructive', title: 'Update failed', description: res.message });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete user ${username}? This action cannot be undone.`)) return;
        setIsLoading(true);
        try {
            const res = await deleteDatabaseUser(serverId, engine, dbName, username, host);
            if (res.success) {
                toast({ title: 'User deleted', description: res.message });
                router.push(`/database/${engine}-${dbName}/users`);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.message });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground" asChild>
                        <Link href={`/database/${engine}-${dbName}/users`}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Users
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{username}</h1>
                        <Badge variant="secondary" className="uppercase">{engine}</Badge>
                    </div>
                    <p className="text-muted-foreground">Managing access to <span className="text-foreground font-medium">{dbName}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-2 border-primary/5">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Modify Permissions
                            </CardTitle>
                            <CardDescription>Update the access level for this database account</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Access Level</label>
                                <Select value={permissions} onValueChange={(v: any) => setPermissions(v)}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full">Full Access (ALL PRIVILEGES)</SelectItem>
                                        <SelectItem value="read">Read-Only (SELECT ONLY)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                                <p className="text-sm font-bold">What this changes:</p>
                                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                                    {permissions === 'full' ? (
                                        <>
                                            <li>Can CREATE, ALTER, and DROP tables</li>
                                            <li>Full SELECT, INSERT, UPDATE, DELETE rights</li>
                                            <li>Can manage indexes and constraints</li>
                                        </>
                                    ) : (
                                        <>
                                            <li>Can only SELECT data from tables</li>
                                            <li>Cannot modify records or schema</li>
                                            <li>Safest for reporting or public-facing tools</li>
                                        </>
                                    )}
                                </ul>
                            </div>

                            <Button onClick={handleUpdate} className="gap-2 shadow-lg shadow-primary/10" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-2 border-destructive/10 bg-destructive/5 overflow-hidden">
                        <CardHeader className="bg-destructive/10 pt-4 pb-4">
                            <CardTitle className="text-lg text-destructive flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Danger Zone
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Deleting this user will immediately revoke all access to this database. Any applications using these credentials will fail to connect.
                            </p>
                            <Button variant="destructive" className="w-full" onClick={handleDelete} disabled={isLoading}>
                                Delete User Account
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Key className="h-4 w-4 text-primary" />
                                Connection Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-xs space-y-1">
                                <p className="text-muted-foreground font-medium uppercase text-[10px]">Username</p>
                                <p className="font-mono bg-muted p-2 rounded">{username}</p>
                            </div>
                            <div className="text-xs space-y-1">
                                <p className="text-muted-foreground font-medium uppercase text-[10px]">Allowed Host</p>
                                <p className="font-mono bg-muted p-2 rounded">{host}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
