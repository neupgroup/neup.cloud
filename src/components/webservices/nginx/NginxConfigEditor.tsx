'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getServers } from '@/app/servers/actions';
import { getDomains, type ManagedDomain } from '@/app/domains/actions';
import {
    getServerPublicIp,
    generateNginxConfigFromContext,
    deployNginxConfig,
} from '@/app/webservices/nginx/actions';
import { saveWebServiceConfig, updateWebServiceConfig, deleteWebServiceConfig, getWebOrServerNginxConfig } from '@/app/webservices/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    Plus,
    Trash2,
    Save,
    FileCode,
    Rocket,
    X,
    ChevronDown
} from 'lucide-react';
import Link from 'next/link';
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
import { Textarea } from '@/components/ui/textarea';
import { PageTitleBack } from '@/components/page-header';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
    proxySettings?: ProxySettings;
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

interface NginxConfigEditorProps {
    configId?: string;
}

export default function NginxConfigEditor({ configId }: NginxConfigEditorProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedServerName, setSelectedServerName] = useState<string>('');
    const [selectedServerIp, setSelectedServerIp] = useState<string>('');
    const [fetchingIp, setFetchingIp] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [configName, setConfigName] = useState<string>('');

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
    const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

    const isNew = !configId || configId === 'new';

    // Fetch available servers and domains, and config if editing
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

                // If editing, fetch config
                if (!isNew && configId) {
                    const config = await getWebOrServerNginxConfig(configId);
                    if (config && config.type === 'nginx') {
                        if (config.name) setConfigName(config.name);
                        const val = config.value;
                        if (val.serverIp) setSelectedServerIp(val.serverIp);
                        if (config.serverId) {
                            setSelectedServerId(config.serverId);
                            // Find server name from options if possible, or use saved one
                            const s = serverOptions.find((o: any) => o.id === config.serverId);
                            setSelectedServerName(s ? s.name : (config.serverName || ''));
                        }

                        if (val.domainId) {
                            setDomainMode('domain');
                            setSelectedDomainId(val.domainId);
                            if (val.domainName) setSelectedDomainName(val.domainName);
                        } else {
                            setDomainMode('none');
                        }

                        if (val.pathRules) {
                            setPathRules(val.pathRules);
                        }
                    }
                } else {
                    // Reset state for new configuration
                    setConfigName('');

                    // Pre-select current server from cookie
                    const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                    }
                    const currentServerId = getCookie('selected_server');

                    if (currentServerId) {
                        setSelectedServerId(currentServerId);
                        const s = serverOptions.find((o: any) => o.id === currentServerId);
                        if (s) {
                            setSelectedServerName(s.name);
                            setSelectedServerIp(s.publicIp);
                        }
                    } else {
                        setSelectedServerId(null);
                        setSelectedServerName('');
                        setSelectedServerIp('');
                    }
                    setSelectedServerIp('');
                    setDomainMode('none');
                    setSelectedDomainId('');
                    setSelectedDomainName('');

                    // Create default rule for root path
                    const defaultRuleId = `rule-${Date.now()}`;
                    setPathRules([{
                        id: defaultRuleId,
                        path: '/',
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
                    }]);
                    setGeneratedConfig('');
                    setShowPreview(false);
                    setExpandedRuleId(defaultRuleId);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load servers, domains, or configuration.',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [toast, isNew, configId]);

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

    const addPathRule = (initialPath: string | any = '') => {
        const newRule: PathRule = {
            id: `rule-${Date.now()}`,
            path: typeof initialPath === 'string' ? initialPath : '',
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
        };
        setPathRules([...pathRules, newRule]);
        setExpandedRuleId(newRule.id);
    };

    const removePathRule = (id: string) => {
        // Prevent removing the first rule (default rule)
        const ruleIndex = pathRules.findIndex(r => r.id === id);
        if (ruleIndex === 0) return;

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
            const configData = {
                serverIp: selectedServerIp,
                domainId: domainMode === 'domain' ? selectedDomainId || undefined : undefined,
                domainName: domainMode === 'domain' ? selectedDomainName || undefined : undefined,
                pathRules,
            };

            // Save/Update webservices collection
            let webserviceResult;

            if (isNew) {
                webserviceResult = await saveWebServiceConfig(
                    'nginx',
                    configData,
                    'current-user', // TODO: Get actual username from auth
                    selectedServerId,
                    selectedServerName,
                    configName || undefined
                );
            } else {
                // Strip @ from ID if present (drafts)
                const cleanId = configId!.startsWith('@') ? configId!.substring(1) : configId!;
                webserviceResult = await updateWebServiceConfig(
                    cleanId,
                    configData,
                    configName || undefined
                );
            }

            if (webserviceResult.success) {
                toast({
                    title: 'Success',
                    description: 'Nginx configuration saved successfully.',
                });

                // If it was a new config, update the URL to the new ID with @ prefix
                if (isNew && (webserviceResult as any).id) {
                    router.replace(`/webservices/nginx/@${(webserviceResult as any).id}`);
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to save configuration.',
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

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) {
            return;
        }

        if (!configId) return;

        setDeleting(true);
        try {
            // Strip @ for deletion
            const cleanId = configId.startsWith('@') ? configId.substring(1) : configId;
            const result = await deleteWebServiceConfig(cleanId);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Configuration deleted successfully.',
                });
                router.push('/webservices/nginx');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.message || 'Failed to delete configuration.',
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete configuration.',
            });
        } finally {
            setDeleting(false);
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
            const result = await deployNginxConfig(selectedServerId, generatedConfig, configName);

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
        <div className="mr-auto w-full max-w-4xl space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <PageTitleBack
                    title="Nginx Configuration"
                    description="Configure your Nginx server step by step"
                    backHref="/webservices/nginx"
                />
            </div>

            {/* Step 1: Server Selection */}
            <div className="space-y-4">
                <div className="px-1">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            1
                        </div>
                        Select Server
                    </h3>
                    <p className="text-sm text-muted-foreground ml-10">
                        Choose the server where Nginx is running
                    </p>
                </div>
                <div className="space-y-2 ml-10">
                    <Label htmlFor="server-select">Server</Label>
                    <Select
                        value={selectedServerId || ''}
                        onValueChange={handleServerSelect}
                        disabled={true} // Always disabled as per user request
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
                    {selectedServerIp && (
                        <p className="text-sm text-muted-foreground">
                            Public IP: <span className="font-mono font-medium text-foreground">{selectedServerIp}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Step 2: Domain Configuration - Only show if server is selected */}
            {selectedServerId && (
                <div className="space-y-4">
                    <div className="px-1">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                2
                            </div>
                            Domain Configuration
                        </h3>
                        <p className="text-sm text-muted-foreground ml-10">
                            Configure domain or use IP address
                        </p>
                    </div>
                    <div className="space-y-4 ml-10">
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
                </div>
            )}

            {/* Step 3: Path Routing Rules - Show if Step 2 is complete */}
            {selectedServerId && (domainMode === 'none' || (domainMode === 'domain' && selectedDomainId)) && (
                <div className="space-y-6 pt-6">
                    <div className="px-1">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                3
                            </div>
                            Path Routing Rules
                        </h3>
                        <p className="text-sm text-muted-foreground ml-10">
                            Define which paths point to which server and port
                        </p>
                    </div>
                    <div className="space-y-6">
                        {pathRules.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                                <p className="text-sm font-medium mb-2">No Rules Defined</p>
                                <p className="text-xs text-muted-foreground mb-4">Start by adding a default rule for the root path.</p>
                                <Button onClick={() => addPathRule('/')} variant="default" size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Default Rule
                                </Button>
                            </div>
                        )}

                        {pathRules.map((rule, index) => {
                            const isDefault = index === 0; // First card is always default
                            const ruleNumber = index; // 0 for default, 1, 2, 3... for others

                            const baseUrl = domainMode === 'domain' && selectedDomainName
                                ? `http://${selectedDomainName}`
                                : `http://${selectedServerIp || 'ip.ip.ip.ip'}`;
                            const ruleUrl = `${baseUrl}${isDefault ? '/' : rule.path}`;

                            return (
                                <div key={rule.id} className="space-y-4">
                                    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ml-10 overflow-hidden ${isDefault ? 'border-primary/30 bg-primary/5' : ''}`}>
                                        <div
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                                            onClick={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Badge variant={isDefault ? "default" : "outline"}>
                                                    {isDefault ? "Default Rule" : `Rule ${ruleNumber}`}
                                                </Badge>
                                                {rule.action === 'return-404' && (
                                                    <Badge variant="secondary">404</Badge>
                                                )}
                                                {rule.action === 'proxy' && (
                                                    <Badge variant="default">Proxy</Badge>
                                                )}
                                                <span className="text-sm text-muted-foreground">
                                                    {rule.path || '/'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isDefault && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removePathRule(rule.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedRuleId === rule.id ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {expandedRuleId === rule.id && (
                                            <div className="space-y-4 p-4 pt-0 animate-in slide-in-from-top-2 duration-600">
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
                                                        disabled={isDefault}
                                                        placeholder="/app"
                                                        className={isDefault ? "bg-muted font-mono" : "font-mono"}
                                                    />
                                                    {isDefault && <p className="text-xs text-muted-foreground">The root path is fixed for the default rule.</p>}
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


                                                        {/* Advanced Proxy Settings */}
                                                        <div className="space-y-3 pt-4">
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

                                                <div className="bg-muted/50 p-3 rounded-md text-sm mt-4">
                                                    <p className="text-muted-foreground">
                                                        <strong>Route:</strong> {ruleUrl} → {
                                                            rule.action === 'return-404'
                                                                ? '404 Not Found'
                                                                : (
                                                                    rule.proxyTarget === 'local-port'
                                                                        ? `localhost:${rule.localPort}`
                                                                        : `${rule.serverIp || 'N/A'}:${rule.port || '3000'}`
                                                                )
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}


                        {/* Add Path Rule Card */}
                        <div
                            onClick={() => addPathRule()}
                            className="rounded-lg border-2 border-dashed bg-card text-card-foreground shadow-sm ml-10 p-6 cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex flex-col items-center justify-center gap-2">
                                <div className="rounded-full bg-primary/10 p-3">
                                    <Plus className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-sm font-medium">Add Path Rule</p>
                                <p className="text-xs text-muted-foreground text-center">
                                    Add a new routing rule for a specific path
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Step 4: Generate Configuration - Show if rules exist */}
            {selectedServerId && (domainMode === 'none' || (domainMode === 'domain' && selectedDomainId)) && pathRules.length > 0 && (
                <div className="space-y-4">
                    <div className="px-1">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                4
                            </div>
                            Generate Configuration
                        </h3>
                        <p className="text-sm text-muted-foreground ml-10">
                            Preview the Nginx configuration file
                        </p>
                    </div>
                    <div className="space-y-4 ml-10">
                        <Button
                            onClick={handleGeneratePreview}
                            disabled={generating || saving}
                            className="min-w-[240px]"
                        >
                            {generating || saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {generating ? 'Generating...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    <FileCode className="mr-2 h-4 w-4" />
                                    Generate Configurations
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
                    </div>
                </div>
            )}

            {/* Step 5: Deploy - Only show if config is generated */}
            {
                selectedServerId && showPreview && generatedConfig && (
                    <div className="space-y-4">
                        <div className="px-1">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    5
                                </div>
                                Deploy Configuration
                            </h3>
                            <p className="text-sm text-muted-foreground ml-10">
                                Deploy the configuration to your Nginx server
                            </p>
                        </div>
                        <div className="space-y-4 ml-10">
                            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    <strong>Warning:</strong> This will overwrite your current Nginx configuration and reload the server.
                                </p>
                            </div>

                            <Button
                                onClick={handleDeploy}
                                disabled={deploying || saving || deleting}
                                className="min-w-[240px]"
                            >
                                {deploying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deploying...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="mr-2 h-4 w-4" />
                                        Deploy Configuration
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Step 0: Configuration Management */}
            <div className="space-y-4 pt-8">
                <div className="px-1">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-bold border">
                            0
                        </div>
                        Save & Management
                    </h3>
                    <p className="text-sm text-muted-foreground ml-10">
                        Save your configuration draft for later use
                    </p>
                </div>

                <div className="space-y-2 ml-10 mb-4">
                    <Label>Configuration Name {isNew && <span className="text-destructive">*</span>}</Label>
                    {isNew ? (
                        <>
                            <Input
                                id="config-name"
                                value={configName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^[a-z0-9]*$/.test(value)) {
                                        setConfigName(value);
                                    }
                                }}
                                placeholder="myconfig01"
                                className="max-w-[400px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                Only lowercase letters and numbers allowed (a-z, 0-9). No spaces or special characters.
                            </p>
                        </>
                    ) : (
                        <p className="font-mono text-sm font-medium">
                            {configName}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 ml-10">
                    <Button
                        onClick={handleSave}
                        disabled={saving || deleting || deploying || !selectedServerId || !configName}
                        className="min-w-[240px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Settings
                            </>
                        )}
                    </Button>

                    {!isNew && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting || saving || deploying}
                            className="min-w-[240px]"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Configuration
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div >
    );
}
