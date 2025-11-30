
'use client';

import { MoreHorizontal, PlusCircle, Power, Trash2, ServerIcon } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getServers, deleteServer, updateServerStatus } from "./actions";

type Server = {
  id: string;
  name: string;
  type: string;
  provider: string;
  ram: string;
  storage: string;
  publicIp: string;
  privateIp: string;
  status: 'Running' | 'Provisioning' | 'Error' | 'Stopped';
};

export default function VpsPage() {
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

  const handleDelete = async (id: string) => {
    try {
      await deleteServer(id);
      toast({
        title: "Server Deleted",
        description: "The server has been successfully deleted.",
      });
      fetchServers();
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem deleting the server.",
      });
    }
  };

  const handleStatusUpdate = async (id: string, currentStatus: string) => {
    try {
      await updateServerStatus(id, currentStatus);
      toast({
        title: "Server Status Updated",
        description: `The server status is being updated.`,
      });
      fetchServers();
    } catch (error) {
      console.error("Error updating document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem updating the server status.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Servers</h1>
          <p className="text-muted-foreground">
            Manage your virtual private servers.
          </p>
        </div>
        <Button size="sm" className="gap-1" asChild>
          <Link href="/servers/create">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Create Server
            </span>
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center">Loading servers...</div>
      ) : error ? (
        <div className="text-center text-destructive">Error loading servers: {error.message}</div>
      ) : servers && servers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const statusVariant =
              server.status === "Running"
                ? "default"
                : server.status === "Error"
                ? "destructive"
                : "secondary";
            const statusClass =
              server.status === "Running"
                ? "bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30"
                : server.status === "Provisioning"
                ? "bg-blue-500/20 text-blue-700 border-blue-400 hover:bg-blue-500/30"
                : "";

            return (
              <Card key={server.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-headline text-xl">
                        <Link href={`/servers/${server.id}`} className="hover:underline flex items-center gap-2">
                           <ServerIcon className="h-5 w-5 text-muted-foreground" />
                           {server.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{server.publicIp}</CardDescription>
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
                          <DropdownMenuItem onClick={() => handleStatusUpdate(server.id, server.status)} disabled={server.status !== 'Running' && server.status !== 'Stopped'}>
                            <Power className="mr-2 h-4 w-4" />
                            {server.status === 'Running' ? 'Stop' : 'Start'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(server.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <Badge variant={statusVariant} className={statusClass}>
                    {server.status}
                  </Badge>
                  <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-semibold text-foreground">OS:</span> {server.type}</p>
                      <p><span className="font-semibold text-foreground">Provider:</span> {server.provider}</p>
                      <p><span className="font-semibold text-foreground">Specs:</span> {server.ram}, {server.storage}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
            <CardContent className="p-6 text-center">
                <p>No servers found.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
