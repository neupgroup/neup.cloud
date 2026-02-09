import { AppWindow, Code, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";

import { useToast } from "@/hooks/use-toast";
import type { Application } from './client-page';
import { Badge } from "@/components/ui/badge";

type ApplicationCardProps = {
  application: Application;
};

export function ApplicationCard({ application }: ApplicationCardProps) {
  const languageDisplay = {
    'next': 'Next.js',
    'node': 'Node.js',
    'python': 'Python',
    'go': 'Go',
    'custom': 'Custom'
  }[application.language] || application.language;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors group">
      <Link href={`/applications/${application.id}`} className="block">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AppWindow className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-medium text-foreground truncate group-hover:underline underline-offset-4 decoration-muted-foreground/30">
                {application.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Badge variant="secondary" className="text-xs font-normal text-muted-foreground bg-secondary/50 px-1.5 h-5">
                <Code className="h-3 w-3 mr-1" />
                {languageDisplay}
              </Badge>
            </div>
          </div>

          <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
    </div>
  );
}
