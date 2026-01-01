
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Monitor,
  Variable,
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
  createSavedCommand,
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type Server = {
  id: string;
  name: string;
};

type CommandVariable = {
  name: string;
  title: string;
  description?: string;
  hint?: string;
};

type SavedCommand = {
  id: string;
  name: string;
  command: string;
  description?: string;
  nextCommands?: string[];
  os: 'Linux' | 'Windows';
  variables?: CommandVariable[];
};

type CommandFormData = {
  name: string;
  command: string;
  description: string;
  nextCommands: string;
  os: string;
  variables: Record<string, Omit<CommandVariable, 'name'>>;
};

const VARIABLE_REGEX = /\{\{\[\[([a-zA-Z0-9_]+)\]\]\}\}/g;

export default function CommandsPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
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
    os: 'Linux',
    variables: {}
  });

  const [runtimeVariableValues, setRuntimeVariableValues] = useState<Record<string, string>>({});

  const detectedVariables = useMemo(() => {
    const matches = formData.command.matchAll(VARIABLE_REGEX);
    return Array.from(matches, m => m[1]);
  }, [formData.command]);

  const handleFormDataChange = (field: keyof Omit<CommandFormData, 'variables'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  const handleVariableDataChange = (varName: string, field: keyof Omit<CommandVariable, 'name'>, value: string) => {
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
  }

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [serverData, commandsData] = await Promise.all([
        getServers(),
        getSavedCommands(),
      ]);
      setServers(serverData as Server[]);
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

  const openCreateForm = () => {
    setEditingCommand(null);
    setFormData({ name: '', command: '', description: '', nextCommands: '', os: 'Linux', variables: {} });
    setIsFormOpen(true);
  };

  const openEditForm = (command: SavedCommand) => {
    setEditingCommand(command);
    const variablesObject: Record<string, Omit<CommandVariable, 'name'>> = {};
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
      os: command.os || 'Linux',
      variables: variablesObject,
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name || !formData.command || !formData.os) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name, command, and OS are required.' });
      return;
    }
    setIsSaving(true);
    try {
      const commandData = {
        name: formData.name,
        command: formData.command,
        description: formData.description,
        os: formData.os,
        nextCommands: formData.nextCommands.split(',').map(s => s.trim()).filter(Boolean),
        variables: detectedVariables.map(varName => ({
          name: varName,
          title: formData.variables[varName]?.title || varName,
          description: formData.variables[varName]?.description || '',
          hint: formData.variables[varName]?.hint || '',
        }))
      };
      if (editingCommand) {
        await updateSavedCommand(editingCommand.id, commandData);
        toast({ title: 'Command Updated', description: `The command "${formData.name}" has been updated.` });
      } else {
        await createSavedCommand(commandData);
        toast({ title: 'Command Saved', description: `The command "${formData.name}" has been saved.` });
      }
      await fetchAllData();
      setIsFormOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to ${editingCommand ? 'update' : 'save'} command.` });
    } finally {
      setIsSaving(false);
    }
  }

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
  }

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
  }

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

      {isLoading ? (
        <p className="text-center">Loading commands...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card
            className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={openCreateForm}
          >
            <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold">Create New Command</h3>
            <p className="text-muted-foreground text-sm">Save a new reusable command.</p>
          </Card>
          {savedCommands.map(sc => (
            <Card key={sc.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline text-xl flex items-center gap-2">{sc.name}
                      {sc.os && <Badge variant="secondary">{sc.os}</Badge>}
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
          ))}
        </div>
      )}


      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCommand ? 'Edit' : 'Create'} Command</DialogTitle>
            <DialogDescription>
              {editingCommand ? 'Update the details of your saved command.' : 'Save a new command to run on your servers later.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-6 p-4">
              <div className="grid gap-2">
                <Label htmlFor="command-name">Name</Label>
                <Input id="command-name" value={formData.name} onChange={(e) => handleFormDataChange('name', e.target.value)} placeholder="e.g., 'Restart Web Server'" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="command-script">Command</Label>
                <Textarea id="command-script" value={formData.command} onChange={(e) => handleFormDataChange('command', e.target.value)} placeholder="e.g., sudo apt install {{[[appName]]}}" className="font-mono h-32" />
                <p className="text-xs text-muted-foreground">Use {`{{[[variable]]}}`} to define dynamic fields.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="command-os">Operating System</Label>
                <Select value={formData.os} onValueChange={(value) => handleFormDataChange('os', value)}>
                  <SelectTrigger id="command-os">
                    <SelectValue placeholder="Select an OS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Linux"><div className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Linux</div></SelectItem>
                    <SelectItem value="Windows"><div className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Windows</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="command-desc">Description (Optional)</Label>
                <Input id="command-desc" value={formData.description} onChange={(e) => handleFormDataChange('description', e.target.value)} placeholder="A short description of what this command does." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="command-next">Next Commands (Optional)</Label>
                <Input id="command-next" value={formData.nextCommands} onChange={(e) => handleFormDataChange('nextCommands', e.target.value)} placeholder="Comma-separated command IDs" />
                <p className="text-xs text-muted-foreground">Chain commands by providing the IDs of other saved commands.</p>
              </div>

              {detectedVariables.length > 0 && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Variable className="h-5 w-5" />
                    Command Variables
                  </h3>
                  {detectedVariables.map(varName => (
                    <div key={varName} className="space-y-4 rounded-md border bg-muted/50 p-4">
                      <p className="font-mono text-sm font-semibold">{varName}</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`var-title-${varName}`}>Field Title</Label>
                          <Input id={`var-title-${varName}`} value={formData.variables[varName]?.title || ''} onChange={e => handleVariableDataChange(varName, 'title', e.target.value)} placeholder="e.g., Application Name" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`var-hint-${varName}`}>Hint (Optional)</Label>
                          <Input id={`var-hint-${varName}`} value={formData.variables[varName]?.hint || ''} onChange={e => handleVariableDataChange(varName, 'hint', e.target.value)} placeholder="e.g., my-app" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`var-desc-${varName}`}>Description (Optional)</Label>
                        <Textarea id={`var-desc-${varName}`} value={formData.variables[varName]?.description || ''} onChange={e => handleVariableDataChange(varName, 'description', e.target.value)} placeholder="Describe what this value is for." rows={2} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleFormSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Command'}
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
                        {server.name}
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
