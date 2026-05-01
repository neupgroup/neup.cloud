'use client';

import { AppWindow, ChevronLeft, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DeleteApplicationButton } from '@/components/delete-application-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServerNameLink } from '@/components/server-name-link';

import { DeploymentActionsCard } from './deployment-actions-card';
import { GitHubSection } from './github-section';
import { LifecycleSection } from './lifecycle-section';
import { StatusDashboard } from './status-dashboard';
import { SystemSection } from './system-section';
import { CommandLogList } from '@/app/(main)/server/commands/command-log-card';

interface ApplicationDetailPanelProps {
  application: any;
  appLanguage: string;
  serverName?: string | null;
}

export function ApplicationDetailPanel({ application, appLanguage, serverName }: ApplicationDetailPanelProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground hover:underline self-start"
          onClick={() => {
            router.push('/server/applications');
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Go back
        </Button>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              <span className="flex items-center gap-3">
                {application.appIcon ? (
                  <img
                    src={application.appIcon}
                    alt={application.name}
                    className="h-12 w-12 rounded-lg object-contain border border-border shadow-sm bg-muted/30 p-1"
                  />
                ) : (
                  <AppWindow className="h-8 w-8 text-primary" />
                )}
                {application.name}
              </span>
            </h1>
            <Badge variant="outline" className="text-sm py-1 px-3 border-primary/20 bg-primary/5">
              {appLanguage}
            </Badge>
          </div>
          <div className="text-muted-foreground text-lg">
            {serverName ? (
              <>
                Application details and management on <ServerNameLink name={serverName} />
              </>
            ) : (
              'Application details and management'
            )}
          </div>
        </div>
      </div>

      <StatusDashboard applicationId={application.id} />

      <LifecycleSection application={application} />

      {application.repository ? (
        <GitHubSection application={application} />
      ) : null}


      <SystemSection application={application} />

      <DeploymentActionsCard
        applicationId={application.id}
        onOpenEnvironments={() => router.push(`/server/applications/${application.id}/environment`)}
        onOpenFiles={() => router.push(`/server/applications/${application.id}/files`)}
      />

      <div className="flex items-center flex-wrap gap-3 pt-4">
        <Button variant="outline" className="gap-2" onClick={() => router.push(`/server/applications/${application.id}/edit`)}>
          <Edit className="h-4 w-4" />
          Edit
        </Button>

        <DeleteApplicationButton applicationId={application.id} />
      </div>
    </div>
  );
}
