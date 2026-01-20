'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, X, Loader2, Save, ChevronLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CommandSet, CommandSetCommand } from './actions';
import { nanoid } from 'nanoid';

interface CommandDraft {
    tempId: string;
    title: string;
    command: string;
    description: string;
    isSkippable?: boolean;
    isRepeatable?: boolean;
}

interface CommandSetFormProps {
    initialData?: CommandSet;
    userId: string;
    onSubmit: (data: { name: string, description: string, commands: CommandSetCommand[] }) => Promise<{ success: boolean, error?: string }>;
    title: string;
    subtitle: string;
}

export function CommandSetForm({ initialData, userId, onSubmit, title, subtitle }: CommandSetFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [commandsDraft, setCommandsDraft] = useState<CommandDraft[]>(
        initialData?.commands?.map(c => ({
            tempId: c.id || nanoid(),
            title: c.title || '',
            command: c.command,
            description: c.description || '',
            isSkippable: c.isSkippable || false,
            isRepeatable: c.isRepeatable || false
        })) || [
            { tempId: nanoid(), title: '', command: '', description: '', isSkippable: false, isRepeatable: false }
        ]
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddDraftCommand = () => {
        setCommandsDraft([...commandsDraft, { tempId: nanoid(), title: '', command: '', description: '', isSkippable: false, isRepeatable: false }]);
    };

    const handleRemoveDraftCommand = (id: string) => {
        if (commandsDraft.length === 1) {
            setCommandsDraft([{ tempId: nanoid(), intitle: '', command: '', description: '', isSkippable: false, isRepeatable: false } as any]);
            return;
        }
        setCommandsDraft(commandsDraft.filter(c => c.tempId !== id));
    };

    const handleDraftChange = (id: string, field: 'title' | 'command' | 'description', value: string) => {
        setCommandsDraft(commandsDraft.map(c =>
            c.tempId === id ? { ...c, [field]: value } : c
        ));
    };

    const handleDraftCheckboxChange = (id: string, field: 'isSkippable' | 'isRepeatable', value: boolean) => {
        setCommandsDraft(commandsDraft.map(c =>
            c.tempId === id ? { ...c, [field]: value } : c
        ));
    }

    const handleMoveCommand = (index: number, direction: 'up' | 'down') => {
        const newDrafts = [...commandsDraft];
        if (direction === 'up' && index > 0) {
            [newDrafts[index], newDrafts[index - 1]] = [newDrafts[index - 1], newDrafts[index]];
        } else if (direction === 'down' && index < newDrafts.length - 1) {
            [newDrafts[index], newDrafts[index + 1]] = [newDrafts[index + 1], newDrafts[index]];
        }
        setCommandsDraft(newDrafts);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ variant: "destructive", title: "Name required", description: "Please give your command set a name." });
            return;
        }
        if (commandsDraft.some(c => !c.command.trim())) {
            toast({ variant: "destructive", title: "Commands required", description: "All command steps must have a command." });
            return;
        }

        setIsSubmitting(true);

        const commands: CommandSetCommand[] = commandsDraft.map((d, index) => ({
            id: d.tempId,
            title: d.title || `Command ${index + 1}`,
            command: d.command,
            description: d.description,
            order: index,
            isSkippable: d.isSkippable,
            isRepeatable: d.isRepeatable
        }));

        const result = await onSubmit({
            name,
            description,
            commands
        });

        if (result.success) {
            toast({ title: "Success", description: "Command set saved successfully." });
            router.push('/commandset');
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground">{subtitle}</p>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Server Setup Script"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea
                        id="desc"
                        placeholder="What does this set do?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-lg">Commands Sequence</Label>
                        <Button size="sm" variant="secondary" onClick={handleAddDraftCommand} disabled={isSubmitting}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Step
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {commandsDraft.map((draft, idx) => (
                            <div key={draft.tempId} className="flex gap-3 group items-start relative border p-4 rounded-lg bg-card shadow-sm hover:border-primary/20 transition-colors">
                                <div className="flex flex-col items-center gap-2 mt-2">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleMoveCommand(idx, 'up')}
                                            disabled={idx === 0}
                                        >
                                            <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleMoveCommand(idx, 'down')}
                                            disabled={idx === commandsDraft.length - 1}
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 grid gap-3">
                                    <div className="grid gap-2">
                                        <Input
                                            placeholder="Step Title (e.g. Update System)"
                                            value={draft.title}
                                            onChange={(e) => handleDraftChange(draft.tempId, 'title', e.target.value)}
                                            className="font-semibold"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Textarea
                                            placeholder="Shell command (e.g. apt-get update)"
                                            value={draft.command}
                                            onChange={(e) => handleDraftChange(draft.tempId, 'command', e.target.value)}
                                            className="font-mono text-sm min-h-[80px]"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Textarea
                                            placeholder="Description (optional)"
                                            value={draft.description}
                                            onChange={(e) => handleDraftChange(draft.tempId, 'description', e.target.value)}
                                            className="text-xs min-h-[60px] text-muted-foreground"
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Supported: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;a href="/"&gt; (internal only), new lines</p>
                                    </div>
                                    <div className="flex items-center gap-6 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`skip-${draft.tempId}`}
                                                checked={draft.isSkippable}
                                                onCheckedChange={(c) => handleDraftCheckboxChange(draft.tempId, 'isSkippable', c as boolean)}
                                                disabled={isSubmitting}
                                            />
                                            <Label htmlFor={`skip-${draft.tempId}`} className="text-sm font-normal text-muted-foreground cursor-pointer">Allow Skipping</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`repeat-${draft.tempId}`}
                                                checked={draft.isRepeatable}
                                                onCheckedChange={(c) => handleDraftCheckboxChange(draft.tempId, 'isRepeatable', c as boolean)}
                                                disabled={isSubmitting}
                                            />
                                            <Label htmlFor={`repeat-${draft.tempId}`} className="text-sm font-normal text-muted-foreground cursor-pointer">Allow Repeats</Label>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                    onClick={() => handleRemoveDraftCommand(draft.tempId)}
                                    disabled={isSubmitting}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button variant="outline" className="w-full border-dashed" onClick={handleAddDraftCommand} disabled={isSubmitting}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Another Command Step
                        </Button>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur z-10">
                <div className="max-w-4xl mx-auto flex justify-end gap-4">
                    <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Command Set
                    </Button>
                </div>
            </div>
        </div>
    );
}
