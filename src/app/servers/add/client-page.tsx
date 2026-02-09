'use client';
import { useState } from 'react';
import { createServer } from '@/app/servers/actions';
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
import { PageTitleBack } from '@/components/page-header'; // Assuming this exists or similar

export default function AddServerClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        username: 'root',
        type: 'Ubuntu 22.04',
        provider: 'Custom',
        ram: '2GB',
        storage: '40GB',
        publicIp: '',
        privateIp: '',
        privateKey: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await createServer(formData);
            toast({
                title: "Server Created",
                description: "Your new server has been added successfully.",
            });
            router.push('/servers');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to create server.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add Server</h1>
                    <p className="text-muted-foreground">Connect a new server to your dashboard.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Server Details</CardTitle>
                    <CardDescription>
                        Enter the connection details for your existing VPS.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Server Name</Label>
                            <Input id="name" name="name" placeholder="my-server-1" required value={formData.name} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="publicIp">Public IP</Label>
                                <Input id="publicIp" name="publicIp" placeholder="1.2.3.4" required value={formData.publicIp} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="privateIp">Private IP (Optional)</Label>
                                <Input id="privateIp" name="privateIp" placeholder="10.0.0.1" value={formData.privateIp} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" name="username" placeholder="root" required value={formData.username} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="provider">Provider</Label>
                                <Select name="provider" value={formData.provider} onValueChange={(v) => handleSelectChange('provider', v)}>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">OS / Type</Label>
                                <Input id="type" name="type" placeholder="Ubuntu 22.04" required value={formData.type} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ram">RAM</Label>
                                <Input id="ram" name="ram" placeholder="4GB" value={formData.ram} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="privateKey">SSH Private Key</Label>
                            <Textarea
                                id="privateKey"
                                name="privateKey"
                                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                                className="font-mono text-xs h-32"
                                required
                                value={formData.privateKey}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">
                                The private key is required to connect and manage the server via SSH. It is stored securely.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Adding..." : "Add Server"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
