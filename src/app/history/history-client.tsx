
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
import { RefreshCw, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getServerLogs } from '../servers/[id]/actions';
import type { ServerLog } from './page';

const LOGS_PER_PAGE = 10;

const LogStatusBadge = ({ status }: { status: ServerLog['status'] }) => {
  const badgeMap = {
    Success: {
      variant: 'default',
      className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
      text: 'Completed',
    },
    Error: {
      variant: 'destructive',
      className: '',
      text: 'Failed',
    },
    pending: {
      variant: 'secondary',
      className: '',
      text: 'Pending',
    },
  } as const;

  const badgeInfo = badgeMap[status];

  if (!badgeInfo) {
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }

  const { variant, className, text } = badgeInfo;

  return <Badge variant={variant} className={className}>{text}</Badge>;
};

export function HistoryClient({ initialLogs, serverId }: { initialLogs: ServerLog[]; serverId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState(initialLogs);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const newLogs = await getServerLogs(serverId) as ServerLog[];
      setLogs(newLogs);
      toast({ title: 'Logs refreshed successfully.'})
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh server logs.' });
    } finally {
      setIsLoading(false);
    }
  }, [serverId, toast]);

  const totalLogPages = Math.ceil(logs.length / LOGS_PER_PAGE);
  const displayedLogs = logs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  return (
    <Card>
        <CardContent className="p-6">
            <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Reload
                </Button>
            </div>
            {isLoading && logs.length === 0 ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="border rounded-md px-4 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-6 w-32" />
                            </div>
                            <Skeleton className="h-4 w-28" />
                        </div>
                    ))}
                </div>
            ) : displayedLogs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {displayedLogs.map(log => (
                        <AccordionItem key={log.id} value={log.id} className="border rounded-md px-4">
                            <AccordionTrigger className="w-full text-left py-3 hover:no-underline group">
                                <div className="flex-1 flex justify-between items-center pr-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <LogStatusBadge status={log.status} />
                                        <p className="font-semibold text-base truncate">{log.command.length > 30 ? 'Custom Command' : log.command}</p>
                                    </div>
                                    <span className="text-muted-foreground text-sm">
                                        {formatDistanceToNow(new Date(log.runAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">Command</h4>
                                        <div className="bg-black text-white p-3 rounded-md font-mono text-xs border whitespace-pre-wrap overflow-x-auto">
                                            {log.command}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">Output</h4>
                                        <div className="bg-black text-white p-3 rounded-md font-mono text-xs border whitespace-pre-wrap overflow-x-auto max-h-64">
                                            {log.output || "No output."}
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center p-8 text-muted-foreground">No commands have been run on this server yet.</div>
            )}
        </CardContent>
        {totalLogPages > 1 && (
            <CardFooter className="flex justify-end gap-2 pt-4 border-t">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalLogPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                >
                    Next
                </Button>
            </CardFooter>
        )}
    </Card>
  );
}
