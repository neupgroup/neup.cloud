'use client';

import { PageTitle } from '@/components/page-header';
import { Card } from "@/components/ui/card";
import { ShieldCheck, Loader2, Check, XCircle, HardDrive } from "lucide-react";
import { useState, useEffect } from "react";
import Cookies from "universal-cookie";
import { useToast } from "@/hooks/use-toast";
import {
    enableSshProtection,
    checkSshProtection,
    enableMemoryProtection,
    checkMemoryProtection,
    disableSshProtection,
    disableMemoryProtection
} from './actions';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useServerName } from "@/hooks/use-server-name";

export default function ProtectionPage() {
    const { toast } = useToast();
    const [serverId, setServerId] = useState<string | null>(null);
    const serverName = useServerName();

    // SSH Protection State
    const [isSshLoading, setIsSshLoading] = useState(false);
    const [isSshChecking, setIsSshChecking] = useState(true);
    const [isSshEnabled, setIsSshEnabled] = useState<boolean | null>(null);

    // Memory Protection State
    const [isMemLoading, setIsMemLoading] = useState(false);
    const [isMemChecking, setIsMemChecking] = useState(true);
    const [isMemEnabled, setIsMemEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        const cookies = new Cookies(null, { path: '/' });
        const id = cookies.get('selected_server');
        setServerId(id);

        if (id) {
            checkSshStatus(id);
            checkMemStatus(id);
        } else {
            setIsSshChecking(false);
            setIsMemChecking(false);
        }
    }, []);

    const checkSshStatus = async (id: string) => {
        setIsSshChecking(true);
        try {
            const result = await checkSshProtection(id);
            if (!result.error && result.enabled !== undefined) {
                setIsSshEnabled(result.enabled);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSshChecking(false);
        }
    };

    const checkMemStatus = async (id: string) => {
        setIsMemChecking(true);
        try {
            const result = await checkMemoryProtection(id);
            if (!result.error && result.enabled !== undefined) {
                setIsMemEnabled(result.enabled);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsMemChecking(false);
        }
    };

    const handleToggleSshProtection = async () => {
        if (isSshLoading || isSshChecking) return;

        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected', description: 'Please select a server.' });
            return;
        }

        setIsSshLoading(true);
        try {
            if (isSshEnabled) {
                // Disable
                const result = await disableSshProtection(serverId);
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Disable Failed', description: result.error });
                } else {
                    toast({ title: 'SSH Protection Disabled', description: 'SSH process protection has been removed.' });
                    setIsSshEnabled(false);
                }
            } else {
                // Enable
                const result = await enableSshProtection(serverId);
                if (result.error) {
                    toast({ variant: 'destructive', title: 'SSH Protection Failed', description: result.error });
                } else {
                    toast({ title: 'SSH Protection Enabled', description: 'SSH is now prioritized to survive OOM situations.' });
                    setIsSshEnabled(true);
                }
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSshLoading(false);
        }
    };

    const handleToggleMemProtection = async () => {
        if (isMemLoading || isMemChecking) return;

        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected', description: 'Please select a server.' });
            return;
        }

        setIsMemLoading(true);
        try {
            if (isMemEnabled) {
                // Disable
                const result = await disableMemoryProtection(serverId);
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Disable Failed', description: result.error });
                } else {
                    toast({ title: 'Memory Protection Disabled', description: 'Emergency memory buffer has been removed.' });
                    setIsMemEnabled(false);
                }
            } else {
                // Enable
                const result = await enableMemoryProtection(serverId);
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Memory Protection Failed', description: result.error });
                } else {
                    toast({ title: 'Memory Protection Enabled', description: 'System emergency memory buffer is now configured.' });
                    setIsMemEnabled(true);
                }
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsMemLoading(false);
        }
    };

    const isSshInteractive = !isSshLoading && !isSshChecking;
    const isMemInteractive = !isMemLoading && !isMemChecking;

    return (
        <div className="space-y-6">
            <PageTitle
                title="System Protection"
                description="Manage critical system protection mechanisms"
                serverName={serverName}
            />

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                {/* SSH Protection Card */}
                <div
                    onClick={handleToggleSshProtection}
                    className={cn(
                        "p-4 min-w-0 w-full transition-colors flex items-center justify-between border-b border-border",
                        isSshInteractive ? "hover:bg-muted/50 cursor-pointer" : "cursor-default opacity-70"
                    )}
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground hidden md:block" />
                            <p className="text-sm font-medium text-foreground font-mono leading-tight">
                                SSH Process Protection
                            </p>
                            {isSshChecking || isSshLoading ? (
                                <Badge variant="outline" className="gap-1 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {isSshLoading ? (isSshEnabled ? "Disabling..." : "Enabling...") : "Checking"}
                                </Badge>
                            ) : isSshEnabled ? (
                                <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                                    <Check className="h-3 w-3" /> Enabled
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" /> Not Protected
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mr-6">
                            Prevent SSH service from being killed by OOM Killer. Adds OOMScoreAdjust=-1000 to ssh.service.
                        </p>
                    </div>
                </div>

                {/* Memory Protection Card */}
                <div
                    onClick={handleToggleMemProtection}
                    className={cn(
                        "p-4 min-w-0 w-full transition-colors flex items-center justify-between",
                        isMemInteractive ? "hover:bg-muted/50 cursor-pointer" : "cursor-default opacity-70"
                    )}
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground hidden md:block" />
                            <p className="text-sm font-medium text-foreground font-mono leading-tight">
                                Emergency Memory Buffer
                            </p>
                            {isMemChecking || isMemLoading ? (
                                <Badge variant="outline" className="gap-1 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {isMemLoading ? (isMemEnabled ? "Disabling..." : "Enabling...") : "Checking"}
                                </Badge>
                            ) : isMemEnabled ? (
                                <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                                    <Check className="h-3 w-3" /> Enabled
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" /> Not Protected
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mr-6">
                            Reserves ~10% RAM (min_free_kbytes) for the kernel to prevent lockups during high memory load.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
