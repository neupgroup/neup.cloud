
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  const [os, setOs] = useState('');
  const [plan, setPlan] = useState('standard');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');


  const handleCreateServer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) return;

    setIsLoading(true);

    const serverData = {
      name,
      os,
      plan,
      provider,
      ram,
      storage,
      ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`, // Placeholder IP
      status: 'Running', // Default status
    };

    if (!serverData.name || !serverData.os || !serverData.provider || !serverData.ram || !serverData.storage || !serverData.plan) {
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
        description: 'Your new server has been provisioned.',
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
                    <Label htmlFor="os">Operating System</Label>
                    <Select name="os" value={os} onValueChange={setOs}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an OS" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ubuntu 22.04">Ubuntu 22.04</SelectItem>
                        <SelectItem value="Debian 11">Debian 11</SelectItem>
                        <SelectItem value="CentOS 9">CentOS 9</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label>Plan</Label>
                    <RadioGroup name="plan" value={plan} onValueChange={setPlan} className="flex gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="basic" id="r1" />
                        <Label htmlFor="r1">Basic</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="r2" />
                        <Label htmlFor="r2">Standard</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pro" id="r3" />
                        <Label htmlFor="r3">Pro</Label>
                      </div>
                    </RadioGroup>
                  </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 <div className="grid gap-2">
                    <Label htmlFor="ram">RAM</Label>
                    <Input id="ram" name="ram" placeholder="e.g., 8GB" value={ram} onChange={(e) => setRam(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storage">Storage</Label>
                    <Input id="storage" name="storage" placeholder="e.g., 160GB SSD" value={storage} onChange={(e) => setStorage(e.target.value)} />
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
