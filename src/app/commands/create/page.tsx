'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSavedCommand } from '../actions';
import { CommandForm } from '../command-form';
import { CommandFormData, VARIABLE_REGEX } from '../types';
import Link from 'next/link';
import { PageTitleBack } from '@/components/page-header';

export default function CreateCommandPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<CommandFormData>({
        name: '',
        command: '<<{{start.linux}}>>\n\n<<{{end.linux}}>>\n\n<<{{start.windows}}>>\n\n<<{{end.windows}}>>',
        description: '',
        nextCommands: '',
        variables: {}
    });

    const handleFormDataChange = (field: keyof Omit<CommandFormData, 'variables'>, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleVariableDataChange = (varName: string, field: 'title' | 'description' | 'hint', value: string) => {
        setFormData(prev => ({
            ...prev,
            variables: {
                ...prev.variables,
                [varName]: {
                    ...prev.variables[varName],
                    [field]: value,
                }
            }
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.command) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Name and command are required.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const matches = formData.command.matchAll(VARIABLE_REGEX);
            const detectedVariables = Array.from(matches, m => m[1]);

            const commandData = {
                name: formData.name,
                command: formData.command,
                description: formData.description,
                nextCommands: formData.nextCommands.split(',').map(s => s.trim()).filter(Boolean),
                variables: detectedVariables.map(varName => ({
                    name: varName,
                    title: formData.variables[varName]?.title || varName,
                    description: formData.variables[varName]?.description || '',
                    hint: formData.variables[varName]?.hint || '',
                }))
            };

            await createSavedCommand(commandData);
            toast({
                title: 'Command Created',
                description: `The command "${formData.name}" has been saved successfully.`
            });
            router.push('/commands');
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to create command: ${e.message}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid gap-6">
            <PageTitleBack
                title="Create New Command"
                description="Save a new reusable command to run on your servers."
                backHref="/commands"
            />

            <CommandForm
                formData={formData}
                onFormDataChange={handleFormDataChange}
                onVariableDataChange={handleVariableDataChange}
            />

            <div className="flex gap-3 pt-6 border-t">
                <Button variant="outline" asChild className="flex-1">
                    <Link href="/commands">Cancel</Link>
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving} className="flex-1">
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        'Create Command'
                    )}
                </Button>
            </div>
        </div>
    );
}
