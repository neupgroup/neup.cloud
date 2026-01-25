'use client';

import { PageTitle } from '@/components/page-header';
import { Card } from "@/components/ui/card";
import { ShieldCheck, Loader2, Check, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import Cookies from "universal-cookie";
import { useToast } from "@/hooks/use-toast";
import { enableSshProtection, checkSshProtection } from './actions';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ProtectionPage() {
    const { toast } = useToast();
    const [serverId, setServerId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        const cookies = new Cookies(null, { path: '/' });
        const id = cookies.get('selected_server');
        setServerId(id);

        if (id) {
            checkStatus(id);
        } else {
            setIsChecking(false);
        }
    }, []);

    const checkStatus = async (id: string) => {
        setIsChecking(true);
        try {
            const result = await checkSshProtection(id);
            if (!result.error && result.enabled !== undefined) {
                setIsEnabled(result.enabled);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleEnableProtection = async () => {
        if (isEnabled || isLoading || isChecking) return;

        if (!serverId) {
            toast({
                variant: 'destructive',
                title: 'No server selected',
                description: 'Please select a server to apply protection.',
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await enableSshProtection(serverId);
            if (result.error) {
                toast({
                    variant: 'destructive',
                    title: 'Protection Failed',
                    description: result.error,
                });
            } else {
                toast({
                    title: 'Protection Enabled',
                    description: 'SSH is now prioritized to survive OOM situations.',
                });
                setIsEnabled(true);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Operation Error',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isInteractive = !isEnabled && !isLoading && !isChecking;

    return (
        <div className="space-y-6">
            <PageTitle
                title="System Protection"
                description="Manage critical system protection mechanisms."
            />

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                <div
                    onClick={handleEnableProtection}
                    className={cn(
                        "p-4 min-w-0 w-full transition-colors flex items-center justify-between",
                        isInteractive ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"
                    )}
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-foreground font-mono leading-tight">
                                SSH Process Protection
                            </p>
                            {isChecking || isLoading ? (
                                <Badge variant="outline" className="gap-1 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {isLoading ? "Applying..." : "Checking"}
                                </Badge>
                            ) : isEnabled ? (
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
            </Card>
        </div>
    );
}
