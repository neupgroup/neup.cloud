
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoreHorizontal, Cpu, User, FileCode, Server as ServerIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Cookies from 'universal-cookie';
import Link from "next/link";
import { getProcesses, type Process } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


function ProcessesList({ processes }: { processes: Process[] }) {
    return (
        <Card>
            <CardHeader>
              <CardTitle className="font-headline">Running Processes</CardTitle>
              <CardDescription>
                A list of currently active processes on the server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-my-4 divide-y divide-border">
                  {processes.map((process) => (
                    <li key={process.pid} className="flex items-center justify-between gap-4 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate font-mono">
                          {process.name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{process.user}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                             <span>{process.cpu} CPU</span>
                          </div>
                           <div className="flex items-center gap-1">
                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M2 18h20M2 6h20"/></svg>
                             <span>{process.memory}% RAM</span>
                          </div>
                        </div>
                      </div>
                       <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md">{process.pid}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">Kill Process</DropdownMenuItem>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                       </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
    )
}

function LoadingSkeleton() {
    return (
         <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-2">
                        <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-12 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>
    )
}


export default function ProcessesPage() {
  const { toast } = useToast();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cookies = new Cookies();
  const serverId = cookies.get('selected_server')?.value;
  const serverName = cookies.get('selected_server_name')?.value;

  useEffect(() => {
    if (!serverId) {
        setIsLoading(false);
        return;
    };

    async function fetchProcesses() {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getProcesses(serverId);
            if (result.error) {
                setError(result.error);
                toast({ variant: 'destructive', title: 'Failed to get processes', description: result.error });
            } else if (result.processes) {
                setProcesses(result.processes);
            }
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'An unexpected error occurred', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }
    fetchProcesses();
  }, [serverId, toast]);
  
  return (
    <div className="grid gap-6">
       <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
              <FileCode className="w-8 h-8" />
              Processes
          </h1>
          {serverName ? (
              <p className="text-muted-foreground">
              Showing running processes for server: <span className="font-semibold text-foreground">{serverName}</span>
              </p>
          ) : (
              <p className="text-muted-foreground">
              No server selected. Please select a server to view its processes.
              </p>
          )}
      </div>

       {!serverId ? (
            <Card className="text-center p-8">
                <ServerIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Server Selected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Please go to the servers page and select a server to manage.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/servers">Go to Servers</Link>
                </Button>
            </Card>
        ) : isLoading ? (
            <LoadingSkeleton />
        ) : error ? (
            <Card className="p-8 text-center text-destructive">
                <p>Error loading processes: {error}</p>
            </Card>
        ) : processes.length > 0 ? (
            <ProcessesList processes={processes} />
        ) : (
             <Card className="p-8 text-center">
                <p>No running processes found or unable to fetch them.</p>
            </Card>
        )}
    </div>
  );
}

