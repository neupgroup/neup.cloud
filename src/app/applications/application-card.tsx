
'use client';

import { MoreHorizontal, Trash2, GitBranch, AppWindow } from "lucide-react";
import Link from "next/link";
import React from "react";

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
import { deleteApplication } from "./actions";
import type { Application } from './page';
import { Badge } from "@/components/ui/badge";

type ApplicationCardProps = {
  application: Application;
  onApplicationDeleted: (id: string) => void;
};

export function ApplicationCard({ application, onApplicationDeleted }: ApplicationCardProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteApplication(application.id);
      toast({
        title: "Application Deleted",
        description: "The application has been successfully deleted.",
      });
      onApplicationDeleted(application.id);
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem deleting the application.",
      });
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
                 <AppWindow className="h-5 w-5 text-muted-foreground" />
                 {application.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Link href={application.repo} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{application.repo}</Link>
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
                 <DropdownMenuItem>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Redeploy
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
           <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Status:</span>
                 <Badge
                    variant={
                        application.status === "Running"
                        ? "default"
                        : application.status === "Crashed"
                        ? "destructive"
                        : "secondary"
                    }
                    className={
                        application.status === "Running"
                        ? "bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30"
                        : application.status === "Building"
                        ? "bg-blue-500/20 text-blue-700 border-blue-400 hover:bg-blue-500/30"
                        : ""
                    }
                    >
                    {application.status}
                </Badge>
           </div>
           <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">URL:</span>
                 {application.url ? (
                    <Link href={application.url} className="underline" target="_blank">
                        {application.url}
                    </Link>
                ) : (
                    "N/A"
                )}
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
