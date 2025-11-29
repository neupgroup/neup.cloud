
'use client';

import {
  MoreHorizontal,
  PlusCircle,
  Power,
  Trash2,
} from "lucide-react";
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
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const handleRestart = async (id: string, currentStatus: string) => {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline">Servers</CardTitle>
            <CardDescription>
              Manage your virtual private servers.
            </CardDescription>
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>OS Type</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading servers...</TableCell>
              </TableRow>
            ) : error ? (
               <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">Error loading servers: {error.message}</TableCell>
              </TableRow>
            ) : servers && servers.length > 0 ? (
              servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>{server.publicIp}</TableCell>
                  <TableCell>{server.type}</TableCell>
                  <TableCell>{server.ram}, {server.storage}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        server.status === "Running"
                          ? "default"
                          : server.status === "Error"
                          ? "destructive"
                          : "secondary"
                      }
                      className={
                        server.status === "Running" ? "bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30" : 
                        server.status === "Provisioning" ? "bg-blue-500/20 text-blue-700 border-blue-400 hover:bg-blue-500/30" :
                        ""
                      }
                    >
                      {server.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRestart(server.id, server.status)} disabled={server.status !== 'Running' && server.status !== 'Stopped'}>
                          <Power className="mr-2 h-4 w-4" />
                          {server.status === 'Running' ? 'Stop' : 'Start'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(server.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No servers found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
