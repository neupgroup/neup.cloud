'use client';

import { useState, useEffect } from 'react';
import Cookies from 'universal-cookie';
import { useAuth } from '@/firebase/provider';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getCommandSet, CommandSet } from '../actions';
import { executeCommand } from '@/app/commands/actions';
import { getServers } from '@/app/servers/actions';
import { Loader2, Play, CheckCircle2, XCircle, ChevronRight, Terminal as TerminalIcon, Edit, AlertCircle, RefreshCw, SkipForward } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface StepStatus {
    status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
    output?: string;
    startTime?: number;
    endTime?: number;
}

// Custom parser component for the allowed HTML tags
function RichTextDescription({ text }: { text: string }) {
    if (!text) return null;

    // Split by tags we want to process: <b>, </b>, <i>, </i>, <u>, </u>, <a href="...">, </a>
    // We also need to handle newlines as <br/>

    // Simple render approach:
    // 1. We essentially want to trust "safe" subset of HTML. 
    // Since we don't have a sanitizer library, we will use a naive replacement strategy 
    // to build a dangerouslySetInnerHTML string that ONLY includes allowed tags.

    const sanitizeAndFormat = (input: string) => {
        // 1. Escape EVERYTHING first to neutralize scripts/etc.
        let safe = input
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // 2. Unescape specifically allowed tags

        // Bold
        safe = safe.replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
        // Italics
        safe = safe.replace(/&lt;i&gt;/g, "<i>").replace(/&lt;\/i&gt;/g, "</i>");
        // Underline
        safe = safe.replace(/&lt;u&gt;/g, "<u>").replace(/&lt;\/u&gt;/g, "</u>");

        // Links: <a href="/internal">text</a>
        // Regex: &lt;a href=&quot;(/[^&]*)&quot;&gt;(.*?)&lt;/a&gt;
        // The href must start with / (internal). We assume user input /foo/bar.
        // We caught quotes as &quot;
        safe = safe.replace(/&lt;a href=&quot;(\/[^"]*?)&quot;&gt;(.*?)&lt;\/a&gt;/g, "<a href='$1' class='text-primary hover:underline'>$2</a>");

        // Newlines to <br>
        safe = safe.replace(/\n/g, "<br />");

        return safe;
    };

    return (
        <div
            className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: sanitizeAndFormat(text) }}
        />
    );
}

export default function RunCommandSetPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const auth = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [commandSet, setCommandSet] = useState<CommandSet | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Run State
    const [selectedServerId, setSelectedServerId] = useState<string>('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        // TEMPORARY: Hardcoded user
        const tempUid = "tempaccount";
        const mockUser = { uid: tempUid } as User;
        setUser(mockUser);

        const fetchData = async () => {
            // Fetch Command Set
            const set = await getCommandSet(id);
            setCommandSet(set);

            // Get Selected Server from Cookie
            const cookies = new Cookies(null, { path: '/' });
            const serverId = cookies.get('selected_server');
            if (serverId) {
                setSelectedServerId(serverId);
            }

            setIsLoading(false);
        };
        fetchData();

    }, [id]);

    const handleRunStep = async (index: number = currentStepIndex) => {
        if (!selectedServerId || !commandSet) {
            toast({ variant: "destructive", title: "Target missing", description: "No server selected. Please select a server from the dashboard." });
            return;
        }

        if (index >= commandSet.commands.length) return;

        const cmd = commandSet.commands[index];
        setIsRunning(true);

        setStepStatuses(prev => ({
            ...prev,
            [index]: { status: 'running', startTime: Date.now(), output: '' }
        }));

        try {
            const result = await executeCommand(
                selectedServerId,
                cmd.command,
                `${commandSet.name} - Step ${index + 1}: ${cmd.title || 'Untitled'}`,
                cmd.command
            );

            setStepStatuses(prev => ({
                ...prev,
                [index]: {
                    status: result.error ? 'error' : 'success',
                    output: result.error || result.output,
                    startTime: prev[index]?.startTime,
                    endTime: Date.now()
                }
            }));

            if (!result.error) {
                // If it's a re-run of a past or current step, we generally don't maximize the index. 
                // But if it was the *current* step that succeeded, we advance.
                if (index === currentStepIndex && index < commandSet.commands.length - 1) {
                    setCurrentStepIndex(index + 1);
                } else if (index === currentStepIndex) {
                    // Completed the last step
                    setCurrentStepIndex(index + 1);
                }
            }
        } catch (e: any) {
            setStepStatuses(prev => ({
                ...prev,
                [index]: {
                    status: 'error',
                    output: e.message,
                    startTime: prev[index]?.startTime,
                    endTime: Date.now()
                }
            }));
        } finally {
            setIsRunning(false);
        }
    };

    const handleSkipStep = (index: number = currentStepIndex) => {
        if (!commandSet) return;

        // Mark as skipped
        setStepStatuses(prev => ({
            ...prev,
            [index]: { status: 'skipped', output: 'Skipped by user', startTime: Date.now(), endTime: Date.now() }
        }));

        // Advance if it was current
        if (index === currentStepIndex) {
            setCurrentStepIndex(prev => prev + 1);
        }
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!commandSet) {
        return <div className="p-20 text-center">Command set not found.</div>;
    }

    // Calculate overall progress for a minimal header
    const totalSteps = commandSet.commands.length;
    // Count success or skipped as 'done' for progress purposes? Maybe just success.
    const completedSteps = Object.values(stepStatuses).filter(s => s.status === 'success' || s.status === 'skipped').length;

    return (
        <div className="container max-w-4xl py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{commandSet.name}</h1>
                    <p className="text-muted-foreground">{commandSet.description || "No description provided."}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(`/commandset/${id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Set
                    </Button>
                </div>
            </div>

            {/* Steps List */}
            <div className="space-y-4">
                {commandSet.commands.map((cmd, index) => {
                    const status = stepStatuses[index];
                    const isLocked = index > currentStepIndex; // Only future steps are strictly locked

                    const isCurrent = index === currentStepIndex;
                    const isCompleted = status?.status === 'success';
                    const isError = status?.status === 'error';
                    const isSkipped = status?.status === 'skipped';
                    const isRunningStep = status?.status === 'running';

                    return (
                        <Card key={cmd.id} className={cn(
                            "transition-all border shadow-sm",
                            isCurrent && !isRunningStep && "border-primary ring-1 ring-primary/20 bg-muted/10",
                            isRunningStep && "border-primary/50 bg-muted/10",
                            isLocked && "opacity-60 grayscale bg-muted/20"
                        )}>
                            <CardHeader className="py-4 px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Status Icon */}
                                        <div className="shrink-0">
                                            {isRunningStep ? (
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            ) : isCompleted ? (
                                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                            ) : isSkipped ? (
                                                <SkipForward className="h-6 w-6 text-muted-foreground" />
                                            ) : isError ? (
                                                <XCircle className="h-6 w-6 text-destructive" />
                                            ) : (
                                                <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-muted-foreground/30 text-xs font-semibold text-muted-foreground">
                                                    {index + 1}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <CardTitle className={cn("text-base font-semibold flex items-center gap-2", (isCompleted || isSkipped) && "text-muted-foreground")}>
                                                {cmd.title || `Step ${index + 1}`}
                                                {/* Optional badges */}
                                                {cmd.isSkippable && <Badge variant="secondary" className="text-[10px] h-5">Optional</Badge>}
                                                {cmd.isRepeatable && <Badge variant="outline" className="text-[10px] h-5">Allow Repeats</Badge>}
                                            </CardTitle>

                                            {/* Description Component */}
                                            {cmd.description ? (
                                                <RichTextDescription text={cmd.description} />
                                            ) : (
                                                <CardDescription className="line-clamp-1">{cmd.command}</CardDescription>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons Container */}
                                    <div className="flex items-center gap-2">

                                        {!isLocked && !isRunningStep && (
                                            <>
                                                {/* Standard Run for Current Step */}
                                                {isCurrent && !isCompleted && !isError && (
                                                    <Button onClick={() => handleRunStep(index)} disabled={!selectedServerId}>
                                                        <Play className="mr-2 h-4 w-4" /> Run Step
                                                    </Button>
                                                )}

                                                {/* Retry after Error */}
                                                {isError && isCurrent && (
                                                    <Button variant="outline" onClick={() => handleRunStep(index)} disabled={!selectedServerId}>
                                                        <RefreshCw className="mr-2 h-4 w-4" /> Retry
                                                    </Button>
                                                )}

                                                {/* Repeat Button (If done/skipped/error AND repeatable) */}
                                                {(isCompleted || isSkipped || (isError && !isCurrent)) && cmd.isRepeatable && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleRunStep(index)} disabled={!selectedServerId} title="Run Again">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Skip Button Logic */}
                                                {/* Show if: (Current) AND (Skippable OR Error) */}
                                                {(isCurrent) && (cmd.isSkippable || isError) && (
                                                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => handleSkipStep(index)}>
                                                        Skip <ChevronRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Expandable Content (Output) */}
                            {status && !isSkipped && (
                                <CardContent className="px-6 pb-4 pt-0">
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                                            <TerminalIcon className="h-3 w-3" />
                                            {isError ? "Error Output" : "Output"}
                                            {status.endTime && status.startTime && (
                                                <span className="ml-auto font-normal normal-case">
                                                    {((status.endTime - status.startTime) / 1000).toFixed(2)}s
                                                </span>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "bg-black p-3 rounded-md font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-[300px]",
                                            isError ? "text-red-400" : "text-green-400"
                                        )}>
                                            {status.output || (isRunningStep ? 'Executing...' : 'No output')}
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Completion Message */}
            {completedSteps === totalSteps && (
                <div className="bg-green-500/10 text-green-600 p-4 rounded-lg flex items-center gap-3 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">All steps completed!</span>
                </div>
            )}
        </div>
    );
}
