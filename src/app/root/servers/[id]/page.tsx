
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Trash2, Edit, Save, X, Terminal, Loader2, ArrowLeft } from 'lucide-react';
import { getServer, updateServer, deleteServer } from '@/app/servers/actions';
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
} from "@/components/ui/alert-dialog";
import Link from 'next/link';

type Server = {
  id: string;
  name: string;
  username: string;
  type: string;
  provider: string;
  ram: string;
  storage: string;
  publicIp: string;
};

// Private fields are handled separately and not included in the main Server type
type EditableServer = Partial<Server> & { privateIp?: string; privateKey?: string };

export default function RootServerDetailPage() {
  const params = useParams();
  const id = params.id as string;
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
        router.push('/root/servers');
      }
    } catch (e: any) {
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
      const { id: serverId, ...updateData } = editedServer;
      
      const dataToUpdate: Partial<EditableServer> = { ...updateData };
      if (dataToUpdate.ram && !String(dataToUpdate.ram).endsWith('MB')) {
        dataToUpdate.ram = `${dataToUpdate.ram}MB`;
      }
       if (dataToUpdate.storage && !String(dataToUpdate.storage).endsWith('GB')) {
        dataToUpdate.storage = `${dataToUpdate.storage}GB`;
      }

      await updateServer(id, dataToUpdate);
      
      toast({ title: 'Server Updated', description: 'Server details have been saved.' });
      setIsEditMode(false);
      setShowPrivateIpInput(false);
      setShowPrivateKeyInput(false);
      fetchServer(id);
    } catch (e: any) {
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
      router.push('/root/servers');
    } catch (e: any