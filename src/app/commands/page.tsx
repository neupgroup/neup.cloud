
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
import { Terminal, Send, Server, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getServers } from "../servers/actions";
import { executeCommand } from "./actions";
import { Label } from "@/components/ui/label";

type Server = {
  id: string;
  name: string;
};

export default function CommandsPage() {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string[]>([
    "Welcome to the server command line.",
    "Select a server, type a command, and press Enter to execute.",
  ]);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchServers() {
      const serverData = await getServers();
      setServers(serverData as Server[]);
    }
    fetchServers();
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !selectedServer) {
        let errorLine = "Please select a server and enter a command.";
        if (!selectedServer) {
            errorLine = "Error: No server selected.";
        } else if (!command.trim()){
            errorLine = "Error: Command cannot be empty.";
        }
        setOutput(prev => [...prev, errorLine]);
        return;
    }

    setIsLoading(true);
    setOutput(prev => [...prev, `> ${command}`]);
    setCommand("");

    const result = await executeCommand(selectedServer, command);

    if (result.error) {
        setOutput(prev => [...prev, `Error: ${result.error}`]);
    } else {
        const resultLines = result.output?.trim().split('\n') || ['Command executed successfully with no output.'];
        setOutput(prev => [...prev, ...resultLines]);
    }
    setIsLoading(false);
  };

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
        <form onSubmit={handleCommand} className="mt-4 flex gap-2 items-end">
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
            <Input
                id="command-input"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command..."
                className="font-mono"
                disabled={isLoading}
            />
          </div>
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
