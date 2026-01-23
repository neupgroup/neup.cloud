'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getServers } from '@/app/servers/actions';
import { getDomains, type ManagedDomain } from '@/app/domains/actions';
import {
    getServerPublicIp,
    generateNginxConfigFromContext,
    deployNginxConfig,
    deleteNginxConfig,
    generateSslCertificate,
    saveNginxConfiguration,
} from '@/app/webservices/nginx/actions';
import { getWebOrServerNginxConfig } from '@/app/webservices/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    Plus,
    Trash2,
    FileCode,
    Rocket,
    X,
    ChevronDown,
    Lock,
    Shield,
    ShieldAlert,
    RefreshCw,
    Globe,
    ArrowRight
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

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
    action: 'proxy' | 'return-404' | 'redirect-301' | 'redirect-302' | 'redirect-307' | 'redirect-308';
    proxyTarget?: 'remote-server' | 'local-port';
    serverId?: string;
    serverName?: string;
    serverIp?: string;
    port?: string;
    localPort?: string;
    proxySettings?: ProxySettings;
    redirectTarget?: string;
    passParameters?: boolean;
}

interface DomainRedirect {
    id: string;
    subdomain: string;
    domainId: string;
    domainName: string;
    redirectTarget: string;
}

interface DomainBlock {
    id: string;
    domainId: string;
    domainName: string;
    subdomain: string;
    httpsRedirection: boolean;
    sslEnabled: boolean;
    pathRules: PathRule[];
}

