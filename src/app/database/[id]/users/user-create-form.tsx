
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, ShieldCheck, Key, User } from 'lucide-react';
import { createDatabaseUser } from '../../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserCreateFormProps {
    serverId: string;
    engine: 'mariadb' | 'postgres';
    dbName: string;
    onSuccess: () => void;
}

export function UserCreateForm({ serverId, engine, dbName, onSuccess }: UserCreateFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState<'full' | 'read'>('full');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createDatabaseUser(serverId, engine, dbName, username, password, permissions);
            if (result.success) {
                toast({
                    title: 'User created',
                    description: result.message,
                });
                setUsername('');
                setPassword('');
                onSuccess();
                router.push(`/database/${engine}-${dbName}/users`);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Creation Failed',
                    description: result.message,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to create database user.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-2 border-primary/5">
            <CardHeader className="bg-muted/10">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Add Database User
                </CardTitle>
                <CardDescription>Grant a new user permissions to this database</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="app_user"
                                className="pl-10 h-11"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-10 h-11"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Initial Permissions</Label>
                        <Select value={permissions} onValueChange={(v: any) => setPermissions(v)}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select Permissions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full">Full Access (All Privileges)</SelectItem>
                                <SelectItem value="read">Read Only (SELECT only)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        This will grant your chosen privileges to this specific database.
                    </div>

                    <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/10" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating User...
                            </>
                        ) : (
                            'Create User'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
