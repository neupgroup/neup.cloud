'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { updateServer, deleteServer } from '@/app/servers/actions';
import { Loader2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Server = {
    id: string;
    name: string;
    username: string;
    type: string;
    provider: string;
    ram?: string;
    storage?: string;
    publicIp: string;
    privateIp?: string;
    privateKey?: string; // Often not returned for security, but needed for update if provided
    proxyHandler?: string;
    loadBalancer?: string;
};

export default function ServerDetailsClientPage({ server }: { server: Server }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: server.name || '',
        username: server.username || '',
        type: server.type || '',
        provider: server.provider || '',
        ram: server.ram || '',
        storage: server.storage || '',
        publicIp: server.publicIp || '',
        privateIp: server.privateIp || '',
        privateKey: '', // Don't prefill private key for security
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await updateServer(server.id, formData);
            toast({
                title: "Server Updated",
                description: "The server details have been updated successfully.",
            });
            router.refresh();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "Failed to update server.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteServer(server.id);
            toast({
                title: "Server Deleted",
                description: "The server has been permanently deleted.",
            });
            router.push('/servers');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: error.message || "Failed to delete server.",
            });
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            {/* Responsive Header */}
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/servers')}
                >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Servers
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{server.name}</h1>
                    <p className="text-sm text-muted-foreground">{server.username}@{server.publicIp}</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleUpdate}>
                    <CardHeader>
                        <CardTitle>Edit Server Details</CardTitle>
                        <CardDescription>
                            Update connection information or server metadata.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Server Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="publicIp">Public IP</Label>
                                <Input
                                    id="publicIp"
                                    name="publicIp"
                                    value={formData.publicIp}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, publicIp: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="privateIp">Private IP (Optional)</Label>
                                <Input
                                    id="privateIp"
                                    name="privateIp"
                                    value={formData.privateIp}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, privateIp: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="provider">Provider</Label>
                                <Select
                                    name="provider"
                                    value={formData.provider}
                                    onValueChange={(v) => handleSelectChange('provider', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Custom">Custom / Other</SelectItem>
                                        <SelectItem value="DigitalOcean">DigitalOcean</SelectItem>
                                        <SelectItem value="AWS">AWS</SelectItem>
                                        <SelectItem value="Hetzner">Hetzner</SelectItem>
                                        <SelectItem value="Vultr">Vultr</SelectItem>
                                        <SelectItem value="Linode">Linode</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">OS / Type</Label>
                                <Input
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, type: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ram">RAM</Label>
                                <Input
                                    id="ram"
                                    name="ram"
                                    value={formData.ram}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ram: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="privateKey">Update SSH Private Key</Label>
                            <Textarea
                                id="privateKey"
                                name="privateKey"
                                placeholder="(Leave empty to keep existing key)"
                                className="font-mono text-xs h-32"
                                value={formData.privateKey}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, privateKey: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Only enter a new private key if you want to replace the existing one.
                            </p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col-reverse sm:flex-row justify-between gap-4 border-t px-6 py-4 bg-muted/10">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" type="button" disabled={isDeleting} className="w-full sm:w-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Server
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently remove the server
                                        from your dashboard. It will NOT destroy the actual VPS provider instance.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button variant="ghost" type="button" onClick={() => router.push('/servers')} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
