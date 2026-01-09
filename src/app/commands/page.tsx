
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Server,
  Loader2,
  PlusCircle,
  Play,
  Code,
  Terminal,
  Search,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getServers } from '../servers/actions';
import {
  getSavedCommands,
  executeSavedCommand,
} from './actions';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SavedCommand } from './types';
import { cn } from '@/lib/utils';

type ServerType = {
  id: string;
  name: string;
  type: string;
};

const COMMANDS_PER_PAGE_FIRST = 8;
const COMMANDS_PER_PAGE_SUBSEQUENT = 10;

function LoadingSkeleton() {
  return (
    <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
      {[...Array(9)].map((_, i) => (
        <div key={i} className={cn(
          "p-4 min-w-0 w-full",
          i !== 8 && "border-b border-border"
        )}>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </Card>
  )
}

function CommandsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [servers, setServers] = useState<ServerType[]>([]);
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [selectedServer, setSelectedServer] = useState<string>('');
  const [commandToRun, setCommandToRun] = useState<SavedCommand | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [runtimeVariableValues, setRuntimeVariableValues] = useState<Record<string, string>>({});

  // Load selected server from cookies
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    const serverIdCookie = getCookie('selected_server');
    if (serverIdCookie) {
      setSelectedServer(serverIdCookie);
    }
  }, []);

  // Sync state with URL params if they change externally
  useEffect(() => {
    const query = searchParams.get('query');
    if (query !== null && query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('query', val);
    } else {
      params.delete('query');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [serverData, commandsData] = await Promise.all([
        getServers(),
        getSavedCommands(),
      ]);
      setServers(serverData as ServerType[]);
      setSavedCommands(commandsData as SavedCommand[]);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch initial data.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const openRunDialog = (e: React.MouseEvent, command: SavedCommand) => {
    e.stopPropagation(); // Prevent navigation to detail page
    setCommandToRun(command);
    setRuntimeVariableValues({});

    if (command.variables && command.variables.length > 0) {
      setIsRunDialogOpen(true);
    } else if (!selectedServer) {
      setIsRunDialogOpen(true);
    } else {
      handleRunCommandDirect(command, selectedServer, {});
    }
  };

  const handleRunCommandDirect = async (command: SavedCommand, serverId: string, variables: Record<string, string>) => {
    setIsRunning(true);
    try {
      await executeSavedCommand(serverId, command.id, variables);
      toast({ title: 'Execution Started', description: `Running "${command.name}" on the selected server. Check history for output.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Execution Failed', description: e.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCommand = async () => {
    if (!commandToRun || !selectedServer) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must select a command and a server.' });
      return;
    }
    setIsRunning(true);
    try {
      await executeSavedCommand(selectedServer, commandToRun.id, runtimeVariableValues);
      toast({ title: 'Execution Started', description: `Running "${commandToRun.name}" on the selected server. Check history for output.` });
      setIsRunDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Execution Failed', description: e.message });
    } finally {
      setIsRunning(false);
    }
  };

  const filteredCommands = savedCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cmd.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.command.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Logic
  // Page 1: 8 dynamic items + 2 static items = 10 items total
  // Page 2+: 10 dynamic items
  const totalItems = filteredCommands.length;
  // If we have more than 8 items, subsequent pages have 10 each.
  // Total pages = 1 + ceil((total - 8) / 10)
  const totalPages = totalItems <= COMMANDS_PER_PAGE_FIRST
    ? 1
    : 1 + Math.ceil((totalItems - COMMANDS_PER_PAGE_FIRST) / COMMANDS_PER_PAGE_SUBSEQUENT);

  const getPaginatedCommands = () => {
    if (currentPage === 1) {
      return filteredCommands.slice(0, COMMANDS_PER_PAGE_FIRST);
    }
    const start = COMMANDS_PER_PAGE_FIRST + (currentPage - 2) * COMMANDS_PER_PAGE_SUBSEQUENT;
    const end = start + COMMANDS_PER_PAGE_SUBSEQUENT;
    return filteredCommands.slice(start, end);
  };

  const paginatedCommands = getPaginatedCommands();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Saved Commands</h1>
          <p className="text-muted-foreground">
            Create, manage, and run your reusable server commands.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
          autoFocus={!!searchQuery}
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Static Actions: Only on Page 1 and no search query */}
          {currentPage === 1 && !searchQuery && (
            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
              {/* Create New Command */}
              <div
                className={cn(
                  "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4 cursor-pointer border-b border-border",
                )}
                onClick={() => router.push('/commands/create')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0 h-8">
                    <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4">
                      Create New Command
                    </h3>

                    {/* Arrow Icon */}
                    <div className="flex items-center gap-1">
                      <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Build a reusable command for your servers
                  </p>
                </div>
              </div>

              {/* Run Custom Command */}
              <div
                className={cn(
                  "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4 cursor-pointer",
                )}
                onClick={() => router.push('/commands/custom')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0 h-8">
                    <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4">
                      Run Custom Command
                    </h3>

                    {/* Arrow Icon */}
                    <div className="flex items-center gap-1">
                      <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Execute a one-off command without saving
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Dynamic Commands List */}
          {savedCommands.length > 0 && (
            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
              {filteredCommands.length === 0 && searchQuery ? (
                <div className="text-center p-12 text-muted-foreground">
                  <p>No commands found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                paginatedCommands.map((sc, index) => (
                  <div
                    key={sc.id}
                    className={cn(
                      "p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4 cursor-pointer",
                      // Add border bottom unless it's the very last item of the list
                      index !== paginatedCommands.length - 1 && "border-b border-border"
                    )}
                    onClick={() => router.push(`/commands/${sc.id}`)}
                  >
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0">
                        <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4">
                          {sc.name}
                        </h3>

                        {/* Quick Action: Run - Always Visible */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/80"
                            onClick={(e) => openRunDialog(e, sc)}
                            disabled={isRunning}
                            title="Run Command"
                          >
                            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {sc.description || <span className="italic">No description provided</span>}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          )}

          {/* Empty state when no saved commands and we are on page 1 (since static actions are separate) */}
          {savedCommands.length === 0 && !searchQuery && (
            // No saved commands, just show nothing extra (or maybe a hint, but the static cards are there)
            null
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Run Command Dialog */}
      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Command: {commandToRun?.name}</DialogTitle>
            <DialogDescription>Select a server and provide values for any variables to execute this command.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="text-sm font-mono bg-muted p-3 rounded-md border whitespace-pre-wrap">{commandToRun?.command}</div>

            {commandToRun?.variables && commandToRun.variables.length > 0 && (
              <div className="space-y-4">
                {commandToRun.variables.map(variable => (
                  <div key={variable.name} className="grid gap-2">
                    <Label htmlFor={`runtime-var-${variable.name}`}>{variable.title}</Label>
                    {variable.description && <p className="text-xs text-muted-foreground">{variable.description}</p>}
                    <Input
                      id={`runtime-var-${variable.name}`}
                      value={runtimeVariableValues[variable.name] || ''}
                      onChange={e => setRuntimeVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                      placeholder={variable.hint}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="server-select">Server</Label>
              <Select onValueChange={setSelectedServer} value={selectedServer}>
                <SelectTrigger id="server-select">
                  <SelectValue placeholder="Select a server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        {server.name} ({server.type})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button onClick={handleRunCommand} disabled={!selectedServer || isRunning}>
              {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Executing...</> : 'Run on Server'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}

export default function CommandsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CommandsContent />
    </Suspense>
  )
}
