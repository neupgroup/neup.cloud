
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Server,
  Loader2,
  PlusCircle,
  MoreHorizontal,
  Trash2,
  Edit,
  Play,
  Code,
  Terminal,
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
  updateSavedCommand,
  deleteSavedCommand,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommandForm } from './command-form';
import { SavedCommand, CommandFormData, VARIABLE_REGEX } from './types';

type ServerType = {
  id: string;
  name: string;
  type: string;
};

const COMMANDS_PER_PAGE = 10;

export default function CommandsPage() {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [selectedServer, setSelectedServer] = useState<string>('');
  const [commandToRun, setCommandToRun] = useState<SavedCommand | null>(null);
  const [editingCommand, setEditingCommand] = useState<SavedCommand | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState<CommandFormData>({
    name: '',
    command: '',
    description: '',
    nextCommands: '',
    variables: {}
  });

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

  const openEditForm = (command: SavedCommand) => {
    setEditingCommand(command);
    const variablesObject: Record<string, Omit<{ name: string; title: string; description?: string; hint?: string }, 'name'>> = {};
    if (command.variables) {
      for (const v of command.variables) {
        variablesObject[v.name] = { title: v.title, description: v.description, hint: v.hint };
      }
    }
    setFormData({
      name: command.name,
      command: command.command,
      description: command.description || '',
      nextCommands: (command.nextCommands || []).join(', '),
      variables: variablesObject,
    });
    setIsEditDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name || !formData.command) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and command are required.' });
      return;
    }
    if (!editingCommand) return;

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

      await updateSavedCommand(editingCommand.id, commandData);
      toast({ title: 'Command Updated', description: `The command "${formData.name}" has been updated.` });
      await fetchAllData();
      setIsEditDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update command: ${e.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCommand = async (commandId: string) => {
    setIsDeleting(true);
    try {
      await deleteSavedCommand(commandId);
      toast({ title: 'Command Deleted' });
      await fetchAllData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete command.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const openRunDialog = (command: SavedCommand) => {
    setCommandToRun(command);
    setRuntimeVariableValues({});

    // If command has variables or no server selected, show dialog
    // Otherwise, run directly
    if (command.variables && command.variables.length > 0) {
      setIsRunDialogOpen(true);
    } else if (!selectedServer) {
      setIsRunDialogOpen(true);
    } else {
      // Run directly
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

  // Pagination
  const totalPages = Math.ceil(savedCommands.length / COMMANDS_PER_PAGE);
  const paginatedCommands = savedCommands.slice(
    (currentPage - 1) * COMMANDS_PER_PAGE,
    currentPage * COMMANDS_PER_PAGE
  );

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Saved Commands</h1>
          <p className="text-muted-foreground">
            Create, manage, and run your reusable server commands.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/commands/custom">
              <Terminal className="mr-2 h-4 w-4" />
              Run Custom Command
            </Link>
          </Button>
          <Button asChild>
            <Link href="/commands/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Command
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col space-y-3 border rounded-lg p-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {savedCommands.length === 0 ? (
            <Card className="text-center p-8">
              <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Commands Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't saved any commands yet. Create your first command to get started.
              </p>
              <Button asChild>
                <Link href="/commands/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Command
                </Link>
              </Button>
            </Card>
          ) : (
            <>
              {paginatedCommands.map(sc => (
                <Card key={sc.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="font-headline text-xl flex items-center gap-2">
                          <Code className="h-5 w-5 text-muted-foreground" />
                          {sc.name}
                        </CardTitle>
                        <CardDescription>{sc.description || 'No description'}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="default" onClick={() => openRunDialog(sc)} disabled={isRunning}>
                          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditForm(sc)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteCommand(sc.id)} disabled={isDeleting}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}

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
            </>
          )}
        </div>
      )
      }

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Command</DialogTitle>
            <DialogDescription>
              Update the details of your saved command.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4">
              <CommandForm
                formData={formData}
                onFormDataChange={handleFormDataChange}
                onVariableDataChange={handleVariableDataChange}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleFormSubmit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
