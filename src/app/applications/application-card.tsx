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
import type { Application } from './client-page';
import { Badge } from "@/components/ui/badge";

type ApplicationCardProps = {
  application: Application;
};

export function ApplicationCard({ application }: ApplicationCardProps) {
  const { toast } = useToast();

  const languageDisplay = {
    'next': 'Next.js',
    'node': 'Node.js',
    'python': 'Python',
    'go': 'Go',
    'custom': 'Custom'
  }[application.language] || application.language;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="w-full space-y-2">
          <div className="font-headline text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/applications/${application.id}`} className="hover:underline underline-offset-4 flex items-center gap-2 font-medium text-foreground">
                <AppWindow className="h-4 w-4 text-primary" />
                {application.name}
              </Link>
              <Badge variant="outline" className="bg-primary/5 text-[10px] h-5 px-1.5 border-primary/20 text-primary">
                <Code className="h-3 w-3 mr-1" />
                {languageDisplay}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 text-sm pl-6">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="font-mono text-xs text-muted-foreground">{application.location}</span>
            </div>

            {application.repository && (
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground/70" />
                <Link
                  href={application.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate text-xs text-muted-foreground"
                >
                  {application.repository}
                </Link>
              </div>
            )}

            {application.networkAccess && application.networkAccess.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <Network className="h-3.5 w-3.5 text-muted-foreground/70" />
                <div className="flex flex-wrap gap-1">
                  {application.networkAccess.map((port) => (
                    <Badge key={port} variant="secondary" className="text-[10px] h-5 px-1.5 bg-secondary/50">
                      {port}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
