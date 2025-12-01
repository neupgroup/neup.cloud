
'use client';

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getServers } from "./actions";
import { ServerCard } from "./server-card";

export type Server = {
  id: string;
  name: string;
  type: string;
  provider: string;
  ram: string;
  storage: string;
  publicIp: string;
  privateIp: string;
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

  const handleServerDeleted = (id: string) => {
    setServers(prev => prev.filter(s => s.id !== id));
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
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} onServerDeleted={handleServerDeleted} />
          ))}
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
