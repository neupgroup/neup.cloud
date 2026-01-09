
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PageTitleBack } from '@/components/page-header';
import { createApplication } from '@/app/applications/actions';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function CreateApplicationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState('');
  const [repo, setRepo] = useState('');
  const [language, setLanguage] = useState('');
  const [applicationLocation, setApplicationLocation] = useState('');
  const [startCommand, setStartCommand] = useState('');
  const [stopCommand, setStopCommand] = useState('');
  const [restartCommand, setRestartCommand] = useState('');
  const [allowNetwork, setAllowNetwork] = useState(false);
  const [allowedPorts, setAllowedPorts] = useState('');

  // Custom Commands State
  const [customCommands, setCustomCommands] = useState<{ name: string, command: string }[]>([]);
  const [newCmdName, setNewCmdName] = useState('');
  const [newCmdContent, setNewCmdContent] = useState('');

  const addCustomCommand = () => {
    if (!newCmdName.trim() || !newCmdContent.trim()) {
      toast({ title: "Validation Error", description: "Command Name and Command content are required.", variant: "destructive" });
      return;
    }
    setCustomCommands([...customCommands, { name: newCmdName, command: newCmdContent }]);
    setNewCmdName('');
    setNewCmdContent('');
  };

  const removeCustomCommand = (index: number) => {
    setCustomCommands(customCommands.filter((_, i) => i !== index));
  };

  const handleCreateApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    if (!name || !repo || !applicationLocation || !startCommand) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out at least Name, Repo, Location, and Start Command.",
      });
      setIsLoading(false);
      return;
    }

    const ports = allowedPorts.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));

    const applicationData = {
      name,
      repo,
      language,
      status: 'Building',
      applicationLocation,
      commands: {
        start: startCommand,
        stop: stopCommand,
        restart: restartCommand,
      },
      customCommands,
      allowNetwork,
      allowedPorts: ports,
      url: ''
    };

    try {
      await createApplication(applicationData);
      toast({
        title: 'Deployment Started',
        description: 'Your application is being created.',
      });
      router.push('/applications');
    } catch (e) {
      console.error('Error adding document: ', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not execute deployment.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full pb-10">
      <PageTitleBack title="Deploy Application" backHref="/applications" />

      <form onSubmit={handleCreateApplication} className="space-y-6 mt-6">

        {/* Core Info */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Application Name</Label>
            <Input id="name" placeholder="my-app" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="repo">Repository URL</Label>
            <Input id="repo" placeholder="https://github.com/user/repo.git" value={repo} onChange={(e) => setRepo(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="language">Language / Framework</Label>
            <Select onValueChange={setLanguage} value={language}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="html_css">HTML/CSS Only</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="next">Next.js</SelectItem>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="php">PHP</SelectItem>
                <SelectItem value="lint">Lint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Deployment Location</Label>
            <Input id="location" placeholder="/var/www/app" value={applicationLocation} onChange={(e) => setApplicationLocation(e.target.value)} />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Switch id="allow-network" checked={allowNetwork} onCheckedChange={setAllowNetwork} />
              <Label htmlFor="allow-network">Allow Network Access</Label>
            </div>
            {allowNetwork && (
              <Input
                id="allowed-ports"
                placeholder="Ports (e.g. 80, 443)"
                value={allowedPorts}
                onChange={e => setAllowedPorts(e.target.value)}
              />
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Lifecycle Commands */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Lifecycle Commands</h3>

          <div className="grid gap-2">
            <Label htmlFor="start">Start Command</Label>
            <Textarea id="start" placeholder="npm start" value={startCommand} onChange={e => setStartCommand(e.target.value)} rows={2} className="font-mono text-sm" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stop">Stop Command (Optional)</Label>
            <Textarea id="stop" placeholder="npm stop" value={stopCommand} onChange={e => setStopCommand(e.target.value)} rows={2} className="font-mono text-sm" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="restart">Restart Command (Optional)</Label>
            <Textarea id="restart" placeholder="npm restart" value={restartCommand} onChange={e => setRestartCommand(e.target.value)} rows={2} className="font-mono text-sm" />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Custom Commands */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Custom Commands</h3>

          <div className="space-y-3">
            {customCommands.map((cmd, index) => (
              <div key={index} className="flex flex-col gap-1 p-3 border rounded-md bg-muted/20 relative">
                <div className="font-medium text-sm pr-8">{cmd.name}</div>
                <div className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{cmd.command}</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomCommand(index)} className="absolute top-2 right-2 h-6 w-6 text-destructive">
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="cmdName" className="text-xs">New Command Name</Label>
              <Input id="cmdName" value={newCmdName} onChange={e => setNewCmdName(e.target.value)} placeholder="e.g. Build" className="bg-background" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cmdContent" className="text-xs">Command Script</Label>
              <Textarea id="cmdContent" value={newCmdContent} onChange={e => setNewCmdContent(e.target.value)} placeholder="npm run build" className="font-mono text-sm bg-background" rows={3} />
            </div>
            <Button type="button" onClick={addCustomCommand} variant="secondary" size="sm" className="w-auto self-start">
              <Plus className="h-4 w-4 mr-2" /> Add Command
            </Button>
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" disabled={isLoading} className="min-w-[150px]">
            {isLoading ? 'Deploying...' : 'Deploy Application'}
          </Button>
        </div>
      </form>
    </div>
  );
}
