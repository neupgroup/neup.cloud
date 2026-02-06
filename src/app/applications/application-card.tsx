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
                  {languageDisplay}
                </Badge>
              </div>
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
