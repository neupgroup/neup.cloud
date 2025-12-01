
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { ArrowLeft, Trash2, Edit, Save, X } from 'lucide-react';
import { getServer, updateServer, deleteServer } from '../actions';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Server = {
  id: string;
  name: string;
  type: string;
  provider: string;
  ram: string;
  storage: string;
  publicIp: string;
};

// Private fields are handled separately and not included in the main Server type
type EditableServer = Partial<Server> & { privateIp?: string; privateKey?: string };

export default function ServerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [server, setServer] = useState<Server | null>(null);
  const [editedServer, setEditedServer] = useState<EditableServer>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrivateIpInput, setShowPrivateIpInput] = useState(false);
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);

  const fetchServer = useCallback(async (serverId: string) => {
    setIsLoading(true);
    try {
      const serverData = await getServer(serverId) as Server | null;
      if (serverData) {
        setServer(serverData);
        setEditedServer(serverData);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Server not found.' });
        router.push('/servers');
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch server data.' });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    if (id) {
      fetchServer(id);
    }
  }, [id, fetchServer]);

  const handleEditToggle = () => {
    if (isEditMode) {
      setEditedServer(server || {});
      setShowPrivateIpInput(false);
      setShowPrivateKeyInput(false);
    }
    setIsEditMode(!isEditMode);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedServer(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditedServer(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    if (!editedServer) return;
    setIsSaving(true);
    try {
      // Ensure ID is not passed in the update payload
      const { id: serverId, ...updateData } = editedServer;
      
      await updateServer(id, updateData);
      
      toast({ title: 'Server Updated', description: 'Server details have been saved.' });
      setIsEditMode(false);
      setShowPrivateIpInput(false);
      setShowPrivateKeyInput(false);
      fetchServer(id);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update server.' });
    } finally {
      setIsSaving(false);
    }
  };

   const handleDeleteServer = async () => {
    try {
      await deleteServer(id);
      toast({ title: 'Server Deleted', description: 'The server has been permanently deleted.' });
      router.push('/servers');
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete server.' });
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent className="grid gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
      </div>
    )
  }

  if (!server) {
    return null;
  }
  
  return (
    <div className="grid gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/servers">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{server.name}</h1>
            <p className="text-muted-foreground">Manage your server details and settings.</p>
        </div>
      </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="font-headline">Server Details</CardTitle>
                    <CardDescription>
                        {isEditMode ? "You are currently in edit mode." : "View your server configuration."}
                    </CardDescription>
                </div>
                 <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <Button variant="outline" onClick={handleEditToggle} disabled={isSaving}><X className="mr-2 h-4 w-4" />Cancel</Button>
                      <Button onClick={handleSaveChanges} disabled={isSaving}>{isSaving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save</>}</Button>
                    </>
                  ) : (
                    <Button onClick={handleEditToggle}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                  )}
                </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Server Name</Label>
                {isEditMode ? <Input id="name" name="name" value={editedServer.name || ''} onChange={handleInputChange} /> : <p className="text-base">{server.name}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="provider">Provider</Label>
                 {isEditMode ? (
                    <Select name="provider" value={editedServer.provider || ''} onValueChange={(v) => handleSelectChange('provider', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                        <SelectItem value="aws">AWS</SelectItem>
                        <SelectItem value="gcp">Google Cloud</SelectItem>
                      </SelectContent>
                    </Select>
                ) : <p className="text-base">{server.provider}</p>}
              </div>

              <div className="grid gap-2">
                  <Label htmlFor="type">Operating System Type</Label>
                   {isEditMode ? (
                      <Select name="type" value={editedServer.type || ''} onValueChange={(v) => handleSelectChange('type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Linux">Linux</SelectItem>
                          <SelectItem value="Windows">Windows</SelectItem>
                        </SelectContent>
                      </Select>
                  ) : <p className="text-base">{server.type}</p>}
              </div>

              <div className="grid gap-2">
                  <Label htmlFor="ram">RAM</Label>
                  {isEditMode ? (
                       <div className="relative">
                          <Input id="ram" name="ram" type="number" value={editedServer.ram?.replace('MB', '') || ''} onChange={handleInputChange} className="pr-12"/>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">MB</span>
                      </div>
                  ) : <p className="text-base">{server.ram}</p>}
              </div>

              <div className="grid gap-2">
                  <Label htmlFor="storage">Storage</Label>
                  {isEditMode ? (
                      <div className="relative">
                          <Input id="storage" name="storage" type="number" value={editedServer.storage?.replace('GB', '') || ''} onChange={handleInputChange} className="pr-12" />
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">GB</span>
                      </div>
                  ) : <p className="text-base">{server.storage}</p>}
              </div>

              <div className="grid gap-2">
                  <Label htmlFor="publicIp">Public IP</Label>
                   {isEditMode ? <Input id="publicIp" name="publicIp" value={editedServer.publicIp || ''} onChange={handleInputChange} /> : <p className="text-base">{server.publicIp}</p>}
              </div>
            
              {isEditMode && (
                <>
                  <div className="grid gap-2">
                    <Label>Private IP</Label>
                    {showPrivateIpInput ? (
                      <Input id="privateIp" name="privateIp" value={editedServer.privateIp || ''} onChange={handleInputChange} placeholder="Enter new IP to update" />
                    ) : (
                      <Button variant="outline" onClick={() => setShowPrivateIpInput(true)}>Update Private IP</Button>
                    )}
                  </div>

                  <div className="grid gap-2">
                      <Label>Private Key</Label>
                      {showPrivateKeyInput ? (
                        <Textarea id="privateKey" name="privateKey" value={editedServer.privateKey || ''} onChange={handleInputChange} className="font-mono h-32" placeholder="Enter new private key to update" />
                      ) : (
                        <Button variant="outline" onClick={() => setShowPrivateKeyInput(true)}>Update Private Key</Button>
                      )}
                  </div>
                </>
              )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Server</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the server
                    and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteServer}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
    </div>
  );
}
