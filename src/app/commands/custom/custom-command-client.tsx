'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runCustomCommandOnServer } from '../../servers/[id]/actions';

export default function CustomCommandClient({ serverId }: { serverId: string }) {
    const { toast } = useToast();
    const [customCommand, setCustomCommand] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);

    const handleRunCustomCommand = async () => {
        if (!customCommand.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a command.' });
            return;
        }

        setIsRunning(true);
        try {
            await runCustomCommandOnServer(serverId, customCommand);
            toast({ title: 'Command Executed', description: 'Custom command has been executed. Check history for output.' });
            setCustomCommand('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Execution Failed', description: e.message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
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
                <Button onClick={handleRunCustomCommand} disabled={isRunning}>
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
    );
}
