
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

  const [formData, setFormData] = useState<CommandFormData>({
    name: '',
    command: '',
    description: '',
    nextCommands: '',
    variables: {}
  });

  const [runtimeVariableValues, setRuntimeVariableValues] = useState<Record<string, string>>({});

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
    setSelectedServer('');
    setRuntimeVariableValues({});
    setIsRunDialogOpen(true);
  };

  const handleRunCommand = async () => {
    if (!commandToRun || !selectedServer) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must select a command and a server.' });
      return;
    }
    setIsRunning(true);
    try {
      const result = await executeSavedCommand(selectedServer, commandToRun.id, runtimeVariableValues);
      toast({ title: 'Execution Started', description: `Running "${commandToRun.name}" on the selected server. Check server logs for output.` });
      setIsRunDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Execution Failed', description: e.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Saved Commands</h1>
          <p className="text-muted-foreground">
            Create, manage, and run your reusable server commands.
          </p>
        </div>
        <Button asChild>
          <Link href="/commands/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Command
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center">Loading commands...</p>
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
            savedCommands.map(sc => (
              <Card key={sc.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-headline text-xl flex items-center gap-2">
                        <Code className="h-5 w-5 text-muted-foreground" />
                        {sc.name}
                      </CardTitle>
                      <CardDescription>{sc.description || 'No description'}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openRunDialog(sc)}>
                          <Play className="mr-2 h-4 w-4" /> Run
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditForm(sc)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteCommand(sc.id)} disabled={isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="bg-muted p-3 rounded-md font-mono text-xs border whitespace-pre-wrap overflow-x-auto">
                    {sc.command}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => openRunDialog(sc)}>
                    <Play className="mr-2 h-4 w-4" />
                    Run Command
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

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
    </div>
  );
}
