
import { GitBranch, AppWindow } from "lucide-react";
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

type ApplicationCardProps = {
  application: Application;
  onApplicationDeleted: (id: string) => void; // Keeping prop for consistency, though unused in view
};

export function ApplicationCard({ application, onApplicationDeleted }: ApplicationCardProps) {
  const { toast } = useToast();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="w-full">
            <CardTitle className="font-headline text-xl flex items-center justify-between">
              <Link href={`/applications/${application.id}`} className="hover:underline underline-offset-4 flex items-center gap-2">
                <AppWindow className="h-5 w-5 text-muted-foreground" />
                {application.name}
              </Link>
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
            </CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <Link href={application.repo} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{application.repo}</Link>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
