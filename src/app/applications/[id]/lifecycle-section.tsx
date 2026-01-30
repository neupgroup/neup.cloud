
'use client';

import { executeApplicationCommand } from "@/app/applications/actions";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Hammer, Loader2, Play, PlayCircle, RefreshCw, StopCircle, Terminal, Download } from "lucide-react";
import { useState } from "react";
import * as LucideIcons from "lucide-react";

interface LifecycleSectionProps {
    application: any;
}

export function LifecycleSection({ application }: LifecycleSectionProps) {
    const { toast } = useToast();
    const [executing, setExecuting] = useState<string | null>(null);

    if (!application.commands) return null;

    // Use command definitions if available, otherwise fall back to old logic
    const commandDefinitions = application.commandDefinitions || {};
    const hasDefinitions = Object.keys(commandDefinitions).length > 0;

    // Filter to only show published commands
    const availableCommands = hasDefinitions
        ? Object.entries(commandDefinitions).filter(([name, def]: [string, any]) => def.status === 'published')
        : Object.entries(application.commands).filter(([name]) => {
            const lifecycleNames = ['install', 'start', 'stop', 'restart', 'build', 'dev', 'lifecycle.install', 'lifecycle.start', 'lifecycle.stop', 'lifecycle.restart', 'lifecycle.build', 'lifecycle.dev'];
            return lifecycleNames.includes(name) || name.startsWith('lifecycle.');
        });

    if (availableCommands.length === 0) return null;

    const getIconComponent = (iconName: string) => {
        // @ts-ignore
        const Icon = LucideIcons[iconName];
        return Icon || Terminal;
    };

    const getIconFromName = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('start')) return PlayCircle;
        if (lower.includes('stop')) return StopCircle;
        if (lower.includes('restart')) return RefreshCw;
        if (lower.includes('build')) return Hammer;
        if (lower.includes('install')) return Download;
        if (lower.includes('dev')) return Terminal;
        return Terminal;
    };

    const getDescription = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('install')) return 'Install dependencies and prepare the application';
        if (lower.includes('build')) return 'Build the application for production';
        if (lower.includes('dev')) return 'Start the application in development mode';
        if (lower.includes('start')) return 'Start the application in production mode';
        if (lower.includes('stop')) return 'Stop the running application';
        if (lower.includes('restart')) return 'Restart the application with latest changes';
        return 'Execute lifecycle command';
    };

    const handleExecute = async (name: string, command: string) => {
        setExecuting(name);
        try {
            await executeApplicationCommand(application.id, command, name);
            toast({
                title: "Command Started",
                description: `Executing ${name}...`,
            });
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Execution Failed",
                description: error.message,
            });
        } finally {
            setExecuting(null);
        }
    };

    const ActionRow = ({
        name,
        commandOrDef,
        isLast = false
    }: {
        name: string,
        commandOrDef: string | any,
        isLast?: boolean
    }) => {
        const isDefinition = typeof commandOrDef === 'object';
        const definition = isDefinition ? commandOrDef : null;
        const command = isDefinition ? application.commands[name] : commandOrDef;

        const displayName = definition?.title || name.replace('lifecycle.', '');
        const description = definition?.description || getDescription(name);
        const Icon = definition?.icon ? getIconComponent(definition.icon) : getIconFromName(name);
        const type = definition?.type || 'normal';
        const isLoading = executing === name;

        // Color based on type
        const typeColors = {
            normal: '',
            destructive: 'text-red-600 dark:text-red-400',
            success: 'text-green-600 dark:text-green-400',
        };

        return (
            <div
                className={cn(
                    "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4 cursor-pointer",
                    !isLast && "border-b border-border",
                    isLoading && "opacity-50 pointer-events-none"
                )}
                onClick={() => !isLoading && handleExecute(name, command)}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0 h-8">
                        <h3 className={cn(
                            "font-semibold leading-none tracking-tight truncate pr-4 capitalize transition-colors group-hover:underline decoration-muted-foreground/30 underline-offset-4",
                            typeColors[type as keyof typeof typeColors]
                        )}>
                            {displayName}
                        </h3>

                        {/* Icon on Right, matching GitHub Section style */}
                        <div className="flex items-center gap-1">
                            <div className={cn(
                                "h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors",
                                typeColors[type as keyof typeof typeColors]
                            )}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                            </div>
                        </div>
                    </div>
                    {/* Description instead of command */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
            <h3 className="text-lg font-medium flex items-center gap-2">
                <Play className="h-5 w-5" />
                Lifecycle
            </h3>

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                {availableCommands.map(([name, commandOrDef], index) => (
                    <ActionRow
                        key={name}
                        name={name}
                        commandOrDef={commandOrDef}
                        isLast={index === availableCommands.length - 1}
                    />
                ))}
            </Card>
        </div>
    );
}
