
'use client';

import { MoreHorizontal, Trash2, ServerIcon, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import NProgress from 'nprogress';
import { usePathname } from 'next/navigation';

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
import { useToast } from "@/hooks/use-toast";
import { deleteServer, getRamUsage } from "./actions";
import type { Server } from './page';
import { Skeleton } from "@/components/ui/skeleton";

type ServerCardProps = {
  server: Server;
  onServerDeleted: (id: string) => void;
};

export function ServerCard({ server, onServerDeleted }: ServerCardProps) {
  const { toast } = useToast();
  const pathname = usePathname();
  const [usedRam, setUsedRam] = useState<number | null>(null);
  const [isRamLoading, setIsRamLoading] = useState(true);

  useEffect(() => {
    async function fetchRam() {
      setIsRamLoading(true);
      const result = await getRamUsage(server.id);
      if (result.usedRam !== undefined) {
        setUsedRam(result.usedRam);
      } else {
        console.error(`Failed to fetch RAM for ${server.name} (${server.id}):`, result.error);
      }
      setIsRamLoading(false);
    }
    fetchRam();
  }, [server.id, server.name]);

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

  const handleLinkClick = () => {
    const targetPath = `/servers/${server.id}`;
    if (pathname !== targetPath) {
      NProgress.start();
    }
  };

  const totalRam = parseInt(server.ram.replace('MB', ''), 10);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl">
              <Link href={`/servers/${server.id}`} onClick={handleLinkClick} className="hover:underline flex items-center gap-2">
                 <ServerIcon className="h-5 w-5 text-muted-foreground" />
                 {server.name}
              </Link>
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
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-semibold text-foreground">OS:</span> {server.type}</p>
            <p><span className="font-semibold text-foreground">Provider:</span> {server.provider}</p>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground">RAM:</span>
              {isRamLoading ? (
                 <Skeleton className="h-4 w-24" />
              ): (
                <span>
                    {usedRam !== null ? `${usedRam}MB / ${totalRam}MB` : 'N/A'}
                </span>
              )}
            </div>
             <p><span className="font-semibold text-foreground">Storage:</span> {server.storage}</p>
        </div>
      </CardContent>
    </Card>
  );
}
