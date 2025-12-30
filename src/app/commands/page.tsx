
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Terminal, Send, Server, Loader2, PlusCircle, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getServers } from "../servers/actions";
import { executeCommand, getSavedCommands, createSavedCommand } from "./actions";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

type Server = {
  id: string;
  name: string;
};

type SavedCommand = {
    id: string;
    name: string;
    command: string;
    description?: string;
}

export default function CommandsPage() {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string[]>([
    "Welcome to the server command line.",
    "Select a server, type a command or select a saved one, and press Enter to execute.",
  ]);
  const [servers, setServers] = useState<Server[]>([]);
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [newCommandName, setNewCommandName] = useState('');
  const [newCommandDesc, setNewCommandDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const serverData = await getServers();
      setServers(serverData as Server[]);
      const commandsData = await getSavedCommands();
      setSavedCommands(commandsData as SavedCommand[]);
    }
    fetchData();
  }, []);

  const handleCommandExecution = async (commandToRun: string) => {
    if (!commandToRun.trim() || !selectedServer) {
        let errorLine = "Please select a server and enter a command.";
        if (!selectedServer) {
            errorLine = "Error: No server selected.";
        } else if (!commandToRun.trim()){
            errorLine = "Error: Command cannot be empty.";
        }
        setOutput(prev => [...prev, errorLine]);
        return;
    }

    setIsLoading(true);
    setOutput(prev => [...prev, `> ${commandToRun}`]);
    setCommand("");

    const result = await executeCommand(selectedServer, commandToRun);

    if (result.error) {
        setOutput(prev => [...prev, `Error: ${result.error}`]);
    } else {
        const resultLines = result.output?.trim().split('\n') || ['Command executed successfully with no output.'];
        setOutput(prev => [...prev, ...resultLines]);
    }
    setIsLoading(false);
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleCommandExecution(command);
  };
  
  const handleSaveCommand = async () => {
    if (!newCommandName || !command) {
        toast({ variant: 'destructive', title: 'Error', description: 'Command name and command cannot be empty.' });
        return;
    }
    setIsSaving(true);
    try {
        await createSavedCommand({
            name: newCommandName,
            command: command,
            description: newCommandDesc,
        });
        toast({ title: 'Command Saved', description: `The command "${newCommandName}" has been saved.` });
        const commandsData = await getSavedCommands();
        setSavedCommands(commandsData as SavedCommand[]);
        setNewCommandName('');
        setNewCommandDesc('');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save command.' });
    } finally {
        setIsSaving(false);
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Command Center</CardTitle>
        <CardDescription>
          Execute commands directly on your server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-black text-white rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
          {output.map((line, index) => (
            <div key={index} className="flex">
              {line.startsWith('>') && <span className="text-green-400 mr-2">{'>'}</span>}
              <p className="whitespace-pre-wrap">{line.startsWith('>') ? line.slice(2) : line}</p>
            </div>
          ))}
          {isLoading && 
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing...</span>
            </div>
          }
        </div>
        <form onSubmit={handleFormSubmit} className="mt-4 flex gap-2 items-end">
            <div className="grid gap-2 flex-grow">
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
          <div className="grid gap-2 flex-grow-[2]">
            <Label htmlFor="command-input">Command</Label>
            <div className="flex gap-2">
                <Input
                    id="command-input"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command or select a saved one"
                    className="font-mono"
                    disabled={isLoading}
                />
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" disabled={!command || isLoading}>
                            <Save className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Save Command</DialogTitle>
                            <DialogDescription>Save the current command for later use.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-command-name">Command Name</Label>
                                <Input id="new-command-name" value={newCommandName} onChange={(e) => setNewCommandName(e.target.value)} placeholder="e.g., 'Restart Web Server'" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-command-desc">Description (Optional)</Label>
                                <Input id="new-command-desc" value={newCommandDesc} onChange={(e) => setNewCommandDesc(e.target.value)} placeholder="A short description of what this command does." />
                            </div>
                             <div className="grid gap-2">
                                <Label>Command</Label>
                                <p className="text-sm font-mono bg-muted p-2 rounded-md">{command}</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleSaveCommand} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Command'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
         <div className="mt-4">
            <Label>Saved Commands</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
                {savedCommands.map(sc => (
                    <Button key={sc.id} variant="outline" size="sm" onClick={() => handleCommandExecution(sc.command)} disabled={isLoading}>
                        {sc.name}
                    </Button>
                ))}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
