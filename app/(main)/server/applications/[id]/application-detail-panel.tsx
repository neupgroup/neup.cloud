'use client';

import { AppWindow, ChevronLeft, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DeleteApplicationButton } from '@/components/delete-application-button';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ServerNameLink } from '@/components/server-name-link';

import { DeploymentActionsCard } from './deployment-actions-card';
import EditApplicationForm from './edit-form';
import { GitHubSection } from './github-section';
import { LifecycleSection } from './lifecycle-section';
import { StatusDashboard } from './status-dashboard';
import { SystemSection } from './system-section';
import { CommandLogList } from '@/app/(main)/server/commands/command-log-card';

type ViewMode = 'details' | 'edit';

const VIEW_INTENT_STORAGE_PREFIX = 'neup:applications:view-intent:';
const LEGACY_EDIT_INTENT_STORAGE_PREFIX = 'neup:applications:edit-intent:';

function consumeViewIntent(applicationId: string): ViewMode | null {
  try {
    const key = `${VIEW_INTENT_STORAGE_PREFIX}${applicationId}`;
    const value = sessionStorage.getItem(key);
    if (value) {
      sessionStorage.removeItem(key);
      if (value === 'edit') return value;
    }
  } catch {
    // ignore (storage disabled)
  }

  try {
    const legacyKey = `${LEGACY_EDIT_INTENT_STORAGE_PREFIX}${applicationId}`;
    const legacyValue = sessionStorage.getItem(legacyKey);
    if (legacyValue) {
      sessionStorage.removeItem(legacyKey);
      return 'edit';
    }
  } catch {
    // ignore
  }

  return null;
}

function InlineHeader({
  title,
  description,
  badge,
  onBack,
}: {
  title: string;
  description?: string;
  badge?: string;
  onBack: () => void;
}) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground hover:underline"
        onClick={onBack}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Go back
      </Button>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        {description ? <div className="text-muted-foreground text-lg">{description}</div> : null}
      </div>
    </div>
  );
}

interface ApplicationDetailPanelProps {
  application: any;
  appLanguage: string;
  serverName?: string | null;
}

export function ApplicationDetailPanel({ application, appLanguage, serverName }: ApplicationDetailPanelProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('details');

  useEffect(() => {
    const intent = consumeViewIntent(application.id);
    if (intent) setView(intent);
  }, [application.id]);

  if (view === 'edit') {
    return (
      <div className="flex flex-col gap-8 max-w-5xl animate-in fade-in duration-300">
        <InlineHeader
          title={`Edit ${application.name}`}
          description="Update application configuration"
          badge={application.language}
          onBack={() => setView('details')}
        />
        <div className="w-full max-w-3xl">
          <EditApplicationForm
            application={application}
            onCancel={() => setView('details')}
            onSaved={() => setView('details')}
          />
        </div>
      </div>
    );
  }

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
        <Button variant="outline" className="gap-2" onClick={() => setView('edit')}>
          <Edit className="h-4 w-4" />
          Edit
        </Button>

        <DeleteApplicationButton applicationId={application.id} />
      </div>
    </div>
  );
}
