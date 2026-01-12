'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'universal-cookie';
import { getServers } from '@/app/servers/actions';
import { getDomains, type ManagedDomain } from '@/app/domains/actions';
import {
    saveNginxConfiguration,
    getNginxConfiguration,
    getServerPublicIp,
    generateNginxConfigFile,
    generateNginxConfigFromContext,
    deployNginxConfig
} from './actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    Plus,
    Trash2,
    Server,
    Globe,
    Save,
    RefreshCw,
    FileCode,
    Rocket,
    Check,
    X
} from 'lucide-react';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PageTitleBack } from '@/components/page-header';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface SubPath {
    id: string;
    path: string;
    action: 'serve-local' | 'return-404';
}

interface ProxySettings {
    setHost?: boolean;
    setRealIp?: boolean;
    setForwardedFor?: boolean;
    setForwardedProto?: boolean;
    upgradeWebSocket?: boolean;
    customHeaders?: { key: string; value: string; id: string }[];
}

interface PathRule {
    id: string;
    path: string;
    action: 'proxy' | 'return-404';
    proxyTarget?: 'remote-server' | 'local-port';
    serverId?: string;
    serverName?: string;
    serverIp?: string;
    port?: string;
    localPort?: string;
    proxySettings?: ProxySettings;  // NEW
    subPaths?: SubPath[];
}

interface ServerOption {
    id: string;
    name: string;
    publicIp: string;
}

interface DomainOption {
    id: string;
    name: string;
    verified: boolean;
}

type DomainMode = 'none' | 'domain';

