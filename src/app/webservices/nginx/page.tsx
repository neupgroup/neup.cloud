'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getNginxConfigurations, type WebServiceConfig } from '@/app/webservices/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCode, Calendar, User, Server, Hash, RefreshCw } from 'lucide-react';
import { PageTitleBack } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { restartNginxService } from './restart-action';
import { useToast } from '@/hooks/use-toast';

export default function NginxConfigurationsPage() {
    const [configurations, setConfigurations] = useState<WebServiceConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const { toast } = useToast();

    const handleRestart = async () => {
        setRestarting(true);
        try {
            const result = await restartNginxService();
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Nginx service restarted successfully.",
                    className: "bg-green-600 border-green-700 text-white",
                });
            } else {
                toast({
                    title: "Restart Failed",
                    description: result.error || "Failed to restart Nginx service.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setRestarting(false);
        }
    };

    useEffect(() => {
        loadConfigurations();
    }, []);

    const loadConfigurations = async () => {
        setLoading(true);
        try {
            const configs = await getNginxConfigurations();
            setConfigurations(configs);
        } catch (error) {
            console.error('Error loading configurations:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return 'N/A';
        }
    };

    if (loading) {
        return (
            <div className="mr-auto w-full max-w-4xl space-y-12 animate-in fade-in duration-500 pb-20">
                <PageTitleBack
                    title="Nginx Configurations"
                    description="Manage your Nginx server configurations"
                    backHref="/webservices"
                />
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-sm text-muted-foreground">Loading configurations...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mr-auto w-full max-w-4xl space-y-12 animate-in fade-in duration-500 pb-20">
            <PageTitleBack
                title="Nginx Configurations"
                description="Manage your Nginx server configurations"
                backHref="/webservices"
            />

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                {/* Create New Row */}
                <Link href="/webservices/nginx/new" className="block">
                    <div className={cn(
                        "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 flex items-center gap-4 text-primary",
                        configurations.length > 0 && "border-b border-border"
                    )}>
                        <div className="rounded-full bg-primary/10 p-2">
                            <Plus className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold">Create New Configuration</p>
                            <p className="text-sm text-muted-foreground">Setup a new Nginx server block</p>
                        </div>
                    </div>
                </Link>

                {/* Existing Configurations */}
                {configurations.map((config, index) => (
                    <Link key={config.id} href={`/webservices/nginx/${config.id}`} className="block">
                        <div className={cn(
                            "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                            "border-b border-border"
                        )}>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-foreground break-all font-mono leading-tight flex items-center gap-2">
                                        <FileCode className="h-4 w-4 text-muted-foreground" />
                                        {config.name || config.id || 'Unknown Configuration'}
                                    </p>
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {config.type.toUpperCase()}
                                    </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Server className="h-3.5 w-3.5" />
                                        <span>{config.serverName || 'Unknown Server'}</span>
                                    </div>
                                    {config.isDraft && (
                                        <>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{formatDate(config.created_on)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Hash className="h-3.5 w-3.5" />
                                                <span>{config.value?.pathRules?.length || 0} rules</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{config.created_by}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Restart Server Row */}
                <button
                    onClick={handleRestart}
                    disabled={restarting}
                    className="w-full text-left block hover:bg-red-500/5 transition-colors"
                >
                    <div className="p-4 min-w-0 w-full flex items-center gap-4 text-destructive">
                        <div className="rounded-full bg-destructive/10 p-2">
                            <RefreshCw className={cn("h-5 w-5", restarting && "animate-spin")} />
                        </div>
                        <div>
                            <p className="font-semibold">{restarting ? 'Restarting Server...' : 'Restart Nginx Server'}</p>
                            <p className="text-sm text-muted-foreground">Apply changes by restarting the service</p>
                        </div>
                    </div>
                </button>
            </Card>

            {configurations.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                    <p>No existing configurations found.</p>
                </div>
            )}
        </div>
    );
}
