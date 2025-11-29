
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
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

export default function CreateServerPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [type, setType] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [privateIp, setPrivateIp] = useState('');


  const handleCreateServer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) return;

    setIsLoading(true);

    const serverData = {
      name,
      type,
      provider,
      ram,
      storage,
      publicIp,
      privateIp,
      status: 'Provisioning',
    };

    if (!serverData.name || !serverData.type || !serverData.provider || !serverData.ram || !serverData.storage || !serverData.publicIp || !serverData.privateIp) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please fill out all required fields.",
        });
        setIsLoading(false);
        return;
    }

    try {
      await addDoc(collection(firestore, 'servers'), serverData);
      toast({
        title: 'Server Created',
        description: 'Your new server is being provisioned.',
      });
      router.push('/servers');
    } catch (e) {
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
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
                 <div className="grid gap-2">
                    <Label htmlFor="ram">RAM</Label>
                    <Input id="ram" name="ram" placeholder="e.g., 8GB" value={ram} onChange={(e) => setRam(e.target.value)} />
                  </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="storage">Storage</Label>
                    <Input id="storage" name="storage" placeholder="e.g., 160GB SSD" value={storage} onChange={(e) => setStorage(e.target.value)} />
                  </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="publicIp">Public IP</Label>
                    <Input id="publicIp" name="publicIp" placeholder="e.g., 8.8.8.8" value={publicIp} onChange={(e) => setPublicIp(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="privateIp">Private IP</Label>
                    <Input id="privateIp" name="privateIp" placeholder="e.g., 192.168.1.1" value={privateIp} onChange={(e) => setPrivateIp(e.target.value)} />
                </div>
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
