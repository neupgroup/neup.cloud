'use client';

import { PlusCircle, MoreHorizontal, Trash2, ServerIcon as ServerIconLucide, User, RefreshCcw, Loader2, CheckCircle, Edit, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

// Define Server type locally if not available from page import to avoid errors
type Server = {
  id: string;
  name: string;
  publicIp: string;
  privateIp: string;
  username: string;
  provider: string;
  type: string;
  ram: string;
  storage: string;
  createdAt?: any;
  updatedAt?: any;
};

const ITEMS_PER_PAGE = 10;

export default function RootServersPage() {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteServer(id);
      toast({
        title: "Server Deleted",
        description: "The server has been successfully deleted.",
      });
      handleServerDeleted(id);
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem deleting the server.",
      });
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(servers.length / ITEMS_PER_PAGE);
  const displayedServers = servers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

      {/* Static Actions: Only on Page 1 */}
      {currentPage === 1 && (
        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
          {/* Create New Server Item */}
          <Link href="/root/servers/add" className="block p-4 hover:bg-muted/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold leading-none tracking-tight text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4 mb-1">
                    Create New Server
                  </h3>
                  <p className="text-sm text-muted-foreground">Provision a new virtual server</p>
                </div>
              </div>
              <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </Card>
      )}

      {/* Dynamic Server List */}
      <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">

        {isLoading ? (
          <div className="p-4 space-y-4">
            <ServerCardSkeleton />
            <ServerCardSkeleton />
            <ServerCardSkeleton />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-destructive">Error loading servers: {error.message}</div>
        ) : displayedServers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No servers found.</div>
        ) : (
          displayedServers.map((server, index) => (
            <div key={server.id} className={`p-4 hover:bg-muted/50 transition-colors group ${index !== displayedServers.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 group-hover:underline decoration-muted-foreground/30 underline-offset-4">
                      <ServerIconLucide className="h-4 w-4 text-muted-foreground" />
                      {server.name}
                    </h3>
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-secondary/50">
                      {server.provider}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pl-6">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {server.username}@{server.publicIp}
                    </div>
                    <span className="opacity-30">•</span>
                    <div>{server.type}</div>
                    <span className="opacity-30">•</span>
                    <div>{server.ram} RAM</div>
                    <span className="opacity-30">•</span>
                    <div>{server.storage} Storage</div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
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
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(server.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Pagination Controls */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
