
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { PageTitleBack } from '@/components/page-header';
import { createApplication } from '@/app/applications/actions';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      allowNetwork,
      allowedPorts: ports,
      url: '' // Default URL can be set later after deployment
    };

    try {
      await createApplication(applicationData);
      toast({
        title: 'Application Deployment Started',
        description: 'Your new application is being built.',
      });
      router.push('/applications');
    } catch (e) {
      console.error('Error adding document: ', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not create the application.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitleBack title="Deploy Application" backHref="/applications" />
      <Card>
        <form onSubmit={handleCreateApplication}>
          <CardHeader>
            <CardTitle className="font-headline">Application Details</CardTitle>
            <CardDescription>
              Configure and deploy a new application from a Git repository.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Application Name</Label>
              <Input id="name" name="name" placeholder="e.g., my-awesome-app" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repo">Repository URL</Label>
              <Input id="repo" name="repo" placeholder="e.g., https://github.com/user/repo.git" value={repo} onChange={(e) => setRepo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language">Language / Framework</Label>
              <Select onValueChange={setLanguage} value={language}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select a language or framework" />
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
              <Label htmlFor="applicationLocation">Application Location (Folder)</Label>
              <Input id="applicationLocation" name="applicationLocation" placeholder="e.g., /var/www/my-app" value={applicationLocation} onChange={(e) => setApplicationLocation(e.target.value)} />
            </div>

            <div className="grid gap-4">
              <Label>Management Commands</Label>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startCommand" className="text-sm font-normal">Start Command</Label>
                  <Textarea id="startCommand" placeholder="e.g., npm start" value={startCommand} onChange={e => setStartCommand(e.target.value)} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stopCommand" className="text-sm font-normal">Stop Command (Optional)</Label>
                  <Textarea id="stopCommand" placeholder="e.g., npm stop" value={stopCommand} onChange={e => setStopCommand(e.target.value)} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="restartCommand" className="text-sm font-normal">Restart Command (Optional)</Label>
                  <Textarea id="restartCommand" placeholder="e.g., npm restart" value={restartCommand} onChange={e => setRestartCommand(e.target.value)} rows={2} />
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label>Network</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch id="allow-network" checked={allowNetwork} onCheckedChange={setAllowNetwork} />
                  <Label htmlFor="allow-network">Allow Network Access</Label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="allowed-ports">Allowed Ports</Label>
                <Input id="allowed-ports" placeholder="e.g., 80, 443, 3000" value={allowedPorts} onChange={e => setAllowedPorts(e.target.value)} disabled={!allowNetwork} />
                <p className="text-xs text-muted-foreground">Provide a comma-separated list of ports.</p>
              </div>
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Deploying...' : 'Deploy Application'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
