// This file has been removed as it is not UI-only or action logic.
'use client';

import { CommandsSection, getCommandDescription } from '@/services/applications/commands-section';
        command: string,
        isLast?: boolean
    }) => {
        const title = name.replace('lifecycle.', '').split(/[-_]/).map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        const description = getCommandDescription(name, command);

        return (
            <div className={cn(
                "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4",
                !isLast && "border-b border-border"
            )}>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0 h-8">
                        <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground">
                            {title}
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                    </p>
                </div>
            </div>
        );
    };

    const commands = Object.entries(application.commands);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200">
            <h3 className="text-lg font-medium flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Lifecycle Commands
            </h3>

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                {commands.map(([name, command], index) => (
                    <CommandRow
                        key={name}
                        name={name}
                        command={command as string}
                        isLast={index === commands.length - 1}
                    />
                ))}
            </Card>
        </div>
    );
}