export default function NginxConfigPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedServerName, setSelectedServerName] = useState<string>('');
    const [selectedServerIp, setSelectedServerIp] = useState<string>('');
    const [fetchingIp, setFetchingIp] = useState(false);

    const [servers, setServers] = useState<ServerOption[]>([]);
    const [domains, setDomains] = useState<DomainOption[]>([]);
    const [domainMode, setDomainMode] = useState<DomainMode>('none');
    const [selectedDomainId, setSelectedDomainId] = useState<string>('');
    const [selectedDomainName, setSelectedDomainName] = useState<string>('');
    const [domainPaths, setDomainPaths] = useState<string>('');
    const [pathRules, setPathRules] = useState<PathRule[]>([]);
    const [generatedConfig, setGeneratedConfig] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [deploying, setDeploying] = useState(false);

    // Fetch available servers and domains
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch servers
                const serversData = await getServers();
                const serverOptions = serversData.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    publicIp: s.publicIp || '',
                }));
                setServers(serverOptions);

                // Fetch domains
                const domainsData = await getDomains();
                const domainOptions = domainsData.map((d: ManagedDomain) => ({
                    id: d.id,
                    name: d.name,
                    verified: d.verified || false,
                }));
                setDomains(domainOptions);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load servers and domains.',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    // Load saved configuration when a server is selected
    useEffect(() => {
        if (selectedServerId) {
            loadConfiguration(selectedServerId);
        }
    }, [selectedServerId]);

    const loadConfiguration = async (serverId: string) => {
        try {
            const config = await getNginxConfiguration(serverId);
            if (config && config.pathRules) {
                setPathRules(config.pathRules);

                // Load domain if saved
                if (config.domainId && config.domainName) {
                    setDomainMode('domain');
                    setSelectedDomainId(config.domainId);
                    setSelectedDomainName(config.domainName);
                }
            } else {
                setPathRules([]);
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    };

    const handleServerSelect = async (serverId: string) => {
        const server = servers.find(s => s.id === serverId);
        if (!server) return;

        setSelectedServerId(serverId);
        setSelectedServerName(server.name);
        setSelectedServerIp(server.publicIp);
    };

    const handleDomainSelect = (domainId: string) => {
        const domain = domains.find(d => d.id === domainId);
        if (!domain) return;

        setSelectedDomainId(domainId);
        setSelectedDomainName(domain.name);
    };

    const fetchPublicIp = async () => {
        if (!selectedServerId) return;

        setFetchingIp(true);
        try {
            const result = await getServerPublicIp(selectedServerId);
            if (result.success && result.publicIp) {
                setSelectedServerIp(result.publicIp);
                toast({
                    title: 'Success',
                    description: 'Public IP fetched successfully.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to fetch public IP.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch public IP.',
            });
        } finally {
            setFetchingIp(false);
        }
    };

    const addPathRule = () => {
        const newRule: PathRule = {
            id: `rule-${Date.now()}`,
            path: '',
            action: 'proxy',
            proxyTarget: 'local-port',
            serverId: '',
            serverName: '',
            serverIp: '',
            port: '3000',
            localPort: '3000',
            proxySettings: {
                setHost: true,
                setRealIp: true,
                setForwardedFor: true,
                setForwardedProto: true,
                upgradeWebSocket: true,
                customHeaders: [],
            },
            subPaths: [],
        };
        setPathRules([...pathRules, newRule]);
    };

    const removePathRule = (id: string) => {
        setPathRules(pathRules.filter(rule => rule.id !== id));
    };

    const updatePathRule = (id: string, field: keyof PathRule, value: any) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === id) {
                const updated = { ...rule, [field]: value };

                // If server is selected, auto-fill server details
                if (field === 'serverId' && value) {
                    const server = servers.find(s => s.id === value);
                    if (server) {
                        updated.serverName = server.name;
                        updated.serverIp = server.publicIp;
                    }
                }

                return updated;
            }
            return rule;
        }));
    };

    const addSubPath = (ruleId: string) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                const newSubPath: SubPath = {
                    id: `subpath-${Date.now()}`,
                    path: '',
                    action: 'serve-local',
                };
                return {
                    ...rule,
                    subPaths: [...(rule.subPaths || []), newSubPath],
                };
            }
            return rule;
        }));
    };

    const removeSubPath = (ruleId: string, subPathId: string) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                return {
                    ...rule,
                    subPaths: (rule.subPaths || []).filter(sp => sp.id !== subPathId),
                };
            }
            return rule;
        }));
    };

    const updateSubPath = (ruleId: string, subPathId: string, field: keyof SubPath, value: any) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                return {
                    ...rule,
                    subPaths: (rule.subPaths || []).map(sp => {
                        if (sp.id === subPathId) {
                            return { ...sp, [field]: value };
                        }
                        return sp;
                    }),
                };
            }
            return rule;
        }));
    };

    const updateProxySetting = (ruleId: string, field: keyof ProxySettings, value: any) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                const currentSettings = rule.proxySettings || {
                    setHost: true,
                    setRealIp: true,
                    setForwardedFor: true,
                    setForwardedProto: true,
                    upgradeWebSocket: true,
                    customHeaders: []
                };
                return {
                    ...rule,
                    proxySettings: {
                        ...currentSettings,
                        [field]: value
                    }
                };
            }
            return rule;
        }));
    };

    const addCustomHeader = (ruleId: string) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                const currentSettings = rule.proxySettings || {
                    setHost: true,
                    setRealIp: true,
                    setForwardedFor: true,
                    setForwardedProto: true,
                    upgradeWebSocket: true,
                    customHeaders: []
                };
                const newHeader = { id: `header-${Date.now()}`, key: '', value: '' };
                return {
                    ...rule,
                    proxySettings: {
                        ...currentSettings,
                        customHeaders: [...(currentSettings.customHeaders || []), newHeader]
                    }
                };
            }
            return rule;
        }));
    };

    const removeCustomHeader = (ruleId: string, headerId: string) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                if (!rule.proxySettings) return rule;
                const currentSettings = rule.proxySettings;
                return {
                    ...rule,
                    proxySettings: {
                        ...currentSettings,
                        customHeaders: (currentSettings.customHeaders || []).filter(h => h.id !== headerId)
                    }
                };
            }
            return rule;
        }));
    };

    const updateCustomHeader = (ruleId: string, headerId: string, field: 'key' | 'value', value: string) => {
        setPathRules(pathRules.map(rule => {
            if (rule.id === ruleId) {
                if (!rule.proxySettings) return rule;
                const currentSettings = rule.proxySettings;
                return {
                    ...rule,
                    proxySettings: {
                        ...currentSettings,
                        customHeaders: (currentSettings.customHeaders || []).map(h => {
                            if (h.id === headerId) {
                                return { ...h, [field]: value };
                            }
                            return h;
                        })
                    }
                };
            }
            return rule;
        }));
    };

    const handleSave = async () => {
        if (!selectedServerId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a server first.',
            });
            return;
        }

        // Validate path rules
        for (const rule of pathRules) {
            if (!rule.path) {
                toast({
                    variant: 'destructive',
                    title: 'Validation Error',
                    description: 'All path rules must have a path defined.',
                });
                return;
            }
            if (rule.action === 'proxy') {
                if (rule.proxyTarget === 'local-port' && !rule.localPort) {
                    toast({
                        variant: 'destructive',
                        title: 'Validation Error',
                        description: `Path "${rule.path}" with local port proxy must have a port specified.`,
                    });
                    return;
                }
                if (rule.proxyTarget === 'remote-server' && !rule.serverId) {
                    toast({
                        variant: 'destructive',
                        title: 'Validation Error',
                        description: `Path "${rule.path}" with remote server proxy must have a server selected.`,
                    });
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const result = await saveNginxConfiguration(selectedServerId, {
                serverIp: selectedServerIp,
                domainId: domainMode === 'domain' ? selectedDomainId || undefined : undefined,
                domainName: domainMode === 'domain' ? selectedDomainName || undefined : undefined,
                pathRules,
            });

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Nginx configuration saved successfully.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to save configuration.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to save configuration.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePreview = async () => {
        // Generate config from current form state
        setGenerating(true);
        try {
            // Build config from current form state
            const currentConfig = {
                serverIp: selectedServerIp,
                domainId: domainMode === 'domain' ? selectedDomainId || undefined : undefined,
                domainName: domainMode === 'domain' ? selectedDomainName || undefined : undefined,
                pathRules: pathRules,
            };

            const result = await generateNginxConfigFromContext(currentConfig);

            if (result.success && result.config) {
                setGeneratedConfig(result.config);
                setShowPreview(true);
                toast({
                    title: 'Configuration Generated',
                    description: 'Nginx configuration generated from current settings.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to generate configuration.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate configuration.',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleDeploy = async () => {
        if (!selectedServerId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a server first.',
            });
            return;
        }

        setDeploying(true);
        try {
            const result = await deployNginxConfig(selectedServerId);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Nginx configuration deployed and reloaded successfully.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Deployment Failed',
                    description: result.error || 'Failed to deploy configuration.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to deploy configuration.',
            });
        } finally {
            setDeploying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <PageTitleBack
                title="Nginx Configuration"
                description="Configure your Nginx server step by step"
                backHref="/webservices"
            />

            {/* Step 1: Server Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            1
                        </div>
                        Select Server
                    </CardTitle>
                    <CardDescription>
                        Choose the server where Nginx is running
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="server-select">Server</Label>
                        <Select
                            value={selectedServerId || ''}
                            onValueChange={handleServerSelect}
                        >
                            <SelectTrigger id="server-select">
                                <SelectValue placeholder="Select a server" />
                            </SelectTrigger>
                            <SelectContent>
                                {servers.map(server => (
                                    <SelectItem key={server.id} value={server.id}>
                                        {server.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Public IP - Only show if server is selected */}
            {selectedServerId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                2
                            </div>
                            Public IP
                        </CardTitle>
                        <CardDescription>
                            Server public IP address
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="server-ip">Public IP Address</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="server-ip"
                                    value={selectedServerIp}
                                    onChange={(e) => setSelectedServerIp(e.target.value)}
                                    placeholder="Server public IP"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={fetchPublicIp}
                                    disabled={fetchingIp}
                                >
                                    {fetchingIp ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Domain Configuration - Only show if server is selected */}
            {selectedServerId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                3
                            </div>
                            Domain Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure domain or use IP address
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <RadioGroup value={domainMode} onValueChange={(value) => setDomainMode(value as DomainMode)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="none" id="no-domain" />
                                    <Label htmlFor="no-domain" className="font-normal cursor-pointer">
                                        No Domain (use IP address)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="domain" id="use-domain" />
                                    <Label htmlFor="use-domain" className="font-normal cursor-pointer">
                                        Use Domain
                                    </Label>
                                </div>
                            </RadioGroup>

                            {domainMode === 'domain' && (
                                <div className="space-y-4 pl-6 border-l-2 border-muted">
                                    <div className="space-y-2">
                                        <Label htmlFor="domain-select">Select Domain</Label>
                                        <Select
                                            value={selectedDomainId}
                                            onValueChange={handleDomainSelect}
                                        >
                                            <SelectTrigger id="domain-select">
                                                <SelectValue placeholder="Select a domain" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {domains.length === 0 ? (
                                                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                                        No domains found. <Link href="/domains/add" className="text-primary underline">Add a domain</Link>
                                                    </div>
                                                ) : (
                                                    domains.map(domain => (
                                                        <SelectItem key={domain.id} value={domain.id}>
                                                            <div className="flex items-center gap-2">
                                                                {domain.name}
                                                                {domain.verified && (
                                                                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedDomainName && (
                                        <div className="space-y-2">
                                            <Label htmlFor="domain-paths">Domain Paths (Optional)</Label>
                                            <Input
                                                id="domain-paths"
                                                value={domainPaths}
                                                onChange={(e) => setDomainPaths(e.target.value)}
                                                placeholder="e.g., /api, /admin (comma separated)"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Leave empty to use all paths, or specify specific paths for this domain
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Path Routing Rules - Only show if server is selected */}
            {selectedServerId && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                        4
                                    </div>
                                    Path Routing Rules
                                </CardTitle>
                                <CardDescription>
                                    Define which paths point to which server and port
                                </CardDescription>
                            </div>
                            <Button onClick={addPathRule} size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Rule
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {pathRules.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground mb-4">
                                    No path rules defined yet
                                </p>
                                <Button onClick={addPathRule} variant="outline">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Your First Rule
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {pathRules.map((rule, index) => (
                                    <div key={rule.id} className="space-y-4">
                                        {index > 0 && <Separator />}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Rule {index + 1}</Badge>
                                                {rule.action === 'return-404' && (
                                                    <Badge variant="secondary">404</Badge>
                                                )}
                                                {rule.action === 'proxy' && (
                                                    <Badge variant="default">Proxy</Badge>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removePathRule(rule.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor={`path-${rule.id}`}>
                                                    Path <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id={`path-${rule.id}`}
                                                    value={rule.path}
                                                    onChange={(e) =>
                                                        updatePathRule(rule.id, 'path', e.target.value)
                                                    }
                                                    placeholder="/app"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`action-${rule.id}`}>
                                                    Action <span className="text-destructive">*</span>
                                                </Label>
                                                <Select
                                                    value={rule.action}
                                                    onValueChange={(value) =>
                                                        updatePathRule(rule.id, 'action', value as 'proxy' | 'return-404')
                                                    }
                                                >
                                                    <SelectTrigger id={`action-${rule.id}`}>
                                                        <SelectValue placeholder="Select action" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="proxy">Proxy to Server</SelectItem>
                                                        <SelectItem value="return-404">Return 404</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {rule.action === 'proxy' && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`proxy-target-${rule.id}`}>
                                                            Proxy Target <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Select
                                                            value={rule.proxyTarget || 'local-port'}
                                                            onValueChange={(value) =>
                                                                updatePathRule(rule.id, 'proxyTarget', value as 'local-port' | 'remote-server')
                                                            }
                                                        >
                                                            <SelectTrigger id={`proxy-target-${rule.id}`}>
                                                                <SelectValue placeholder="Select proxy target" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="local-port">Local Port (localhost)</SelectItem>
                                                                <SelectItem value="remote-server">Remote Server</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            {rule.proxyTarget === 'local-port'
                                                                ? 'Proxy to an app running on this nginx server'
                                                                : 'Proxy to an app running on another server'}
                                                        </p>
                                                    </div>

                                                    {rule.proxyTarget === 'local-port' ? (
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`local-port-${rule.id}`}>
                                                                Local Port <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Input
                                                                id={`local-port-${rule.id}`}
                                                                value={rule.localPort || ''}
                                                                onChange={(e) =>
                                                                    updatePathRule(rule.id, 'localPort', e.target.value)
                                                                }
                                                                placeholder="3000"
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Port where your app is running (e.g., Next.js on 3000)
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`server-${rule.id}`}>
                                                                    Target Server <span className="text-destructive">*</span>
                                                                </Label>
                                                                <Select
                                                                    value={rule.serverId || ''}
                                                                    onValueChange={(value) =>
                                                                        updatePathRule(rule.id, 'serverId', value)
                                                                    }
                                                                >
                                                                    <SelectTrigger id={`server-${rule.id}`}>
                                                                        <SelectValue placeholder="Select target server" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {servers.map(server => (
                                                                            <SelectItem key={server.id} value={server.id}>
                                                                                {server.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label htmlFor={`port-${rule.id}`}>Port</Label>
                                                                <Input
                                                                    id={`port-${rule.id}`}
                                                                    value={rule.port || ''}
                                                                    onChange={(e) =>
                                                                        updatePathRule(rule.id, 'port', e.target.value)
                                                                    }
                                                                    placeholder="3000"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Sub-paths section */}
                                                    <div className="space-y-3 pt-4 border-t">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-sm font-medium">
                                                                Sub-paths (Optional)
                                                            </Label>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addSubPath(rule.id)}
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                Add Sub-path
                                                            </Button>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Define specific sub-paths under {rule.path || 'this path'} to handle differently
                                                        </p>

                                                        {rule.subPaths && rule.subPaths.length > 0 && (
                                                            <div className="space-y-3 pl-4 border-l-2 border-muted">
                                                                {rule.subPaths.map((subPath, subIndex) => (
                                                                    <div key={subPath.id} className="space-y-2 p-3 bg-muted/30 rounded-md">
                                                                        <div className="flex items-center justify-between">
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                Sub-path {subIndex + 1}
                                                                            </Badge>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                onClick={() => removeSubPath(rule.id, subPath.id)}
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <Label htmlFor={`subpath-path-${subPath.id}`} className="text-xs">
                                                                                Path
                                                                            </Label>
                                                                            <Input
                                                                                id={`subpath-path-${subPath.id}`}
                                                                                value={subPath.path}
                                                                                onChange={(e) =>
                                                                                    updateSubPath(rule.id, subPath.id, 'path', e.target.value)
                                                                                }
                                                                                placeholder="/about"
                                                                                className="h-8 text-sm"
                                                                            />
                                                                            <p className="text-xs text-muted-foreground">
                                                                                Full path: {rule.path}{subPath.path}
                                                                            </p>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <Label htmlFor={`subpath-action-${subPath.id}`} className="text-xs">
                                                                                Action
                                                                            </Label>
                                                                            <Select
                                                                                value={subPath.action}
                                                                                onValueChange={(value) =>
                                                                                    updateSubPath(rule.id, subPath.id, 'action', value as 'serve-local' | 'return-404')
                                                                                }
                                                                            >
                                                                                <SelectTrigger id={`subpath-action-${subPath.id}`} className="h-8 text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="serve-local">Serve Locally</SelectItem>
                                                                                    <SelectItem value="return-404">Return 404</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Advanced Proxy Settings */}
                                                    <div className="space-y-3 pt-4 border-t">
                                                        <Label className="text-sm font-medium">
                                                            Advanced Proxy Settings
                                                        </Label>

                                                        {rule.proxySettings && (
                                                            <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`setHost-${rule.id}`}
                                                                            checked={rule.proxySettings.setHost !== false}
                                                                            onChange={(e) => updateProxySetting(rule.id, 'setHost', e.target.checked)}
                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                        />
                                                                        <Label htmlFor={`setHost-${rule.id}`} className="text-xs">Pass Host Header</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`setRealIp-${rule.id}`}
                                                                            checked={rule.proxySettings.setRealIp !== false}
                                                                            onChange={(e) => updateProxySetting(rule.id, 'setRealIp', e.target.checked)}
                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                        />
                                                                        <Label htmlFor={`setRealIp-${rule.id}`} className="text-xs">Pass Real IP</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`setForwardedFor-${rule.id}`}
                                                                            checked={rule.proxySettings.setForwardedFor !== false}
                                                                            onChange={(e) => updateProxySetting(rule.id, 'setForwardedFor', e.target.checked)}
                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                        />
                                                                        <Label htmlFor={`setForwardedFor-${rule.id}`} className="text-xs">Pass X-Forwarded-For</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`setForwardedProto-${rule.id}`}
                                                                            checked={rule.proxySettings.setForwardedProto !== false}
                                                                            onChange={(e) => updateProxySetting(rule.id, 'setForwardedProto', e.target.checked)}
                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                        />
                                                                        <Label htmlFor={`setForwardedProto-${rule.id}`} className="text-xs">Pass X-Forwarded-Proto</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`upgradeWebSocket-${rule.id}`}
                                                                            checked={rule.proxySettings.upgradeWebSocket !== false}
                                                                            onChange={(e) => updateProxySetting(rule.id, 'upgradeWebSocket', e.target.checked)}
                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                        />
                                                                        <Label htmlFor={`upgradeWebSocket-${rule.id}`} className="text-xs">Upgrade WebSocket</Label>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2 pt-2 border-t">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-xs font-medium">Custom Headers</Label>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => addCustomHeader(rule.id)}
                                                                            className="h-6 text-xs"
                                                                        >
                                                                            <Plus className="h-3 w-3 mr-1" /> Add Header
                                                                        </Button>
                                                                    </div>
                                                                    {rule.proxySettings.customHeaders && rule.proxySettings.customHeaders.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            {rule.proxySettings.customHeaders.map((header) => (
                                                                                <div key={header.id} className="flex items-center gap-2">
                                                                                    <Input
                                                                                        placeholder="Header Name"
                                                                                        value={header.key}
                                                                                        onChange={(e) => updateCustomHeader(rule.id, header.id, 'key', e.target.value)}
                                                                                        className="h-8 text-xs"
                                                                                    />
                                                                                    <Input
                                                                                        placeholder="Value"
                                                                                        value={header.value}
                                                                                        onChange={(e) => updateCustomHeader(rule.id, header.id, 'value', e.target.value)}
                                                                                        className="h-8 text-xs"
                                                                                    />
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-8 w-8"
                                                                                        onClick={() => removeCustomHeader(rule.id, header.id)}
                                                                                    >
                                                                                        <X className="h-3 w-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {rule.action === 'proxy' && (
                                                (rule.proxyTarget === 'local-port' && rule.localPort) ||
                                                (rule.proxyTarget === 'remote-server' && rule.serverId)
                                            ) && (
                                                    <div className="bg-muted/50 p-3 rounded-md text-sm">
                                                        <p className="text-muted-foreground">
                                                            <strong>Route:</strong> {rule.path} → {
                                                                rule.proxyTarget === 'local-port'
                                                                    ? `localhost:${rule.localPort}`
                                                                    : `${rule.serverIp || 'N/A'}:${rule.port || '3000'}`
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Generate Configuration - Always show */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            5
                        </div>
                        Generate Configuration
                    </CardTitle>
                    <CardDescription>
                        Preview the Nginx configuration file
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleGeneratePreview}
                        disabled={generating}
                        className="w-full"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileCode className="mr-2 h-4 w-4" />
                                Generate Preview
                            </>
                        )}
                    </Button>

                    {showPreview && generatedConfig && (
                        <div className="space-y-2">
                            <Label>Generated Configuration</Label>
                            <Textarea
                                value={generatedConfig}
                                readOnly
                                className="font-mono text-xs h-64"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 6: Deploy - Only show if config is generated and server is selected */}
            {selectedServerId && showPreview && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                6
                            </div>
                            Deploy Configuration
                        </CardTitle>
                        <CardDescription>
                            Deploy the configuration to your Nginx server
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Warning:</strong> This will overwrite your current Nginx configuration and reload the server.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                variant="outline"
                                className="flex-1"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Configuration
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleDeploy}
                                disabled={deploying}
                                className="flex-1"
                            >
                                {deploying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deploying...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="mr-2 h-4 w-4" />
                                        Deploy Now
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
