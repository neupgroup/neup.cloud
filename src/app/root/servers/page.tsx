'use client';

import { PlusCircle, MoreHorizontal, Trash2, ServerIcon as ServerIconLucide, User, RefreshCcw, Loader2, CheckCircle, Edit } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getServers, deleteServer } from "@/app/servers/actions";
import { ServerCardSkeleton } from "@/app/servers/server-card-skeleton";
import { Button } from "@/components/ui/button";
import type { Server } from "@/app/servers/page";

function AdminServerCard({ server, onServerDeleted }: { server: Server, onServerDeleted: (id: string) => void }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteServer(server.id);
            toast({
                title: "Server Deleted",
                description: "The server has been successfully deleted.",
            });
            onServerDeleted(server.id);
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "There was a problem deleting the server.",
            });
        }
    };
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-xl flex items-center gap-2">
                             <ServerIconLucide className="h-5 w-5 text-muted-foreground" />
                             {server.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 pt-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {server.username}@{server.publicIp}
                        </CardDescription>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <DropdownMenuItem asChild>
                                <Link href={`/root/servers/${server.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    View / Edit
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-semibold text-foreground">OS:</span> {server.type}</p>
                    <p><span className="font-semibold text-foreground">Provider:</span> {server.provider}</p>
                    <p><span className="font-semibold text-foreground">RAM:</span> {server.ram}</p>
                    <p><span className="font-semibold text-foreground">Storage:</span> {server.storage}</p>
                 </div>
            </CardContent>
        </Card>
    );
}


export default function RootServersPage() {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const serversData = await getServers() as Server[];
      setServers(serversData);
    } catch (err: any) {
      setError(err);
      toast({
        variant: "destructive",
        title: "Error fetching servers",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);
  
  const handleServerDeleted = (id: string) => {
    setServers(prev => prev.filter(s => s.id !== id));
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Manage Servers</h1>
          <p className="text-muted-foreground">
            Add, edit, and delete your virtual private servers.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/root/servers/add">
            <Card 
                className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors h-full"
            >
                <PlusCircle className="h-10 w-10 text-muted-foreground mb-2"/>
                <h3 className="text-lg font-semibold">Create New Server</h3>
                <p className="text-muted-foreground text-sm">Provision a new virtual server.</p>
            </Card>
        </Link>
        {isLoading ? (
            <>
                <ServerCardSkeleton />
                <ServerCardSkeleton />
            </>
        ) : error ? (
            <Card className="text-center p-6 text-destructive md:col-span-2">Error loading servers: {error.message}</Card>
        ) : (
            servers.map((server) => (
                <AdminServerCard 
                    key={server.id} 
                    server={server} 
                    onServerDeleted={handleServerDeleted} 
                />
            ))
        )}
      </div>
    </div>
  );
}