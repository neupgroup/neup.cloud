'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageTitleBack } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Terminal, Loader2, Play, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getServers } from '../../servers/actions';
import { runCustomCommandOnServer } from '../../servers/[id]/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type ServerType = {
    id: string;
    name: string;
    type: string;
};

export default function CustomCommandPage() {
    const { toast } = useToast();
    const [selectedServer, setSelectedServer] = useState<string>('');
    const [customCommand, setCustomCommand] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);

    // Load selected server from cookies
    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };
        const serverIdCookie = getCookie('selected_server');
        if (serverIdCookie) {
            setSelectedServer(serverIdCookie);
        }
    }, []);

    const handleRunCustomCommand = async () => {
        if (!customCommand.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a command.' });
            return;
        }
        if (!selectedServer) {
            toast({ variant: 'destructive', title: 'Error', description: 'No server selected. Please select a server first.' });
            return;
        }

        setIsRunning(true);
        try {
            await runCustomCommandOnServer(selectedServer, customCommand);
            toast({ title: 'Command Executed', description: 'Custom command has been executed. Check history for output.' });
            setCustomCommand('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Execution Failed', description: e.message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitleBack
                title="Run Custom Command"
                description="Execute ad-hoc commands on your servers without saving them."
                backHref="/commands"
            />

            <div className="space-y-4">
                <Textarea
                    placeholder="Enter your command here... (e.g., ls -la, df -h)"
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                            handleRunCustomCommand();
                        }
                    }}
                    className="font-mono text-sm min-h-[150px]"
                />


                <div className="flex justify-start">
                    <Button onClick={handleRunCustomCommand} disabled={isRunning || !selectedServer}>
                        {isRunning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Run Custom Command
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
