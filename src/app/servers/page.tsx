
'use client';

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Cookies from 'universal-cookie';

import {
  Card,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getServers } from "./actions";
import { ServerCard } from "./server-card";
import { ServerCardSkeleton } from "./server-card-skeleton";

export type Server = {
  id: string;
  name: string;
  username: string;
  type: string;
  provider: string;
  ram?: string;
  storage?: string;
  publicIp: string;
  privateIp: string;
};

export default function VpsPage() {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  useEffect(() => {
    const cookies = new Cookies(null, { path: '/' });
    setSelectedServerId(cookies.get('selected_server'));
  }, []);

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

  const handleServerSelected = (id: string) => {
    setSelectedServerId(id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Servers</h1>
          <p className="text-muted-foreground">
            Manage your virtual private servers.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Link href="/servers/create">
          <Card
            className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold">Create New Server</h3>
            <p className="text-muted-foreground text-sm">Provision a new virtual server.</p>
          </Card>
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <ServerCardSkeleton />
            <ServerCardSkeleton />
          </div>
        ) : error ? (
          <Card className="text-center p-6 text-destructive">Error loading servers: {error.message}</Card>
        ) : servers.length > 0 ? (
          <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
            {servers.map((server, index) => (
              <ServerCard
                key={server.id}
                server={server}
                onServerDeleted={handleServerDeleted}
                onServerSelected={handleServerSelected}
                isSelected={selectedServerId === server.id}
                className={index !== servers.length - 1 ? "border-b border-border" : ""}
              />
            ))}
          </Card>
        ) : (
          <Card className="text-center p-8 text-muted-foreground">
            No servers found. Create one to get started.
          </Card>
        )}
      </div>
    </div>
  );
}
