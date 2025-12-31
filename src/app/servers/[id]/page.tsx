

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
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
import { Trash2, Edit, Save, X, Terminal, Loader2, ArrowLeft, HardDrive, Power, RefreshCw, ChevronDown, FolderKanban } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { runCustomCommandOnServer, getServerLogs, rebootServer } from './actions';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

type ServerLog = {
    id: string;
    command: string;
    output: string;
    status: 'Success' | 'Error' | 'pending';
    runAt: string;
}

// Private fields are handled separately and not included in the main Server type
type EditableServer = Partial<Server> & { privateIp?: string; privateKey?: string };


const LOGS_PER_PAGE = 5;

const LogStatusBadge = ({ status }: { status: ServerLog['status'] }) => {
  const badgeMap = {
    Success: {
      variant: "default",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
      text: "Completed",
    },
    Error: {
      variant: "destructive",
      className: "",
      text: "Failed",
    },
    pending: {
      variant: "secondary",
      className: "",
      text: "Pending",
    },
  } as const;

  const badgeInfo = badgeMap[status];

  if (!badgeInfo) {
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }

  const { variant, className, text } = badgeInfo;

  return <Badge variant={variant} className={className}>{text}</Badge>;
};


export default function ServerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [server, setServer] = useState<Server | null>(null);
  const [editedServer, setEditedServer] = useState<EditableServer>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [showPrivateIpInput, setShowPrivateIpInput] = useState(false);
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);
  const [command, setCommand] = useState('');
  const [isCommandRunning, setIsCommandRunning] = useState(false);
  const [commandOutput, setCommandOutput] = useState('');
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  
  const currentPage = parseInt(searchParams.get('commandLogPage') || '1', 10);
  
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

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
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch server data.' });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

   const fetchServerLogs = useCallback(async (serverId: string) => {
    setIsLogsLoading(true);
    try {
      const logs = await getServerLogs(serverId) as ServerLog[];
      setServerLogs(logs);
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch server logs.' });
    } finally {
      setIsLogsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (id) {
      fetchServer(id);
      fetchServerLogs(id);
    }
  }, [id, fetchServer, fetchServerLogs]);

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
      
      await updateServer(id, updateData);
      
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
      router.push('/servers');
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete server.' });
    }
  };

  const handleRebootServer = async () => {
    setIsRebooting(true);
    try {
        const result = await rebootServer(id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Reboot Failed', description: result.error });
        } else {
            toast({ title: 'Reboot Initiated', description: 'The server has started the reboot process.' });
            fetchServerLogs(id); // Refresh logs to show the reboot command
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsRebooting(false);
    }
  }

  const handleRunCommand = async () => {
    if (!command.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Command cannot be empty.' });
        return;
    }
    setIsCommandRunning(true);
    setCommandOutput('');
    try {
        const result = await runCustomCommandOnServer(id, command);
        if (result.error) {
            setCommandOutput(result.error);
            toast({ variant: 'destructive', title: 'Command Failed', description: result.error });
        } else {
            setCommandOutput(result.output || 'Command executed successfully.');
            toast({ title: 'Command Executed', description: 'The command has been run on the server.'});
            fetchServerLogs(id); // Re-fetch logs
        }
    } catch (e: any) {
        setCommandOutput(e.message);
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsCommandRunning(false);
        setCommand('');
    }
  }

  const totalLogPages = Math.ceil(serverLogs.length / LOGS_PER_PAGE);
  const displayedLogs = serverLogs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
      router.push(pathname + '?' + createQueryString('commandLogPage', newPage.toString()));
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
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold font-headline tracking-tight">{server?.name}</h1>
          )}
          <p className="text-muted-foreground">Manage your server details, settings, and run commands.</p>
        </div>
      </div>
      
      { isLoading ? (
          <Card>
              <CardHeader>
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="grid gap-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </CardContent>
          </Card>
        ) : !server ? null : (
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
                    <>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={isRebooting}>
                                    {isRebooting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Power className="mr-2 h-4 w-4"/>}
                                    Reboot
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to reboot?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will gracefully restart the server. This may cause a temporary service disruption.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRebootServer}>Reboot</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={handleEditToggle}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                    </>
                    )}
                </div>
            </div>
            </CardHeader>
            <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                <Label htmlFor="name">Server Name</Label>
                {isEditMode ? <Input id="name" name="name" value={editedServer.name || ''} onChange={handleInputChange} /> : <p className="text-base">{server.name}</p>}
                </div>

                <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                {isEditMode ? <Input id="username" name="username" value={editedServer.username || ''} onChange={handleInputChange} /> : <p className="text-base">{server.username}</p>}
                </div>
            </div>

                <div className="grid md:grid-cols-2 gap-6">
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
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="publicIp">Public IP</Label>
                    {isEditMode ? <Input id="publicIp" name="publicIp" value={editedServer.publicIp || ''} onChange={handleInputChange} /> : <p className="text-base">{server.publicIp}</p>}
                </div>
            
                {isEditMode && (
                    <div className="grid gap-2">
                    <Label>Private IP</Label>
                    {showPrivateIpInput ? (
                        <Input id="privateIp" name="privateIp" value={editedServer.privateIp || ''} onChange={handleInputChange} placeholder="Enter new IP to update" />
                    ) : (
                        <Button variant="outline" onClick={() => setShowPrivateIpInput(true)}>Update Private IP</Button>
                    )}
                    </div>
                )}
            </div>

                {isEditMode && (
                <div className="grid gap-2">
                    <Label>Private Key</Label>
                    {showPrivateKeyInput ? (
                    <Textarea id="privateKey" name="privateKey" value={editedServer.privateKey || ''} onChange={handleInputChange} className="font-mono h-32" placeholder="Enter new private key to update" />
                    ) : (
                    <Button variant="outline" onClick={() => setShowPrivateKeyInput(true)}>Update Private Key</Button>
                    )}
                </div>
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
      )}

      <Card>
          <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><Terminal />Run Custom Command</CardTitle>
              <CardDescription>Execute a command on this server.</CardDescription>
          </CardHeader>
          <CardContent>
                <div className="flex gap-2">
                  <Input 
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="e.g., ls -la"
                      className="font-mono"
                      disabled={isCommandRunning}
                      onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
                  />
                  <Button onClick={handleRunCommand} disabled={isCommandRunning}>
                      {isCommandRunning ? <Loader2 className="animate-spin" /> : 'Run'}
                  </Button>
                </div>
                {commandOutput && (
                  <div className="mt-4">
                      <Label>Output</Label>
                      <div className="mt-2 bg-black text-white p-4 rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                          {commandOutput}
                      </div>
                  </div>
                )}
          </CardContent>
      </Card>

      <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Command History</CardTitle>
                    <CardDescription>History of all commands run on this server.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchServerLogs(id)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload
                </Button>
            </CardHeader>
            <CardContent>
                 {isLogsLoading ? (
                    <div className="text-center p-8">Loading logs...</div>
                ) : displayedLogs.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {displayedLogs.map(log => (
                            <AccordionItem key={log.id} value={log.id} className="border rounded-md px-4">
                                <AccordionTrigger className="w-full text-left py-3 hover:no-underline group">
                                    <div className="flex-1 flex justify-between items-center pr-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <LogStatusBadge status={log.status} />
                                            <p className="font-semibold text-base truncate">Custom Command</p>
                                        </div>
                                        <span className="text-muted-foreground text-sm">
                                            {formatDistanceToNow(new Date(log.runAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Command</h4>
                                            <div className="bg-black text-white p-3 rounded-md font-mono text-xs border whitespace-pre-wrap overflow-x-auto">
                                                {log.command}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Output</h4>
                                            <div className="bg-black text-white p-3 rounded-md font-mono text-xs border whitespace-pre-wrap overflow-x-auto max-h-64">
                                                {log.output || "No output."}
                                            </div>

                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                    <div className="text-center p-8 text-muted-foreground">No commands have been run on this server yet.</div>
                )}
            </CardContent>
            {totalLogPages > 1 && (
                <CardFooter className="flex justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalLogPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                    >
                        Next
                    </Button>
                </CardFooter>
            )}
        </Card>

       <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <HardDrive className="h-6 w-6" />
                    Server Storage
                </CardTitle>
                <CardDescription>
                Manage and view storage for this server.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Storage details and management will be available here.</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                 <CardTitle className="font-headline flex items-center gap-2">
                    <FolderKanban className="h-6 w-6" />
                    File Manager
                </CardTitle>
                <CardDescription>
                    Browse and manage files on the server.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href={`/servers/${id}/files`}>Open File Manager</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
