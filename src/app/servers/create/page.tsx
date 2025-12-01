
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
import { createServer } from '../actions';
import { Textarea } from '@/components/ui/textarea';

export default function CreateServerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('root');
  const [provider, setProvider] = useState('');
  const [type, setType] = useState('');
  const [ram, setRam] = useState('4096');
  const [storage, setStorage] = useState('100');
  const [publicIp, setPublicIp] = useState('');
  const [privateIp, setPrivateIp] = useState('');
  const [privateKey, setPrivateKey] = useState('');


  const handleCreateServer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const serverData = {
      name,
      username,
      type,
      provider,
      ram: `${ram}MB`,
      storage: `${storage}GB`,
      publicIp,
      privateIp,
      privateKey,
    };

    if (!serverData.name || !serverData.username || !serverData.type || !serverData.provider || !serverData.ram || !serverData.storage || !serverData.publicIp) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please fill out all required fields except for Private IP and Private Key.",
        });
        setIsLoading(false);
        return;
    }

    try {
      await createServer(serverData);
      toast({
        title: 'Server Created',
        description: 'Your new server is being provisioned.',
      });
      router.push('/servers');
    } catch (e: any) {
      console.error('Error adding document: ', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not create the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/servers">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Create Server</h1>
      </div>
      <form onSubmit={handleCreateServer}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">New Server Configuration</CardTitle>
            <CardDescription>
              Configure and launch a new VPS instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Server Name</Label>
                <Input id="name" name="name" placeholder="e.g., web-server-01" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" placeholder="e.g., root" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="provider">Provider</Label>
                <Select name="provider" value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="gcp">Google Cloud</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                    <Label htmlFor="type">Operating System Type</Label>
                    <Select name="type" value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Linux">Linux</SelectItem>
                        <SelectItem value="Windows">Windows</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 <div className="grid gap-2">
                    <Label htmlFor="ram">RAM</Label>
                    <div className="relative">
                        <Input id="ram" name="ram" type="number" placeholder="e.g., 4096" value={ram} onChange={(e) => setRam(e.target.value)} className="pr-12"/>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">MB</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storage">Storage</Label>
                     <div className="relative">
                        <Input id="storage" name="storage" type="number" placeholder="e.g., 100" value={storage} onChange={(e) => setStorage(e.target.value)} className="pr-12" />
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">GB</span>
                    </div>
                  </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                   <div className="grid gap-2">
                    <Label htmlFor="publicIp">Public IP</Label>
                    <Input id="publicIp" name="publicIp" placeholder="e.g., 8.8.8.8" value={publicIp} onChange={(e) => setPublicIp(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="privateIp">Private IP (Optional)</Label>
                    <Input id="privateIp" name="privateIp" placeholder="e.g., 192.168.1.1" value={privateIp} onChange={(e) => setPrivateIp(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="privateKey">Private Key (Optional)</Label>
                <Textarea id="privateKey" name="privateKey" placeholder="Paste your SSH private key here" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} className="font-mono h-32" />
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Server'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
