import { notFound } from 'next/navigation';
import { getApplication } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppWindow, Code, FolderOpen, GitBranch, Network, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageTitleBack } from '@/components/page-header';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const application = await getApplication(id) as any;

    if (!application) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <PageTitleBack
                title={
                    <span className="flex items-center gap-3">
                        <AppWindow className="h-8 w-8 text-muted-foreground" />
                        {application.name}
                    </span>
                }
                description="Application details and management"
                backHref="/applications"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Language/Framework</p>
                            <Badge variant="outline" className="mt-1">
                                {application.language}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-mono text-sm mt-1 bg-secondary px-2 py-1 rounded">
                                {application.location}
                            </p>
                        </div>
                        {application.repository && (
                            <div>
                                <p className="text-sm text-muted-foreground">Repository</p>
                                <Link
                                    href={application.repository}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline mt-1 flex items-center gap-2"
                                >
                                    <GitBranch className="h-4 w-4" />
                                    {application.repository}
                                </Link>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground">Owner</p>
                            <p className="text-sm mt-1 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {application.owner}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="h-5 w-5" />
                            Network Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {application.networkAccess && application.networkAccess.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {application.networkAccess.map((port: string) => (
                                    <Badge key={port} variant="secondary">
                                        {port}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No network access configured</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {application.commands && Object.keys(application.commands).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Commands</CardTitle>
                        <CardDescription>Configured commands for this application</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(application.commands).map(([name, command]: [string, any]) => (
                                <div
                                    key={name}
                                    className="flex items-start justify-between bg-secondary p-3 rounded-md"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{name}</p>
                                        <p className="text-sm text-muted-foreground font-mono mt-1">
                                            {command}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {application.information && Object.keys(application.information).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-secondary p-4 rounded-md overflow-x-auto text-sm">
                            {JSON.stringify(application.information, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Timestamps
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {application.createdAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="text-sm">{new Date(application.createdAt).toLocaleString()}</p>
                        </div>
                    )}
                    {application.updatedAt && (
                        <div>
                            <p className="text-sm text-muted-foreground">Last Updated</p>
                            <p className="text-sm">{new Date(application.updatedAt).toLocaleString()}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
