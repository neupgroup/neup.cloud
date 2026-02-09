
'use client';

import { PlusCircle, ChevronRight, ShoppingCart } from "lucide-react";
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
        {/* Set 1: Actions */}
        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
          {/* Add Server Item */}
          <Link href="/servers/add" className="block p-4 border-b border-border hover:bg-muted/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold leading-none tracking-tight text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4 mb-1">
                    Connect Existing Server
                  </h3>
                  <p className="text-sm text-muted-foreground">Add a VPS from any provider via SSH</p>
                </div>
              </div>
              <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
          {/* Purchase Server Item */}
          <Link href="/servers/purchase" className="block p-4 hover:bg-muted/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-none tracking-tight text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4 mb-1">
                    Purchase Server
                  </h3>
                  <p className="text-sm text-muted-foreground">Buy a managed server directly (Coming Soon)</p>
                </div>
              </div>
              <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </Card>

        {/* Set 2: Server List */}
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
            No servers found. Connect one to get started.
          </Card>
        )}
      </div>
    </div>
  );
}
