
import { GitBranch, AppWindow, FolderOpen, Code, Network } from "lucide-react";
import Link from "next/link";
import React from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Application } from './page';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteApplication } from "./actions";
import { useState } from "react";

type ApplicationCardProps = {
  application: Application;
  onApplicationDeleted: (id: string) => void;
};

export function ApplicationCard({ application, onApplicationDeleted }: ApplicationCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteApplication(application.id);
      onApplicationDeleted(application.id);
      toast({
        title: "Application deleted",
        description: "The application has been stopped and removed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete application.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="w-full space-y-3">
            <CardTitle className="font-headline text-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href={`/applications/${application.id}`} className="hover:underline underline-offset-4 flex items-center gap-2">
                  <AppWindow className="h-5 w-5 text-muted-foreground" />
                  {application.name}
                </Link>
                <Badge variant="outline" className="bg-primary/10">
                  <Code className="h-3 w-3 mr-1" />
                  {application.language}
                </Badge>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The application will be <strong>closed/stopped</strong> immediately.
                      <br /><br />
                      Note: For security reasons, the underlying files <strong>will not be deleted</strong> from the server automatically. You must manually remove them if desired.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                      {isDeleting ? "Deleting..." : "Delete Application"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardTitle>

            <div className="space-y-2 text-sm">
              <CardDescription className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{application.location}</span>
              </CardDescription>

              {application.repository && (
                <CardDescription className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={application.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline truncate"
                  >
                    {application.repository}
                  </Link>
                </CardDescription>
              )}

              {application.networkAccess && application.networkAccess.length > 0 && (
                <CardDescription className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {application.networkAccess.map((port) => (
                      <Badge key={port} variant="secondary" className="text-xs">
                        {port}
                      </Badge>
                    ))}
                  </div>
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
