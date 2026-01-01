
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
import { ArrowLeft } from 'lucide-react';
import { createApplication } from '../actions';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function CreateApplicationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [repo, setRepo] = useState('');
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
    <div className="grid gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/applications">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Deploy Application</h1>
      </div>
      <form onSubmit={handleCreateApplication}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">New Application</CardTitle>
            <CardDescription>
              Configure and deploy a new application.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Application Name</Label>
                <Input id="name" name="name" placeholder="e.g., my-awesome-app" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repo">Repository URL</Label>
                <Input id="repo" name="repo" placeholder="e.g., https://github.com/user/repo.git" value={repo} onChange={(e) => setRepo(e.target.value)} />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="applicationLocation">Application Location (Folder)</Label>
                <Input id="applicationLocation" name="applicationLocation" placeholder="e.g., /var/www/my-app" value={applicationLocation} onChange={(e) => setApplicationLocation(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4">
                <Label>Commands</Label>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="startCommand" className="text-sm font-normal">Start Command</Label>
                        <Textarea id="startCommand" placeholder="npm start" value={startCommand} onChange={e => setStartCommand(e.target.value)} rows={2} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="stopCommand" className="text-sm font-normal">Stop Command (Optional)</Label>
                        <Textarea id="stopCommand" placeholder="npm stop" value={stopCommand} onChange={e => setStopCommand(e.target.value)} rows={2} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="restartCommand" className="text-sm font-normal">Restart Command (Optional)</Label>
                        <Textarea id="restartCommand" placeholder="npm restart" value={restartCommand} onChange={e => setRestartCommand(e.target.value)} rows={2} />
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label>Network Access</Label>
                    <div className="flex items-center space-x-2 mt-2">
                        <Switch id="allow-network" checked={allowNetwork} onCheckedChange={setAllowNetwork} />
                        <Label htmlFor="allow-network">Allow Network</Label>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="allowed-ports">Allowed Ports</Label>
                    <Input id="allowed-ports" placeholder="e.g., 80, 443, 3000" value={allowedPorts} onChange={e => setAllowedPorts(e.target.value)} disabled={!allowNetwork} />
                    <p className="text-xs text-muted-foreground">Comma-separated list of ports.</p>
                </div>
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Deploying...' : 'Deploy Application'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