interface NginxConfiguration {
    serverIp: string;
    configName: string;
    blocks: DomainBlock[];
    domainRedirects: DomainRedirect[];
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
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedServerName, setSelectedServerName] = useState<string>('');
    const [selectedServerIp, setSelectedServerIp] = useState<string>('');
    const [fetchingIp, setFetchingIp] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [configName, setConfigName] = useState<string>('');

    const [servers, setServers] = useState<ServerOption[]>([]);
    const [domains, setDomains] = useState<DomainOption[]>([]);
    const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
    const [selectedDomainName, setSelectedDomainName] = useState<string>('');
    const [domainMode, setDomainMode] = useState<DomainMode>('domain');
    const [domainBlocks, setDomainBlocks] = useState<DomainBlock[]>([]);
    const [generatingCert, setGeneratingCert] = useState<string | null>(null); // Stores blockId being generated
    const [domainRedirects, setDomainRedirects] = useState<DomainRedirect[]>([]);
    const [generatedConfig, setGeneratedConfig] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

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

                // Pre-select server logic
                let targetServerId = searchParams.get('serverId');

                if (!targetServerId) {
                    // Check cookie if not in URL
                    const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                    };
                    targetServerId = getCookie('selected_server') || null;
                }

                if (!targetServerId && serverOptions.length === 1) {
                    // Auto-select if only one server exists
                    targetServerId = serverOptions[0].id;
                }

                if (targetServerId) {
                    const targetServer = serverOptions.find((s: any) => s.id === targetServerId);
                    if (targetServer) {
                        setSelectedServerId(targetServer.id);
                        setSelectedServerName(targetServer.name);
                        setSelectedServerIp(targetServer.publicIp);
                    }
                } else {
                    setSelectedServerId(null);
                    setSelectedServerName('');
                    setSelectedServerIp('');
                }

                // Reset other states for new configuration
                // Reset blocks for new configuration
                setConfigName(configId || '');
                setDomainBlocks([]);
                setGeneratedConfig('');
                setShowPreview(false);
                setExpandedRuleId(null);
                setDomainRedirects([]);
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
    }, [toast, configId]);

    // Load existing configuration
    useEffect(() => {
        const loadConfig = async () => {
            // Case 1: Editing a specific configuration (by ID)
            if (configId && configId !== 'new') {
                try {
                    setLoading(true);
                    const config = await getWebOrServerNginxConfig(configId);

                    if (config) {
                        // Set Server
                        if (config.serverId) {
                            setSelectedServerId(config.serverId);
                            setSelectedServerName(config.serverName || '');
                            // We don't have IP directly in config always, but we can try to find it in servers list if loaded
                            const server = servers.find(s => s.id === config.serverId);
                            if (server) setSelectedServerIp(server.publicIp);
                        }

                        // Set Basic Info
                        setConfigName(config.name || configId);

                        // Parse Value into Blocks
                        // The generic config value has { domainName, subdomain, pathRules, ... }
                        // We need to map this to our DomainBlock[] structure
                        if (config.value) {
                            const val = config.value;

                            // Determine mode
                            if (val.domainId === 'manual-domain' || !val.domainId) {
                                setDomainMode('none');
                                // But if it has a domain name, we treat it as 'none' (IP/Manual) but with that name
                            } else {
                                setDomainMode('domain');
                                setSelectedDomainId(val.domainId);
                                setSelectedDomainName(val.domainName || '');
                            }

                            const block: DomainBlock = {
                                id: `block-${Date.now()}`,
                                domainId: val.domainId || '',
                                domainName: val.domainName || '',
                                subdomain: val.subdomain || '@',
                                httpsRedirection: true, // Default for imported
                                sslEnabled: false, // Default for imported
                                pathRules: (val.pathRules || []).map((r: any) => ({
                                    ...r,
                                    id: r.id || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    proxySettings: r.proxySettings || {
                                        setHost: true,
                                        setRealIp: true,
                                        setForwardedFor: true,
                                        setForwardedProto: true,
                                        upgradeWebSocket: true,
                                        customHeaders: []
                                    }
                                }))
                            };

                            setDomainBlocks([block]);
                        }

                        toast({
                            title: 'Configuration Loaded',
                            description: `Loaded configuration: ${config.name || configId}`,
                        });
                    }
                } catch (error) {
                    console.error('Failed to load configuration:', error);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Failed to load configuration.',
                    });
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Case 2: Creating new or Legacy loading (if server selected manually and no ID)
            // We skip the legacy getNginxConfiguration(selectedServerId) here because 
            // the new flow prefers explicit IDs. 
            // However, if the user navigates to /create and selects a server, we start clean.
        };

        if (servers.length > 0) {
            loadConfig();
        }
    }, [configId, servers, toast]);

    // Automatically create the initial '@' block when step 3 conditions are met
    useEffect(() => {
        if (selectedServerId && configName && (domainMode === 'none' || selectedDomainId)) {
            if (domainBlocks.length === 0) {
                const rootBlock: DomainBlock = {
                    id: `block-root-${Date.now()}`,
                    domainId: selectedDomainId || '',
                    domainName: selectedDomainName || '',
                    subdomain: '@',
                    httpsRedirection: true,
                    sslEnabled: false,
                    pathRules: [
                        {
                            id: `rule-root-default-${Date.now()}`,
                            path: '/',
                            action: 'proxy',
                            proxyTarget: 'local-port',
                            localPort: '3000',
                            proxySettings: {
                                setHost: true,
                                setRealIp: true,
                                setForwardedFor: true,
                                setForwardedProto: true,
                                upgradeWebSocket: true,
                                customHeaders: []
                            }
                        }
                    ],
                };
                setDomainBlocks([rootBlock]);
            }
        }
    }, [selectedServerId, configName, selectedDomainId, domainMode, domainBlocks.length, selectedDomainName]);

    const handleServerSelect = async (serverId: string) => {
        const server = servers.find(s => s.id === serverId);
        if (!server) return;

        setSelectedServerId(serverId);
        setSelectedServerName(server.name);
        setSelectedServerIp(server.publicIp);
    };

    const addDomainBlock = () => {
        const newBlock: DomainBlock = {
            id: `block-${Date.now()}`,
            domainId: selectedDomainId || '',
            domainName: selectedDomainName || '',
            subdomain: '',
            httpsRedirection: true,
            sslEnabled: false,
            pathRules: [
                {
                    id: `rule-default-${Date.now()}`,
                    path: '/',
                    action: 'proxy',
                    proxyTarget: 'local-port',
                    localPort: '3000',
                    proxySettings: {
                        setHost: true,
                        setRealIp: true,
                        setForwardedFor: true,
                        setForwardedProto: true,
                        upgradeWebSocket: true,
                        customHeaders: []
                    }
                }
            ],
        };
        setDomainBlocks([...domainBlocks, newBlock]);
    };

    const removeDomainBlock = (id: string) => {
        const block = domainBlocks.find(b => b.id === id);
        if (block?.subdomain === '@') return; // Don't allow deleting root block
        setDomainBlocks(domainBlocks.filter(b => b.id !== id));
    };

    const updateDomainBlock = (id: string, field: keyof DomainBlock, value: any) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === id) {
                if (field === 'domainId') {
                    const domain = domains.find(d => d.id === value);
                    return { ...b, domainId: value, domainName: domain?.name || '' };
                }
                return { ...b, [field]: value };
            }
            return b;
        }));
    };

    const handleDomainSelect = (domainId: string) => {
        const domain = domains.find(d => d.id === domainId);
        if (domain) {
            setSelectedDomainId(domainId);
            setSelectedDomainName(domain.name);
            setDomainMode('domain');

            // If we already have blocks, update their domain info
            setDomainBlocks(domainBlocks.map(b => ({
                ...b,
                domainId: domainId,
                domainName: domain.name
            })));
        }
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

    const addPathRule = (blockId: string) => {
        const newRule: PathRule = {
            id: `rule-${Date.now()}`,
            path: '',
            action: 'proxy',
            proxyTarget: 'local-port',
            localPort: '3000',
            proxySettings: {
                setHost: true,
                setRealIp: true,
                setForwardedFor: true,
                setForwardedProto: true,
                upgradeWebSocket: true,
                customHeaders: []
            }
        };

        setDomainBlocks(domainBlocks.map(b =>
            b.id === blockId ? { ...b, pathRules: [...b.pathRules, newRule] } : b
        ));
        setExpandedRuleId(newRule.id);
    };

    const removePathRule = (blockId: string, ruleId: string) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === blockId) {
                const ruleIndex = b.pathRules.findIndex(r => r.id === ruleId);
                if (ruleIndex === 0) return b; // Don't allow deleting the first path rule
                return { ...b, pathRules: b.pathRules.filter(r => r.id !== ruleId) };
            }
            return b;
        }));
    };

    const updatePathRule = (blockId: string, ruleId: string, field: keyof PathRule, value: any) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === blockId) {
                const updatedRules = b.pathRules.map(rule => {
                    if (rule.id === ruleId) {
                        const updated = { ...rule, [field]: value };
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
                });
                return { ...b, pathRules: updatedRules };
            }
            return b;
        }));
    };

    const updateProxySetting = (blockId: string, ruleId: string, field: keyof ProxySettings, value: any) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === blockId) {
                const updatedRules = b.pathRules.map(rule => {
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
                });
                return { ...b, pathRules: updatedRules };
            }
            return b;
        }));
    };

    const addCustomHeader = (blockId: string, ruleId: string) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === blockId) {
                const updatedRules = b.pathRules.map(rule => {
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
                });
                return { ...b, pathRules: updatedRules };
            }
            return b;
        }));
    };

    const removeCustomHeader = (blockId: string, ruleId: string, headerId: string) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === blockId) {
                const updatedRules = b.pathRules.map(rule => {
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
                });
                return { ...b, pathRules: updatedRules };
            }
            return b;
        }));
    };

    const updateCustomHeader = (blockId: string, ruleId: string, headerId: string, field: 'key' | 'value', value: string) => {
        setDomainBlocks(domainBlocks.map(b => {
            if (b.id === blockId) {
                const updatedRules = b.pathRules.map(rule => {
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
                });
                return { ...b, pathRules: updatedRules };
            }
            return b;
        }));
    };

    const addDomainRedirect = (blockId?: string) => {
        // Find a domain to use for the redirect, or use the first block's domain
        const block = blockId ? domainBlocks.find(b => b.id === blockId) : domainBlocks[0];

        if (!block || !block.domainId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a domain in at least one block first.',
            });
            return;
        }

        const newRedirect: DomainRedirect = {
            id: `redir-${Date.now()}`,
            subdomain: '',
            domainId: block.domainId,
            domainName: block.domainName,
            redirectTarget: '',
        };
        setDomainRedirects([...domainRedirects, newRedirect]);
    };

    const removeDomainRedirect = (id: string) => {
        setDomainRedirects(domainRedirects.filter(r => r.id !== id));
    };

    const updateDomainRedirect = (id: string, field: keyof DomainRedirect, value: string) => {
        setDomainRedirects(domainRedirects.map(r =>
            r.id === id ? { ...r, [field]: value } : r
        ));
    };

    const handleGeneratePreview = async () => {
        if (!selectedServerId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a server first.',
            });
            return;
        }

        if (!configName) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please provide a configuration name in Step 1.',
            });
            return;
        }

        if (domainBlocks.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please add at least one domain block.',
            });
            return;
        }

        // Validate blocks
        for (const block of domainBlocks) {
            if (domainMode === 'domain' && !block.domainId) {
                toast({
                    variant: 'destructive',
                    title: 'Validation Error',
                    description: 'Each block must have a domain selected.',
                });
                return;
            }

            for (const rule of block.pathRules) {
                if (!rule.path) {
                    toast({
                        variant: 'destructive',
                        title: 'Validation Error',
                        description: `All path rules in block for ${block.domainName} must have a path defined.`,
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
                }
            }
        }

        // Validate domain redirects
        for (const redirect of domainRedirects) {
            if (!redirect.redirectTarget) {
                toast({
                    variant: 'destructive',
                    title: 'Validation Error',
                    description: `Subdomain redirect for ${redirect.subdomain || 'root'}.${redirect.domainName} must have a target URL.`,
                });
                return;
            }
            if (!redirect.redirectTarget.startsWith('http://') && !redirect.redirectTarget.startsWith('https://')) {
                toast({
                    variant: 'destructive',
                    title: 'Validation Error',
                    description: `Redirect target "${redirect.redirectTarget}" must include a protocol (http:// or https://).`,
                });
                return;
            }
        }

        // Generate config
        setGenerating(true);
        try {
            const currentConfig = {
                serverIp: selectedServerIp,
                configName: configName,
                blocks: domainBlocks,
                domainRedirects: domainRedirects,
            };

            const result = await generateNginxConfigFromContext(currentConfig);

            if (result.success && result.config) {
                setGeneratedConfig(result.config);
                setShowPreview(true);
                toast({
                    title: 'Configuration Generated',
                    description: 'Nginx configuration generated successfully.',
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

    const handleGenerateCertificate = async (blockId: string) => {
        const block = domainBlocks.find(b => b.id === blockId);
        if (!selectedServerId || !block || !block.domainName) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a server and domain first.',
            });
            return;
        }

        if (!configName) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please enter a Configuration Name in Step 1 before generating a certificate.',
            });
            return;
        }

        let domainsForCert: string[] = [];

        if (block.subdomain === '@') {
            // Root domain: include base and wildcard as per user preference
            domainsForCert = [block.domainName, `*.${block.domainName}`];
        } else if (block.subdomain === '#') {
            // Catch-all wildcard
            domainsForCert = [`*.${block.domainName}`];
        } else if (block.subdomain) {
            // Specific subdomain
            domainsForCert = [`${block.subdomain}.${block.domainName}`];
        } else {
            // Fallback (should be root)
            domainsForCert = [block.domainName];
        }

        setGeneratingCert(blockId);
        try {
            const result = await generateSslCertificate(
                selectedServerId,
                domainsForCert,
                configName
            );

            if (result.success) {
                toast({
                    title: 'Certificate Success',
                    description: result.message,
                });
                updateDomainBlock(blockId, 'sslEnabled', true);
                updateDomainBlock(blockId, 'httpsRedirection', true);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Certificate Error',
                    description: result.error,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to generate certificate.',
            });
        } finally {
            setGeneratingCert(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) {
            return;
        }

        if (!configId) return;

        setDeleting(true);
        try {
            // Delete from server (sites-available and sites-enabled)
            if (!selectedServerId) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Server ID not found.',
                });
                return;
            }

            const result = await deleteNginxConfig(selectedServerId, configName);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message || 'Configuration deleted from server successfully.',
                });
                router.push('/webservices/nginx');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to delete configuration from server.',
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
            // Save configuration to Firestore first
            const configToSave: NginxConfiguration = {
                serverIp: selectedServerIp,
                configName: configName,
                blocks: domainBlocks,
                domainRedirects: domainRedirects,
            };
            await saveNginxConfiguration(selectedServerId, configToSave);

            const result = await deployNginxConfig(selectedServerId, generatedConfig, configName);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Nginx configuration saved, deployed, and reloaded successfully.',
                });
            } else {
                // Check for SSL certificate errors
                const isSslError = result.error && (
                    result.error.includes('cannot load certificate') ||
                    result.error.includes('No such file or directory') ||
                    result.error.includes('BIO_new_file')
                );

                toast({
                    variant: 'destructive',
                    title: 'Deployment Failed',
                    description: isSslError
                        ? 'SSL Certificate missing! Please click the "Generate/Update SSL Certificate" button in Step 2 before deploying.'
                        : (result.error || 'Failed to deploy configuration.'),
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
            <div className="mr-auto w-full max-w-4xl space-y-12 animate-in fade-in duration-500 pb-20">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>

                {/* Step 1: Server Selection Skeleton */}
                <div className="space-y-4">
                    <div className="px-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                        <Skeleton className="h-4 w-64 ml-10" />
                    </div>
                    <div className="space-y-2 ml-10">
                        <Skeleton className="h-4 w-16 mb-2" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>

                {/* Step 2: Domain Configuration Skeleton */}
                <div className="space-y-4">
                    <div className="px-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-48" />
                        </div>
                        <Skeleton className="h-4 w-72 ml-10" />
                    </div>
                    <div className="space-y-4 ml-10">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                </div>

                {/* Step 3: Path Routing Rules Skeleton */}
                <div className="space-y-6 pt-6">
                    <div className="px-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-40" />
                        </div>
                        <Skeleton className="h-4 w-80 ml-10" />
                    </div>
                    <div className="space-y-6">
                        {[1, 2].map((i) => (
                            <Card key={i} className="rounded-lg border bg-card shadow-sm ml-10 overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Skeleton className="h-5 w-24" />
                                        <Skeleton className="h-5 w-16" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <Skeleton className="h-4 w-16 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div>
                                            <Skeleton className="h-4 w-20 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div>
                                            <Skeleton className="h-4 w-24 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-24" />
                </div>
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
                                    {server.name} ({server.publicIp})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="space-y-2 mt-6">
                        <Label htmlFor="config-name">Configuration Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="config-name"
                            value={configName}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-z0-9.]*$/.test(value)) {
                                    setConfigName(value);
                                }
                            }}
                            placeholder="e.g., example.com"
                            className="max-w-[400px]"
                            disabled={!!configId}
                        />
                        <p className="text-xs text-muted-foreground">
                            Used as the filename on the server. Lowercase letters, numbers, and dots only.
                        </p>
                    </div>
                </div>
            </div>

            {/* Step 2: Configuration Mode */}
            {selectedServerId && configName && (
                <div className="space-y-6 pt-6">
                    <div className="px-1">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                2
                            </div>
                            Configuration Mode
                        </h3>
                        <p className="text-sm text-muted-foreground ml-10">
                            Choose how you want to route traffic to this server
                        </p>
                    </div>

                    <div className="ml-10 space-y-6">
                        <RadioGroup
                            value={domainMode}
                            onValueChange={(v) => {
                                setDomainMode(v as DomainMode);
                                if (v === 'none') {
                                    setSelectedDomainId(null);
                                    setSelectedDomainName('');
                                    // Update existing blocks to be IP-based
                                    setDomainBlocks(domainBlocks.map(b => ({ ...b, domainId: '', domainName: '' })));
                                }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl"
                        >
                            <div
                                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${domainMode === 'domain' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}
                                onClick={() => setDomainMode('domain')}
                            >
                                <RadioGroupItem value="domain" id="mode-domain" className="mt-1" />
                                <div className="space-y-1">
                                    <Label htmlFor="mode-domain" className="font-bold cursor-pointer">Managed Domain</Label>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">Map subdomains of a verified domain to your server.</p>
                                </div>
                            </div>

                            <div
                                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${domainMode === 'none' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}
                                onClick={() => {
                                    setDomainMode('none');
                                    setSelectedDomainId(null);
                                    setSelectedDomainName('');
                                    setDomainBlocks(domainBlocks.map(b => ({ ...b, domainId: '', domainName: '' })));
                                }}
                            >
                                <RadioGroupItem value="none" id="mode-ip" className="mt-1" />
                                <div className="space-y-1">
                                    <Label htmlFor="mode-ip" className="font-bold cursor-pointer">IP Address Only</Label>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">Direct IP routing without using a domain name.</p>
                                </div>
                            </div>
                        </RadioGroup>

                        {domainMode === 'domain' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 max-w-[400px]">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Base Domain</Label>
                                <Select value={selectedDomainId || ''} onValueChange={handleDomainSelect}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Choose a domain..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Manage Subdomain Blocks */}
            {selectedServerId && configName && (domainMode === 'none' || selectedDomainId) && (
                <div className="space-y-6 pt-6">
                    <div className="px-1 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    3
                                </div>
                                Domains & Paths Block
                            </h3>
                            <p className="text-sm text-muted-foreground ml-10">
                                {domainMode === 'domain'
                                    ? `Create individualized server blocks for subdomains of ${selectedDomainName}`
                                    : "Create server blocks for this IP-based configuration"}
                            </p>
                        </div>
                    </div>

                    {domainMode === 'domain' && (
                        <div className="ml-10 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                <span className="font-bold">Subdomain patterns:</span> Use <code className="px-1.5 py-0.5 bg-blue-500/20 rounded font-mono">@</code> for root domain,
                                <code className="px-1.5 py-0.5 bg-blue-500/20 rounded font-mono mx-1">yourname</code> for specific subdomain,
                                or <code className="px-1.5 py-0.5 bg-blue-500/20 rounded font-mono">#</code> for catch-all wildcard (matches all other subdomains)
                            </p>
                        </div>
                    )}

                    <div className="space-y-8 ml-10">
                        {domainBlocks.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10">
                                <Plus className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                                <h4 className="text-base font-semibold mb-2">No Blocks Added</h4>
                                <p className="text-sm text-muted-foreground mb-6">Start by adding your first {domainMode === 'domain' ? 'subdomain' : 'server'} block.</p>
                                <Button onClick={() => addDomainBlock()} variant="secondary">
                                    <Plus className="h-4 w-4 mr-2" /> Create First Block
                                </Button>
                            </div>
                        )}

                        {domainBlocks.map((block, bIndex) => (
                            <div key={block.id} className="space-y-1 mb-8">
                                {/* Subdomain Header Bar */}
                                <div className="flex items-center justify-between bg-zinc-200 dark:bg-zinc-800 rounded-lg px-4 py-3 shadow-sm border border-border/50">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-background/50 px-2 py-0.5 rounded shadow-inner">
                                            #{bIndex + 1}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {domainMode === 'domain' ? 'subdomain:' : 'block identifier:'}
                                            </span>
                                            <Input
                                                value={block.subdomain}
                                                onChange={(e) => {
                                                    const val = e.target.value.toLowerCase();
                                                    updateDomainBlock(block.id, 'subdomain', val);
                                                }}
                                                disabled={block.subdomain === '@'}
                                                placeholder={domainMode === 'domain' ? '@' : 'default'}
                                                className="h-7 w-32 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 font-bold text-sm"
                                            />
                                            {domainMode === 'domain' && (
                                                <span className="text-xs text-muted-foreground font-medium opacity-70">
                                                    {block.subdomain === '@' && `.${selectedDomainName}`}
                                                    {block.subdomain !== '@' && block.subdomain !== '#' && `.${selectedDomainName}`}
                                                    {block.subdomain === '#' && `.${selectedDomainName}`}
                                                </span>
                                            )}
                                            {domainMode === 'domain' && block.subdomain === '#' && (
                                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                                    Catch-All Wildcard
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {block.subdomain !== '@' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                                onClick={() => removeDomainBlock(block.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-full bg-background/50 hover:bg-background"
                                            onClick={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                                        >
                                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedBlockId === block.id ? 'rotate-180' : ''}`} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Shared SSL/Domain Settings (Collapsible) */}
                                {expandedBlockId === block.id && (
                                    <div className="mx-4 p-4 bg-muted/20 border-x border-b rounded-b-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold flex items-center gap-2">
                                                        <Lock className="h-3 w-3" /> SSL Support
                                                    </Label>
                                                    <Switch
                                                        checked={block.sslEnabled}
                                                        onCheckedChange={(v) => updateDomainBlock(block.id, 'sslEnabled', v)}
                                                        disabled={domainMode === 'none'}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold flex items-center gap-2">
                                                        <ArrowRight className="h-3 w-3" /> Force HTTPS
                                                    </Label>
                                                    <Switch
                                                        checked={block.httpsRedirection}
                                                        onCheckedChange={(v) => updateDomainBlock(block.id, 'httpsRedirection', v)}
                                                        disabled={!block.sslEnabled || domainMode === 'none'}
                                                    />
                                                </div>
                                                {domainMode === 'none' && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                        SSL generation requires a domain name.
                                                    </p>
                                                )}
                                            </div>
                                            {domainMode === 'domain' && (
                                                <div className="flex items-end">
                                                    {block.subdomain === '@' ? (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="w-full text-[11px] h-8 font-bold uppercase tracking-wider"
                                                            disabled={!!generatingCert && generatingCert === block.id}
                                                            onClick={() => handleGenerateCertificate(block.id)}
                                                        >
                                                            {generatingCert === block.id ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                                                            {generatingCert === block.id ? 'Working...' : 'Get Certificate'}
                                                        </Button>
                                                    ) : (
                                                        <div className="w-full p-2 bg-blue-500/10 border border-blue-500/20 rounded text-center">
                                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                                Uses certificate from root domain
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Path Rule Bars */}
                                <div className="space-y-2 mt-4 ml-6">
                                    {block.pathRules.map((rule, rIdx) => (
                                        <div key={rule.id} className="relative group">
                                            <div
                                                onClick={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
                                                className={`flex items-center justify-between bg-background border rounded-lg px-4 py-3 cursor-pointer transition-all hover:border-primary/50 ${expandedRuleId === rule.id ? 'border-primary shadow-sm' : 'border-border'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Path:</span>
                                                        <span className="text-sm font-bold font-mono text-foreground">{rule.path || '/'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="text-[10px] font-mono h-6 px-2">
                                                        {rule.action === 'proxy' ? (rule.proxyTarget === 'local-port' ? `→ :${rule.localPort}` : '→ Remote') : rule.action}
                                                    </Badge>
                                                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedRuleId === rule.id ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {/* Rule Content */}
                                            {expandedRuleId === rule.id && (
                                                <div className="mt-2 p-6 bg-muted/30 border rounded-lg animate-in slide-in-from-top-1 duration-200">
                                                    <div className="space-y-4">
                                                        {/* Location Path */}
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Location Path</Label>
                                                            <Input
                                                                value={rule.path}
                                                                onChange={(e) => updatePathRule(block.id, rule.id, 'path', e.target.value)}
                                                                disabled={rIdx === 0}
                                                                placeholder="/"
                                                                className="h-9 font-mono bg-background"
                                                            />
                                                        </div>

                                                        {/* Primary Action */}
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Action</Label>
                                                            <Select value={rule.action} onValueChange={(v) => updatePathRule(block.id, rule.id, 'action', v as any)}>
                                                                <SelectTrigger className="h-9 bg-background">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="proxy">Proxy Request</SelectItem>
                                                                    <SelectItem value="redirect-301">301 Permanent Redirect</SelectItem>
                                                                    <SelectItem value="redirect-302">302 Temporary Redirect</SelectItem>
                                                                    <SelectItem value="return-404">Return 404 Not Found</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Proxy Configuration */}
                                                        {rule.action === 'proxy' && (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Proxy Destination</Label>
                                                                    <Select value={rule.proxyTarget} onValueChange={(v) => updatePathRule(block.id, rule.id, 'proxyTarget', v)}>
                                                                        <SelectTrigger className="h-9 bg-background">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="local-port">Local Port (This Machine)</SelectItem>
                                                                            <SelectItem value="remote-server">Remote Web Server</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                                        {rule.proxyTarget === 'local-port' ? 'Service Port' : 'Target Server'}
                                                                    </Label>
                                                                    {rule.proxyTarget === 'local-port' ? (
                                                                        <Input
                                                                            value={rule.localPort}
                                                                            onChange={(e) => updatePathRule(block.id, rule.id, 'localPort', e.target.value)}
                                                                            placeholder="3000"
                                                                            className="h-9 font-mono bg-background"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex gap-2">
                                                                            <Select value={rule.serverId} onValueChange={(v) => updatePathRule(block.id, rule.id, 'serverId', v)}>
                                                                                <SelectTrigger className="h-9 bg-background flex-1">
                                                                                    <SelectValue placeholder="Select Server" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {servers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <Input
                                                                                value={rule.port}
                                                                                onChange={(e) => updatePathRule(block.id, rule.id, 'port', e.target.value)}
                                                                                placeholder="Port (e.g. 8080)"
                                                                                className="h-9 font-mono bg-background w-32"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Proxy Headers */}
                                                                <div className="pt-4 space-y-3">
                                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Proxy Headers</Label>
                                                                    <div className="flex flex-wrap gap-4">
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`set-host-${rule.id}`}
                                                                                checked={rule.proxySettings?.setHost !== false}
                                                                                onChange={(e) => updateProxySetting(block.id, rule.id, 'setHost', e.target.checked)}
                                                                                className="h-4 w-4 rounded border-gray-300"
                                                                            />
                                                                            <label htmlFor={`set-host-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                                                                Set Host
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`websockets-${rule.id}`}
                                                                                checked={rule.proxySettings?.upgradeWebSocket !== false}
                                                                                onChange={(e) => updateProxySetting(block.id, rule.id, 'upgradeWebSocket', e.target.checked)}
                                                                                className="h-4 w-4 rounded border-gray-300"
                                                                            />
                                                                            <label htmlFor={`websockets-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                                                                WebSockets
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`real-ip-${rule.id}`}
                                                                                checked={rule.proxySettings?.setRealIp !== false}
                                                                                onChange={(e) => updateProxySetting(block.id, rule.id, 'setRealIp', e.target.checked)}
                                                                                className="h-4 w-4 rounded border-gray-300"
                                                                            />
                                                                            <label htmlFor={`real-ip-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                                                                Real IP
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`forwarded-for-${rule.id}`}
                                                                                checked={rule.proxySettings?.setForwardedFor !== false}
                                                                                onChange={(e) => updateProxySetting(block.id, rule.id, 'setForwardedFor', e.target.checked)}
                                                                                className="h-4 w-4 rounded border-gray-300"
                                                                            />
                                                                            <label htmlFor={`forwarded-for-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                                                                Forwarded For
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`forwarded-proto-${rule.id}`}
                                                                                checked={rule.proxySettings?.setForwardedProto !== false}
                                                                                onChange={(e) => updateProxySetting(block.id, rule.id, 'setForwardedProto', e.target.checked)}
                                                                                className="h-4 w-4 rounded border-gray-300"
                                                                            />
                                                                            <label htmlFor={`forwarded-proto-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                                                                Forwarded Proto
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Custom Headers */}
                                                                <div className="pt-4 space-y-3">
                                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custom Headers</Label>

                                                                    {rule.proxySettings?.customHeaders && rule.proxySettings.customHeaders.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            {rule.proxySettings.customHeaders.map((header) => (
                                                                                <div key={header.id} className="flex gap-2 items-start">
                                                                                    <Input
                                                                                        placeholder="Header Name"
                                                                                        value={header.key}
                                                                                        onChange={(e) => updateCustomHeader(block.id, rule.id, header.id, 'key', e.target.value)}
                                                                                        className="h-9 bg-background flex-1"
                                                                                    />
                                                                                    <Input
                                                                                        placeholder="Header Value"
                                                                                        value={header.value}
                                                                                        onChange={(e) => updateCustomHeader(block.id, rule.id, header.id, 'value', e.target.value)}
                                                                                        className="h-9 bg-background flex-1"
                                                                                    />
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                                                                                        onClick={() => removeCustomHeader(block.id, rule.id, header.id)}
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => addCustomHeader(block.id, rule.id)}
                                                                    >
                                                                        <Plus className="h-3 w-3 mr-2" /> Add Header
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}

                                                        {rule.action.startsWith('redirect-') && (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Redirect Destination</Label>
                                                                    <Input
                                                                        value={rule.redirectTarget}
                                                                        onChange={(e) => updatePathRule(block.id, rule.id, 'redirectTarget', e.target.value)}
                                                                        placeholder="https://example.com/target"
                                                                        className="h-9 bg-background"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center space-x-2 pt-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`pass-params-${rule.id}`}
                                                                        checked={rule.passParameters !== false}
                                                                        onChange={(e) => updatePathRule(block.id, rule.id, 'passParameters', e.target.checked)}
                                                                        className="h-4 w-4 rounded border-gray-300"
                                                                    />
                                                                    <label htmlFor={`pass-params-${rule.id}`} className="text-sm font-medium cursor-pointer text-muted-foreground">
                                                                        Preserve Path & Query Parameters
                                                                    </label>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {rIdx !== 0 && (
                                                        <div className="mt-6 flex justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:bg-destructive/10 h-8"
                                                                onClick={() => removePathRule(block.id, rule.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Path Rule
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        onClick={() => addPathRule(block.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-2 h-9 border border-dashed border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all rounded-lg"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Path Rule
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button
                            onClick={() => addDomainBlock()}
                            variant="outline"
                            size="default"
                            className="w-full h-11 border-2 border-dashed border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all rounded-lg font-semibold"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add {domainMode === 'domain' ? 'Subdomain' : 'Server'} Block
                        </Button>

                    </div>
                </div>
            )
            }

            {/* Step 4: Generate Configuration */}
            {
                selectedServerId && configName && (domainBlocks.length > 0) && (
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
                                disabled={generating}
                                className="min-w-[240px]"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
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
                )
            }

            {/* Step 5: Deploy - Only show if config is generated */}
            {
                selectedServerId && configName && showPreview && generatedConfig && (
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

                            <div className="flex gap-4">
                                <Button
                                    onClick={handleDeploy}
                                    disabled={deploying || deleting}
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

                                {configName && (
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={deleting || deploying}
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
                                                Delete from Server
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
