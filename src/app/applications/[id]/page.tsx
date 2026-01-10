'use client';

import React, { useEffect, useState } from 'react';
import { PageTitleBack } from '@/components/page-header';
import { getApplication, updateApplication, executeApplicationCommand } from '@/app/applications/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, AppWindow, Terminal, Play, Plus, Trash2, Save, Pencil, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea, AutoResizeTextarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';


export default function ApplicationDetailsPage({ params }: { params: { id: string } }) {
    const { toast } = useToast();
    const [application, setApplication] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Execution State
    const [executingCmd, setExecutingCmd] = useState<string | null>(null);

    // Editable State
    const [commands, setCommands] = useState({ start: '', stop: '', restart: '' });
    const [customCommands, setCustomCommands] = useState<{ name: string, command: string }[]>([]);

    // New Command State
    const [newCmdName, setNewCmdName] = useState('');
    const [newCmdContent, setNewCmdContent] = useState('');

    useEffect(() => {
        async function loadApp() {
            try {
                const app = await getApplication(params.id);
                if (app) {
                    setApplication(app);
                    syncState(app);
                } else {
                    setError('Application not found');
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        }
        loadApp();
    }, [params.id]);

    const syncState = (app: any) => {
        setCommands({
            start: app.commands?.start || '',
            stop: app.commands?.stop || '',
            restart: app.commands?.restart || ''
        });
        setCustomCommands(app.customCommands || []);
    };

    const handleRunCommand = async (name: string, command: string) => {
        if (!command) return;
        setExecutingCmd(name);
        try {
            const result = await executeApplicationCommand(application.id, command);
            if (result.error) {
                toast({
                    title: `Execution Failed: ${name}`,
                    description: result.error,
                    variant: "destructive"
                });
            } else {
                toast({
                    title: `Execution Started: ${name}`,
                    description: "Command has been sent to the runner. logs will appear in history.",
                });
            }
        } catch (e: any) {
            toast({
                title: `Error Executing: ${name}`,
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setExecutingCmd(null);
        }
    };

    const handleSave = async () => {
        try {
            await updateApplication(application.id, {
                commands,
                customCommands
            });
            setApplication({ ...application, commands, customCommands }); // Optimistic update
            setIsEditing(false);
            toast({ title: "Success", description: "Application configuration updated." });
        } catch (e: any) {
            toast({ title: "Error", description: "Failed to update application.", variant: "destructive" });
        }
    };

    const handleCancel = () => {
        syncState(application);
        setIsEditing(false);
    };

    const addCustomCommand = () => {
        if (!newCmdName.trim() || !newCmdContent.trim()) {
            toast({ title: "Validation Error", description: "Name and Command are required.", variant: "destructive" });
            return;
        }
        setCustomCommands([...customCommands, { name: newCmdName, command: newCmdContent }]);
        setNewCmdName('');
        setNewCmdContent('');
    };

    const removeCustomCommand = (index: number) => {
        setCustomCommands(customCommands.filter((_, i) => i !== index));
    };

    if (isLoading) return <div className="p-10 text-center text-muted-foreground animate-pulse">Loading application details...</div>;
    if (error || !application) return <div className="p-10 text-center text-destructive">Error: {error || 'Application not found'}</div>;

    return (
        <div className="w-full pb-10">
            <PageTitleBack title={application.name} description="Application Details" backHref="/applications" />

            <div className="mt-6 space-y-6">
                {/* Header & Status */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <AppWindow className="h-6 w-6 text-muted-foreground" />
                            <Badge
                                variant={application.status === 'Running' ? 'default' : 'secondary'}
                                className={application.status === 'Running' ? 'bg-green-500/20 text-green-700' : ''}
                            >
                                {application.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
                            <GitBranch className="h-4 w-4" />
                            <Link href={application.repo} target="_blank" className="hover:underline truncate max-w-md block">{application.repo}</Link>
                        </div>
                    </div>

                </div>

                {/* Core Info */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid gap-2">
                        <Label className="text-muted-foreground">Language / Framework</Label>
                        <div className="font-medium p-2 bg-muted/30 rounded border">{application.language || 'N/A'}</div>
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-muted-foreground">Deployment Location</Label>
                        <div className="font-mono text-sm p-2 bg-muted/30 rounded border break-all">{application.applicationLocation}</div>
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-muted-foreground">Network</Label>
                        <div className="p-2 bg-muted/30 rounded border text-sm">
                            {application.allowNetwork ? (
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                    <span>Allowed: <span className="font-mono font-medium">{application.allowedPorts?.join(', ')}</span></span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground">Disabled</span>
                            )}
                        </div>
                    </div>
                </div>



                {/* Lifecycle Commands */}
                <div className="space-y-4">
                    <h3 className="font-semibold uppercase text-muted-foreground text-sm">Lifecycle Commands</h3>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold uppercase">Start Command</Label>
                            <div className="flex gap-2 items-start">
                                {isEditing ? (
                                    <AutoResizeTextarea
                                        value={commands.start}
                                        onChange={(e) => setCommands({ ...commands, start: e.target.value })}
                                        className="font-mono text-sm min-h-[50px]"
                                    />
                                ) : (
                                    <code className="flex-1 text-sm font-mono border p-3 rounded bg-muted/30 block text-foreground overflow-auto whitespace-pre-wrap">{commands.start}</code>
                                )}

                                {!isEditing && (
                                    <Button size="icon" variant="outline" onClick={() => handleRunCommand('Start', commands.start)} disabled={executingCmd !== null} title="Run Start Command">
                                        {executingCmd === 'Start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-green-600" />}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold uppercase">Stop Command</Label>
                            <div className="flex gap-2 items-start">
                                {isEditing ? (
                                    <AutoResizeTextarea
                                        value={commands.stop}
                                        onChange={(e) => setCommands({ ...commands, stop: e.target.value })}
                                        className="font-mono text-sm min-h-[50px]"
                                        placeholder="Optional"
                                    />
                                ) : (
                                    <code className="flex-1 text-sm font-mono border p-3 rounded bg-muted/30 block text-muted-foreground overflow-auto whitespace-pre-wrap min-h-[3rem] items-center flex">{commands.stop || '-'}</code>
                                )}
                                {!isEditing && commands.stop && (
                                    <Button size="icon" variant="outline" onClick={() => handleRunCommand('Stop', commands.stop)} disabled={executingCmd !== null} title="Run Stop Command">
                                        {executingCmd === 'Stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-orange-600" />}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold uppercase">Restart Command</Label>
                            <div className="flex gap-2 items-start">
                                {isEditing ? (
                                    <AutoResizeTextarea
                                        value={commands.restart}
                                        onChange={(e) => setCommands({ ...commands, restart: e.target.value })}
                                        className="font-mono text-sm min-h-[50px]"
                                        placeholder="Optional"
                                    />
                                ) : (
                                    <code className="flex-1 text-sm font-mono border p-3 rounded bg-muted/30 block text-muted-foreground overflow-auto whitespace-pre-wrap min-h-[3rem] items-center flex">{commands.restart || '-'}</code>
                                )}
                                {!isEditing && commands.restart && (
                                    <Button size="icon" variant="outline" onClick={() => handleRunCommand('Restart', commands.restart)} disabled={executingCmd !== null} title="Run Restart Command">
                                        {executingCmd === 'Restart' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-blue-600" />}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>



                {/* Custom Commands */}
                <div className="space-y-4">
                    <h3 className="font-semibold uppercase text-muted-foreground text-sm">Custom Commands</h3>

                    {customCommands.length === 0 && !isEditing && (
                        <div className="text-sm text-muted-foreground italic">No custom commands defined.</div>
                    )}

                    <div className="grid gap-4">
                        {customCommands.map((cmd, idx) => (
                            <div key={idx} className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    {isEditing ? (
                                        <Input
                                            value={cmd.name}
                                            onChange={(e) => {
                                                const newCmds = [...customCommands];
                                                newCmds[idx].name = e.target.value;
                                                setCustomCommands(newCmds);
                                            }}
                                            className="h-8 text-xs font-semibold uppercase w-auto max-w-[200px]"
                                            placeholder="COMMAND NAME"
                                        />
                                    ) : (
                                        <Label className="text-xs font-semibold uppercase">{cmd.name}</Label>
                                    )}
                                </div>
                                <div className="flex gap-2 items-start">
                                    {isEditing ? (
                                        <AutoResizeTextarea
                                            value={cmd.command}
                                            onChange={(e) => {
                                                const newCmds = [...customCommands];
                                                newCmds[idx].command = e.target.value;
                                                setCustomCommands(newCmds);
                                            }}
                                            className="font-mono text-sm min-h-[50px]"
                                            placeholder="Command script..."
                                        />
                                    ) : (
                                        <code className="flex-1 text-sm font-mono border p-3 rounded bg-muted/30 block text-muted-foreground overflow-auto whitespace-pre-wrap min-h-[3rem] items-center flex">
                                            {cmd.command}
                                        </code>
                                    )}

                                    {isEditing ? (
                                        <Button size="icon" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeCustomCommand(idx)} title="Remove Command">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button size="icon" variant="outline" onClick={() => handleRunCommand(cmd.name, cmd.command)} disabled={executingCmd !== null} title="Run Command">
                                            {executingCmd === cmd.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-green-600" />}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add New Custom Command - Only in Edit Mode */}
                    {isEditing && (
                        <div className="space-y-3 pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="customName" className="text-xs font-normal">New Command Name</Label>
                                <Input id="customName" placeholder="e.g. Clear Cache" value={newCmdName} onChange={e => setNewCmdName(e.target.value)} className="bg-background" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="customCmd" className="text-xs font-normal">Script / Executable</Label>
                                <AutoResizeTextarea id="customCmd" placeholder="Command content..." value={newCmdContent} onChange={e => setNewCmdContent(e.target.value)} className="font-mono text-xs min-h-[80px] bg-background" />
                            </div>
                            <Button onClick={addCustomCommand} variant="secondary" size="sm" className="w-auto self-start">
                                <Plus className="h-4 w-4 mr-1" /> Add Command
                            </Button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="flex justify-start gap-4 mt-8">
                        <Button onClick={handleSave} className="min-w-[150px]">
                            <Save className="mr-2 h-4 w-4" /> Save Configuration
                        </Button>
                        <Button variant="ghost" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-start mt-8">
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                            <Pencil className="h-4 w-4" /> Edit Config
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
