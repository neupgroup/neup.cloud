"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { PlusCircle, ChevronRight, ShoppingCart, ServerIcon, User, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import Cookies from "universal-cookie";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/core/hooks/use-toast";
import { getServers, deleteServer, selectServer } from "@/services/servers/actions";
import type { Server } from "@/services/servers/types";
import { cn } from "@/core/utils";

export const metadata = {
  title: 'Servers, Neup.Cloud',
};

function ServerCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-4 pl-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

interface ServerCardProps {
  server: Server;
  onServerDeleted: (id: string) => void;
  onServerSelected: (id: string) => void;
  isSelected?: boolean;
  className?: string;
}

function ServerCard({ server, onServerDeleted, onServerSelected, isSelected, className }: ServerCardProps) {
  const { toast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
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

  const handleSelect = async () => {
    if (isSelected || isSwitching) return;
    setIsSwitching(true);
    try {
      await selectServer(server.id, server.name);
      toast({
        title: "Server Selected",
        description: `You are now managing \"${server.name}\".`,
      });
      onServerSelected(server.id);
    } catch (error) {
      console.error("Error selecting server: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem selecting the server.",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "group flex items-center justify-between p-4 min-w-0 w-full transition-all hover:bg-muted/50 cursor-pointer",
        isSelected && "bg-muted/50",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-medium text-foreground break-all font-mono leading-tight">
            {server.name}
          </p>
          {isSelected && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Current</span>}
          {isSwitching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 shrink-0">
            <User className="h-3.5 w-3.5" />
            <span>{server.username}@{server.publicIp}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ServerIcon className="h-3.5 w-3.5" />
            <span>{server.provider}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-semibold">{server.type}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {isSelected && (
          <Check className="h-5 w-5 text-primary" />
        )}
        <Link
          href={`/servers/${server.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">View Server Details</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  useEffect(() => {
    const cookies = new Cookies(null, { path: "/" });
    setSelectedServerId(cookies.get("selected_server"));
  }, []);

  useEffect(() => {
    const fetchServers = async () => {
      setIsLoading(true);
      try {
        const serversData = await getServers();
        setServers(serversData);
      } catch (err: any) {
          setError(err);
          toast && toast({
            variant: "destructive",
            title: "Error fetching servers",
            description: err?.message ?? "Failed to fetch servers.",
          });
      } finally {
        setIsLoading(false);
      }
    };
    fetchServers();
  }, [toast]);

  const handleServerDeleted = (id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleServerSelected = (id: string) => {
    setSelectedServerId(id);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Servers</h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
          <div className="flex flex-col gap-4">
            <Button variant="outline" onClick={() => window.location.href = "/servers/add"}>Add New Server</Button>
            <Button variant="outline" onClick={() => window.location.href = "/servers/purchase"}>Purchase Managed Server</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
