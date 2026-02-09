
'use client';

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getApplications } from "./actions";
import { ApplicationCard } from "./application-card";
import { ApplicationCardSkeleton } from "./application-card-skeleton";
import { PageTitle } from "@/components/page-header";
import { useServerName } from "@/hooks/use-server-name";

export type Application = {
  id: string;
  name: string;
  location: string;
  language: string;
  repository?: string;
  networkAccess?: string[];
  commands?: Record<string, string>;
  information?: Record<string, any>;
  owner: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AppsPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const serverName = useServerName();

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const appsData = await getApplications() as Application[];
      setApplications(appsData);
    } catch (err: any) {
      setError(err);
      toast({
        variant: "destructive",
        title: "Error fetching applications",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Applications"
        description="Deploy and manage your applications"
        serverName={serverName}
      />

      <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Deploy New App Item */}
        <Link href="/applications/deploy" className="block p-4 border-b border-border hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <PlusCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Deploy New Application</h3>
              <p className="text-sm text-muted-foreground">Deploy a new application to your infrastructure</p>
            </div>
          </div>
        </Link>

        {isLoading ? (
          <div className="p-4 space-y-4">
            <ApplicationCardSkeleton />
            <ApplicationCardSkeleton />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-destructive">Error loading applications: {error.message}</div>
        ) : (
          applications.map((app, index) => (
            <div key={app.id} className={index !== applications.length - 1 ? "border-b border-border" : ""}>
              <ApplicationCard application={app} />
            </div>
          ))
        )}
        {!isLoading && !error && applications.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">You haven't deployed any applications yet.</div>
        )}
      </Card>
    </div>
  );
}
