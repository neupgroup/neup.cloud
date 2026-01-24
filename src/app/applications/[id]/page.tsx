
import { notFound } from 'next/navigation';
import { getApplication } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppWindow, Code, FolderOpen, GitBranch, Network, User, Calendar, Activity, PlayCircle, StopCircle, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageTitleBack } from '@/components/page-header';
import { ApplicationActions } from '../application-actions';
import { GitHubSection } from './github-section';
import { SystemSection } from './system-section';
import { LifecycleSection } from './lifecycle-section';
import { ActionsSection } from './actions-section';
import { LogsSection } from './logs-section';
import { StatusDashboard } from './status-dashboard';
import { Separator } from '@/components/ui/separator';

import * as NextJsDev from '@/core/next-js/dev';
import * as NextJsStart from '@/core/next-js/start';
import * as NextJsStop from '@/core/next-js/stop';
import * as NextJsBuild from '@/core/next-js/build';
import * as NodeJsStart from '@/core/node/start';
import * as NodeJsStop from '@/core/node/stop';
import * as NodeJsBuild from '@/core/node/build';
import * as PythonStart from '@/core/python/start';
import * as PythonStop from '@/core/python/stop';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const application = await getApplication(id) as any;

    if (!application) {
        notFound();
    }

    // Determine Status (Simplified Mock for UI structure as per request)
    // "a card for now static, a card to see if the site is active or not."
    // In real app, we would ping the server/status file.
    const appLanguage = application.language === 'next' ? 'Next.js' :
        application.language === 'node' ? 'Node.js' :
            application.language === 'python' ? 'Python' : 'Custom';

    // Inject Default Commands if missing
    if (!application.commands) {
        application.commands = {};
    }

    const setIfMissing = (key: string, value: string) => {
        if (!application.commands[key] && !application.commands[`lifecycle.${key}`]) {
            application.commands[key] = value;
        }
    };

    // Generic Restart (PM2)
    setIfMissing('restart', `pm2 restart "${application.name}"`);

    if (application.language === 'next') {
        setIfMissing('start', NextJsStart.getStartCommand(application.name, application.location, application.networkAccess?.map(Number) || []));
        setIfMissing('stop', NextJsStop.getStopCommand(application.name));
        setIfMissing('build', NextJsBuild.getBuildCommand(application.location));
        setIfMissing('dev', NextJsDev.getDevCommand(application.name, application.location, application.networkAccess?.map(Number) || []));
    } else if (application.language === 'node') {
        const entry = application.information?.entryFile || 'index.js';
        setIfMissing('start', NodeJsStart.getStartCommand(application.name, application.location, entry, application.networkAccess?.map(Number) || []));
        setIfMissing('stop', NodeJsStop.getStopCommand(application.name));
        setIfMissing('build', NodeJsBuild.getBuildCommand(application.location));
    } else if (application.language === 'python') {
        const entry = application.information?.entryFile || 'main.py';
        setIfMissing('start', PythonStart.getStartCommand(application.name, application.location, entry, application.networkAccess?.map(Number) || []));
        setIfMissing('stop', PythonStop.getStopCommand(application.name));
    }

    return (
        <div className="flex flex-col gap-8 max-w-5xl animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <PageTitleBack
                    title={
                        <span className="flex items-center gap-3">
                            <AppWindow className="h-8 w-8 text-primary" />
                            {application.name}
                        </span>
                    }
                    description="Application details and management"
                    backHref="/applications"
                >
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-sm py-1 px-3 border-primary/20 bg-primary/5">
                            {appLanguage}
                        </Badge>
                        <ApplicationActions applicationId={application.id} />
                    </div>
                </PageTitleBack>
            </div>

            {/* Status Dashboard */}
            <StatusDashboard applicationId={application.id} />

            {/* Lifecycle Section (Build, Start, Stop, Restart) - Moved up */}
            <LifecycleSection application={application} />

            {/* Actions Section (Custom Commands) - Moved up */}
            <ActionsSection application={application} />

            {/* GitHub / Repository Section */}
            {application.repository && (
                <GitHubSection application={application} />
            )}

            {/* Logs Section */}
            <LogsSection application={application} />

            {/* System Info Section */}
            <SystemSection application={application} />


        </div>
    );
}
