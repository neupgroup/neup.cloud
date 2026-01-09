
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getServerLogs } from '../servers/[id]/actions';
import { getSavedCommands } from '../commands/actions';
import { SavedCommand } from '../commands/types';

import type { ServerLog } from './page';

const LOGS_PER_PAGE = 10;

const LogStatusBadge = ({ status }: { status: ServerLog['status'] }) => {
  if (status === 'Success') {
    return (
      <div className="flex items-center gap-1.5 text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full text-xs font-semibold w-fit border border-green-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Completed
      </div>
    )
  }
  if (status === 'Error') {
    return (
      <div className="flex items-center gap-1.5 text-red-600 bg-red-500/10 px-2.5 py-1 rounded-full text-xs font-semibold w-fit border border-red-500/20">
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </div>
    )
  }
  // Pending or Running
  return (
    <div className="flex items-center gap-1.5 text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-full text-xs font-semibold w-fit border border-blue-500/20">
      <Clock className="w-3.5 h-3.5" />
      Ongoing
    </div>
  )
};

export function HistoryClient({ initialLogs, serverId }: { initialLogs: ServerLog[]; serverId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState(initialLogs);
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading to fetch saved commands

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  const handlePageChange = (newPage: number) => {
    router.push(pathname + '?' + createQueryString('page', newPage.toString()));
  }

  // Fetch Saved Commands for name mapping
  useEffect(() => {
    async function fetchData() {
      try {
        // We need saved commands to map scripts to names
        const commands = await getSavedCommands();
        setSavedCommands(commands as SavedCommand[]);
      } catch (e) {
        console.error("Failed to fetch saved commands for history mapping", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const newLogs = await getServerLogs(serverId) as ServerLog[];
      setLogs(newLogs);
      toast({ title: 'Logs refreshed successfully.' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh server logs.' });
    } finally {
      setIsLoading(false);
    }
  }, [serverId, toast]);

  const getCommandDisplayName = (script: string) => {
    // Exact match check
    const match = savedCommands.find(c => c.command.trim() === script.trim());
    if (match) return match.name;

    // Use custom logic
    const lines = script.trim().split('\n');
    if (lines.length > 1) return "Custom Command"; // Multi-line is likely custom
    if (lines[0].length > 60) return "Custom Command"; // Long single line likely custom

    return lines[0]; // Short single line, show it.
  }

  const totalLogPages = Math.ceil(logs.length / LOGS_PER_PAGE);
  const displayedLogs = logs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading} className="h-8">
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Reloading...' : 'Reload Logs'}
        </Button>
      </div>

      {/* Content */}
      {isLoading && logs.length === 0 ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border bg-card/50 p-6">
              <div className="space-y-4">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedLogs.length > 0 ? (
        <div className="grid gap-4">
          {displayedLogs.map((log) => (
            <Card key={log.id} className="overflow-hidden bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 border-border/50 group">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={log.id} className="border-0">
                  <AccordionTrigger className="px-6 py-5 hover:no-underline w-full [&[data-state=open]>div>div>svg]:rotate-90">
                    <div className="flex items-start justify-between w-full gap-4">
                      <div className="flex flex-col items-start gap-3 w-full">
                        {/* Status Badge */}
                        <LogStatusBadge status={log.status} />

                        {/* Command Name */}
                        <div className="font-semibold text-lg text-foreground tracking-tight">
                          {getCommandDisplayName(log.command)}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground/80">User</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span>{format(new Date(log.runAt), 'MMM d, yyyy')}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span>{format(new Date(log.runAt), 'h:mm a')}</span>
                        </div>
                      </div>

                      {/* Chevron - Custom Position/Animation */}
                      <div className="text-muted-foreground/50 group-hover:text-foreground transition-colors pt-1">
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-0 border-t border-border/50 bg-muted/5">
                    <div className="space-y-6 pt-6 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Command</h4>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm border text-foreground whitespace-pre-wrap break-all shadow-sm">
                          {log.command}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Output</h4>
                        </div>
                        {/* Modified: Removed max-h and overflow-y-auto to allow full expansion based on content */}
                        <div className="bg-zinc-950 text-zinc-50 p-4 rounded-lg font-mono text-sm border border-zinc-800/50 whitespace-pre-wrap break-words shadow-inner">
                          {log.output || <span className="text-zinc-500 italic">No output recorded.</span>}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center border-dashed border-2 bg-muted/5">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="mb-2 text-lg font-medium text-foreground">No History Yet</p>
          <p className="mb-6 text-sm max-w-sm mx-auto">Commands run on this server will appear here. Start by running a command.</p>
          <Button asChild>
            <a href="/commands">Explore Commands</a>
          </Button>
        </Card>
      )}

      {totalLogPages > 1 && (
        <div className="flex justify-center gap-2 pt-6">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>
            Previous
          </Button>
          <div className="flex items-center px-4 text-sm font-medium text-muted-foreground">
            Page {currentPage} of {totalLogPages}
          </div>
          <Button variant="outline" size="sm" disabled={currentPage >= totalLogPages} onClick={() => handlePageChange(currentPage + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
