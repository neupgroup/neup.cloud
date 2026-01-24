
'use client';

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Terminal, Play, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CommandsSectionProps {
    application: any;
}

export function CommandsSection({ application }: CommandsSectionProps) {
    const { toast } = useToast();
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

    if (!application.commands || Object.keys(application.commands).length === 0) {
        return null;
    }

    const copyToClipboard = (text: string, name: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCommand(name);
        toast({ title: "Copied", description: "Command copied to clipboard" });
        setTimeout(() => setCopiedCommand(null), 2000);
    };

    const CommandRow = ({
        name,
        command,
        isLast = false
    }: {
        name: string,
        command: string,
        isLast?: boolean
    }) => {
        return (
            <div className={cn(
                "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4",
                !isLast && "border-b border-border"
            )}>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0 h-8">
                        <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground capitalize">
                            {name}
                        </h3>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => copyToClipboard(command, name)}
                            >
                                {copiedCommand === name ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
                        <code className="text-xs text-muted-foreground font-mono truncate">{command}</code>
                    </div>
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
