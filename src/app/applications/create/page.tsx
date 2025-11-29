
'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createApplication } from '../actions';
import { getServers } from '@/app/servers/actions';

type Server = {
    id: string;
    name: string;
}

export default function CreateApplicationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [repo, setRepo] = useState('');
  const [serverId, setServerId] = useState('');
  const [servers, setServers] = useState<Server[]>([]);

  useEffect(() => {
    async function fetchServers() {
        try {
            const serversData = await getServers() as Server[];
            setServers(serversData);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error fetching servers',
                description: 'Could not fetch the server list for selection.',
            });
        }
    }
    fetchServers();
  }, [toast]);


  const handleCreateApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    if (!name || !repo || !serverId) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please fill out all required fields.",
        });
        setIsLoading(false);
        return;
    }

    const applicationData = {
      name,
      repo,
      serverId,
      status: 'Building',
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
            </div>

            <div className="grid gap-2">
                <Label htmlFor="server">Deploy to Server</Label>
                <Select name="server" value={serverId} onValueChange={setServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.length > 0 ? (
                        servers.map(server => (
                            <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                        ))
                    ) : (
                        <SelectItem value="loading" disabled>Loading servers...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
