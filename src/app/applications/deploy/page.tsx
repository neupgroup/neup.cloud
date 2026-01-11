
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

    // Repo is now optional. Language is required.
    if (!name || !applicationLocation || !language || !startCommand) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out Name, Location, Language, and Start Command.",
      });
      setIsLoading(false);
      return;
    }

    const ports = allowedPorts.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));

    const applicationData = {
      name,
      repo, // Optional
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

        {/* Initial Info */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Application Name</Label>
            <Input id="name" placeholder="my-app" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">App Location</Label>
            <Input id="location" placeholder="/var/www/app" value={applicationLocation} onChange={(e) => setApplicationLocation(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Language / Framework</Label>
            <div className="flex flex-wrap gap-2">
              {['next', 'custom'].map((lang) => (
                <Button
                  key={lang}
                  type="button"
                  // If selected, use default (primary) variant. If not, use outline.
                  variant={language === lang ? "default" : "outline"}
                  onClick={() => setLanguage(lang)}
                  className="capitalize min-w-[100px]"
                >
                  {lang === 'next' ? 'Next.js' : 'Custom'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Extended Options - Only shown if language is selected */}
        {language && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">

            <Separator className="my-6" />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="repo">Repository URL (Optional)</Label>
                <Input id="repo" placeholder="https://github.com/user/repo.git" value={repo} onChange={(e) => setRepo(e.target.value)} />
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
          </div>
        )}
      </form>
    </div>
  );
}
