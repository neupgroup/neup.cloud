'use client';

import { ChevronRight, ServerIcon, User, Check, Loader2 } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteServer, selectServer } from "./actions";
import type { Server } from './client-page';
import { cn } from "@/lib/utils";

type ServerCardProps = {
  server: Server;
  onServerDeleted: (id: string) => void;
  onServerSelected: (id: string) => void;
  isSelected: boolean;
  className?: string;
};

export function ServerCard({ server, onServerDeleted, onServerSelected, isSelected, className }: ServerCardProps) {
  const { toast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering selection
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
        description: `You are now managing "${server.name}".`,
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
