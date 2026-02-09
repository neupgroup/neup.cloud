'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resetSupervisorConfiguration, purgeSupervisor } from "../../actions";
import { useToast } from "@/hooks/use-toast";
import Cookies from "universal-cookie";
import { Loader2, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { PageTitle } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ResetConfigurationPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [purgeLoading, setPurgeLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [purgeResult, setPurgeResult] = useState<string | null>(null);

    const handleReset = async () => {
        const cookies = new Cookies(null, { path: '/' });
        const serverId = cookies.get('selected_server');

        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await resetSupervisorConfiguration(serverId);
            if (res.error) {
                setResult(`Error: ${res.error}`);
                toast({ variant: 'destructive', title: 'Reset Failed', description: res.error });
            } else {
                setResult(res.output || "Configuration reset successfully.");
                toast({ title: 'Configuration Reset', description: 'Supervisor configuration has been reloaded.' });
            }
        } catch (e: any) {
            setResult(`Error: ${e.message}`);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePurge = async () => {
        if (!confirm("WARNING: This will completely REMOVE Supervisor and all its configurations from the server. This action is destructive and irreversible. Are you sure?")) {
            return;
        }

        const cookies = new Cookies(null, { path: '/' });
        const serverId = cookies.get('selected_server');

        if (!serverId) {
            toast({ variant: 'destructive', title: 'No server selected' });
            return;
        }

        setPurgeLoading(true);
        setPurgeResult(null);

        try {
            const res = await purgeSupervisor(serverId);
            if (res.error) {
                setPurgeResult(`Error: ${res.error}`);
                toast({ variant: 'destructive', title: 'Purge Failed', description: res.error });
            } else {
                setPurgeResult(res.output || "Supervisor purged successfully.");
                toast({ title: 'Supervisor Purged', description: 'Supervisor has been completely removed from the server.' });
            }
        } catch (e: any) {
            setPurgeResult(`Error: ${e.message}`);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setPurgeLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <PageTitle
                title="Supervisor Management"
                description="Manage supervisor configuration and installation."
            />

            <Card className="p-6 max-w-2xl">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Reload Configuration
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        This action will run <code>supervisorctl reread</code> and <code>supervisorctl update</code> on the selected server.
                        Use this if you have manually modified configuration files or if the process list is out of sync.
                    </p>

                    <Button 
                        onClick={handleReset} 
                        disabled={loading || purgeLoading}
                        className="w-full sm:w-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Reloading...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reload Configuration
                            </>
                        )}
                    </Button>

                    {result && (
                        <div className="mt-4 p-4 bg-muted rounded-md font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-60">
                            {result}
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-6 max-w-2xl border-destructive/50">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Purge Supervisor
                    </h3>
                    
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Danger Zone</AlertTitle>
                        <AlertDescription>
                            This will <b>completely remove</b> Supervisor, including all configuration files, logs, and sockets. 
                            Any applications managed by Supervisor will stop running.
                        </AlertDescription>
                    </Alert>

                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>It executes the following sequence:</p>
                        <ul className="list-disc pl-5 font-mono text-xs space-y-1">
                            <li>sudo systemctl stop supervisor</li>
                            <li>sudo apt-get purge -y supervisor</li>
                            <li>rm -rf /etc/supervisor /var/log/supervisor...</li>
                        </ul>
                    </div>

                    <Button 
                        onClick={handlePurge} 
                        disabled={loading || purgeLoading}
                        variant="destructive"
                        className="w-full sm:w-auto"
                    >
                        {purgeLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Purging...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Purge Supervisor Completely
                            </>
                        )}
                    </Button>

                    {purgeResult && (
                        <div className="mt-4 p-4 bg-muted rounded-md font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-60">
                            {purgeResult}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
