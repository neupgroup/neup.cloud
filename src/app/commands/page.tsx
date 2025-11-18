"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Terminal, Send } from "lucide-react";

export default function CommandsPage() {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string[]>([
      "Welcome to the server command line.",
      "Type a command and press Enter to execute.",
  ]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const newOutput = [...output, `> ${command}`];
    
    // Mock command execution
    if (command === 'ls -la') {
        newOutput.push('drwxr-xr-x 4 user group 4096 Jul 22 10:00 .');
        newOutput.push('drwxr-xr-x 1 user group 4096 Jul 22 09:00 ..');
        newOutput.push('-rw-r--r-- 1 user group 1024 Jul 22 10:00 app.js');
    } else if (command === 'status') {
        newOutput.push('All systems nominal.');
    } else {
        newOutput.push(`command not found: ${command}`);
    }

    setOutput(newOutput);
    setCommand("");
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
                {line.startsWith('>') && <span className="text-green-400 mr-2">{line.slice(0,1)}</span>}
                <p>{line.startsWith('>') ? line.slice(1) : line}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleCommand} className="mt-4 flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command..."
            className="flex-grow font-mono"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}