
'use client';

import { useState, useEffect } from 'react';
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

type Server = {
  id: string;
  name: string;
};

type SavedCommand = {
  id: string;
  name: string;
  command: string;
  description?: string;
  nextCommands?: string[];
};

type CommandFormData = {
    name: string;
    command: string;
    description: string;
    nextCommands: string;
};

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
    nextCommands: ''
  });

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [serverData, commandsData] = await Promise.all([
        getServers(),
        getSavedCommands(),
      ]);
      setServers(serverData as Server[]);
      setSavedCommands(commandsData as SavedCommand[]);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch initial data.'});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const openCreateForm = () => {
    setEditingCommand(null);
    setFormData({ name: '', command: '', description: '', nextCommands: ''});
    setIsFormOpen(true);
  };
  
  const openEditForm = (command: SavedCommand) => {
    setEditingCommand(command);
    setFormData({
        name: command.name,
        command: command.command,
        description: command.description || '',
        nextCommands: (command.nextCommands || []).join(', ')
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name || !formData.command) {
      toast({ variant: 'destructive', title: 'Error', description: 'Command name and command script cannot be empty.' });
      return;
    }
    setIsSaving(true);
    try {
        const commandData = {
            name: formData.name,
            command: formData.command,
            description: formData.description,
            nextCommands: formData.nextCommands.split(',').map(s => s.trim()).filter(Boolean),
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
    setIsRunDialogOpen(true);
  }

  const handleRunCommand = async () => {
      if (!commandToRun || !selectedServer) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must select a command and a server.'});
        return;
      }
      setIsRunning(true);
      try {
        const result = await executeSavedCommand(selectedServer, commandToRun.id);
        toast({ title: 'Execution Started', description: `Running "${commandToRun.name}" on the selected server. Check server logs for output.`});
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
        <Button size="sm" onClick={openCreateForm}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Command
        </Button>
      </div>
      
      {isLoading ? (
        <p className="text-center">Loading commands...</p>
      ) : savedCommands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedCommands.map(sc => (
            <Card key={sc.id} className="flex flex-col">
              <CardHeader>
                  <div className="flex justify-between items-start">
                       <div>
                            <CardTitle className="font-headline text-xl">{sc.name}</CardTitle>
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
      ) : (
          <Card>
              <CardContent className="p-10 text-center">
                  <h3 className="text-lg font-semibold">No Saved Commands</h3>
                  <p className="text-muted-foreground mt-2">Get started by creating your first reusable command.</p>
                  <Button className="mt-4" onClick={openCreateForm}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Command
                  </Button>
              </CardContent>
          </Card>
      )}


    {/* Create/Edit Dialog */}
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingCommand ? 'Edit' : 'Create'} Command</DialogTitle>
                <DialogDescription>
                   {editingCommand ? 'Update the details of your saved command.' : 'Save a new command to run on your servers later.'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="command-name">Name</Label>
                    <Input id="command-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., 'Restart Web Server'" />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="command-script">Command</Label>
                    <Textarea id="command-script" value={formData.command} onChange={(e) => setFormData({...formData, command: e.target.value})} placeholder="e.g., systemctl restart nginx" className="font-mono" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="command-desc">Description (Optional)</Label>
                    <Input id="command-desc" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="A short description of what this command does." />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="command-next">Next Commands (Optional)</Label>
                    <Input id="command-next" value={formData.nextCommands} onChange={(e) => setFormData({...formData, nextCommands: e.target.value})} placeholder="Comma-separated command IDs" />
                    <p className="text-xs text-muted-foreground">Chain commands by providing the IDs of other saved commands.</p>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
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
                <DialogDescription>Select a server to execute this command on.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="text-sm font-mono bg-muted p-3 rounded-md border">{commandToRun?.command}</div>
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
                    {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Executing...</> : 'Run on Server'}
                 </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
}

    