
'use client';

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getApplications } from "./actions";
import { ApplicationCard } from "./application-card";
import { ApplicationCardSkeleton } from "./application-card-skeleton";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Applications</h1>
          <p className="text-muted-foreground">
            Deploy and manage your applications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Link href="/applications/deploy">
          <Card
            className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold">Deploy New Application</h3>
            <p className="text-muted-foreground text-sm">Deploy a new application to your infrastructure.</p>
          </Card>
        </Link>
        {isLoading ? (
          <>
            <ApplicationCardSkeleton />
            <ApplicationCardSkeleton />
          </>
        ) : error ? (
          <Card className="text-center p-6 text-destructive">Error loading applications: {error.message}</Card>
        ) : (
          applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))
        )}
        {!isLoading && !error && applications.length === 0 && (
          <Card className="text-center p-8 text-muted-foreground">You haven't deployed any applications yet.</Card>
        )}
      </div>
    </div>
  );
}
