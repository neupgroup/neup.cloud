'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'universal-cookie';
import { getServer, updateServer } from '@/app/servers/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

import { generateNginxConfig, NginxLocation } from '@/core/nginx/generator';
import { Plus, Trash, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const PROXY_OPTIONS = ['Nginx', 'Apache', 'Caddy', 'Traefik'];
const LB_OPTIONS = ['Nginx', 'HAProxy', 'Traefik', 'AWS ELB', 'Google Cloud LB'];

export default function ServerSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [serverId, setServerId] = useState<string | null>(null);
    const [serverName, setServerName] = useState('');
    const [serverIp, setServerIp] = useState('');

    const [proxyHandler, setProxyHandler] = useState('');
    const [customProxy, setCustomProxy] = useState('');

    const [loadBalancer, setLoadBalancer] = useState('');
    const [customBalancer, setCustomBalancer] = useState('');

    // Nginx Generator State
    const [nginxDomain, setNginxDomain] = useState('');
    const [nginxPort, setNginxPort] = useState('80');
    const [nginxMainPort, setNginxMainPort] = useState('3000');
    const [nginxLocations, setNginxLocations] = useState<NginxLocation[]>([
        { path: '/', proxyPass: 'http://localhost:3000' }
    ]);
    const [generatedConfig, setGeneratedConfig] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchServer = async () => {
            const cookies = new Cookies(null, { path: '/' });
            const id = cookies.get('selected_server');

            if (!id) {
                toast({
                    variant: "destructive",
                    title: "No Server Selected",
                    description: "Please select a server first.",
                });
                router.push('/servers');
                return;
            }

            try {
                setServerId(id);
                const data = await getServer(id);
                if (data) {
                    setServerName(data.name);
                    setServerIp(data.publicIp || '');
                    setNginxDomain(data.publicIp || 'example.com');

                    // Handle Proxy Handler
                    if (data.proxyHandler) {
                        if (PROXY_OPTIONS.includes(data.proxyHandler)) {
                            setProxyHandler(data.proxyHandler);
                        } else {
                            setProxyHandler('Custom');
                            setCustomProxy(data.proxyHandler);
                        }
                    }

                    // Handle Load Balancer
                    if (data.loadBalancer) {
                        if (LB_OPTIONS.includes(data.loadBalancer)) {
                            setLoadBalancer(data.loadBalancer);
                        } else {
                            setLoadBalancer('Custom');
                            setCustomBalancer(data.loadBalancer);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch server:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load server settings.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchServer();
    }, [router, toast]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverId) return;

        setSaving(true);
        try {
            const finalProxy = proxyHandler === 'Custom' ? customProxy : proxyHandler;
            const finalBalancer = loadBalancer === 'Custom' ? customBalancer : loadBalancer;

            await updateServer(serverId, {
                proxyHandler: finalProxy,
                loadBalancer: finalBalancer,
            });

            toast({
                title: "Settings Saved",
                description: "Server configuration has been updated.",
            });
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save settings.",
            });
        } finally {
            setSaving(false);
        }
    };

    const addLocation = () => {
        setNginxLocations([...nginxLocations, { path: '', proxyPass: '' }]);
    };

    const removeLocation = (index: number) => {
        const newLocs = [...nginxLocations];
        newLocs.splice(index, 1);
        setNginxLocations(newLocs);
    };

    const updateLocation = (index: number, field: keyof NginxLocation, value: any) => {
        const newLocs = [...nginxLocations];
        newLocs[index] = { ...newLocs[index], [field]: value };
        setNginxLocations(newLocs);
    };

    const handleGenerateConfig = () => {
        const config = generateNginxConfig({
            domain: nginxDomain,
            port: parseInt(nginxPort) || 80,
            mainAppPort: parseInt(nginxMainPort) || 3000,
            locations: nginxLocations
        });
        setGeneratedConfig(config);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedConfig);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Copied",
            description: "Configuration copied to clipboard",
        });
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="grid gap-6 animate-in fade-in duration-500 pb-10">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Server Settings</h1>
                    <p className="text-muted-foreground">Configuration for {serverName}</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Network Configuration</CardTitle>
                            <CardDescription>
                                Configure how traffic is handled on this server.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">

                            {/* Proxy Handler Section */}
                            <div className="grid gap-3">
                                <Label className="text-base font-semibold">Proxy Handler</Label>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="proxy-handler" className="text-sm text-muted-foreground">Choose your proxy handler</Label>
                                        <Select value={proxyHandler} onValueChange={setProxyHandler}>
                                            <SelectTrigger id="proxy-handler">
                                                <SelectValue placeholder="Select a proxy handler" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PROXY_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                                <SelectItem value="Custom">Custom</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {proxyHandler === 'Custom' && (
                                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label htmlFor="custom-proxy" className="text-sm text-muted-foreground">Custom Proxy Name</Label>
                                            <Input
                                                id="custom-proxy"
                                                placeholder="e.g. MyCustomProxy"
                                                value={customProxy}
                                                onChange={(e) => setCustomProxy(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-border" />

                            {/* Load Balancer Section */}
                            <div className="grid gap-3">
                                <Label className="text-base font-semibold">Load Balancer</Label>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="load-balancer" className="text-sm text-muted-foreground">Choose your load balancer</Label>
                                        <Select value={loadBalancer} onValueChange={setLoadBalancer}>
                                            <SelectTrigger id="load-balancer">
                                                <SelectValue placeholder="Select a load balancer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LB_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                                <SelectItem value="Custom">Custom</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {loadBalancer === 'Custom' && (
                                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label htmlFor="custom-balancer" className="text-sm text-muted-foreground">Custom Load Balancer Name</Label>
                                            <Input
                                                id="custom-balancer"
                                                placeholder="e.g. MyCustomLB"
                                                value={customBalancer}
                                                onChange={(e) => setCustomBalancer(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                        </CardContent>
                        <CardFooter className="border-t px-6 py-4 flex justify-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Nginx Config Generator */}
                    {proxyHandler === 'Nginx' && (
                        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader>
                                <CardTitle>Nginx Configuration Generator</CardTitle>
                                <CardDescription>Generate a basic Nginx server block configuration based on your needs.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nginx-domain">Domain Name</Label>
                                        <Input
                                            id="nginx-domain"
                                            value={nginxDomain}
                                            onChange={(e) => setNginxDomain(e.target.value)}
                                            placeholder="example.com"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="nginx-port">Public Port</Label>
                                        <Input
                                            id="nginx-port"
                                            value={nginxPort}
                                            onChange={(e) => setNginxPort(e.target.value)}
                                            placeholder="80"
                                            type="number"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="nginx-main-port">Main App Port</Label>
                                        <Input
                                            id="nginx-main-port"
                                            value={nginxMainPort}
                                            onChange={(e) => setNginxMainPort(e.target.value)}
                                            placeholder="3000"
                                            type="number"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Proxy Paths & Locations</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Path
                                        </Button>
                                    </div>

                                    {nginxLocations.map((loc, index) => (
                                        <div key={index} className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end border p-4 rounded-md bg-muted/20">
                                            <div className="grid gap-2">
                                                <Label className="text-xs">Location Path</Label>
                                                <Input
                                                    value={loc.path}
                                                    onChange={(e) => updateLocation(index, 'path', e.target.value)}
                                                    placeholder="/app"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs">Target (Proxy Pass)</Label>
                                                <Input
                                                    value={loc.proxyPass || ''}
                                                    onChange={(e) => updateLocation(index, 'proxyPass', e.target.value)}
                                                    placeholder="http://localhost:4000"
                                                    disabled={loc.isStatic}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 pb-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`static-${index}`}
                                                        className="h-4 w-4 rounded border-gray-300"
                                                        checked={loc.isStatic || false}
                                                        onChange={(e) => {
                                                            updateLocation(index, 'isStatic', e.target.checked);
                                                            if (e.target.checked) {
                                                                updateLocation(index, 'proxyPass', undefined);
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`static-${index}`} className="text-sm cursor-pointer whitespace-nowrap">Serve Locally (Ignore)</Label>
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLocation(index)} className="text-muted-foreground hover:text-destructive">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <Button type="button" onClick={handleGenerateConfig} className="w-full sm:w-auto">
                                    Generate Configuration
                                </Button>

                                {generatedConfig && (
                                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Generated Configuration</Label>
                                            <Button type="button" variant="ghost" size="sm" onClick={copyToClipboard}>
                                                {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                                                {copied ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <Textarea
                                            className="font-mono text-sm h-[400px]"
                                            value={generatedConfig}
                                            readOnly
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </form>
        </div>
    );
}
