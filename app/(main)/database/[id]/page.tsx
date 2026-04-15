'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Database, Link2, ShieldCheck, Table, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageTitleBack } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/hooks/use-toast';
import {
  checkDatabaseConnection,
  deleteDatabaseConnection,
  getDatabaseConnectionMeta,
} from '@/services/database/actions';

type ConnectionMeta = NonNullable<Awaited<ReturnType<typeof getDatabaseConnectionMeta>>>;

type Props = {
  params: { id: string };
};

export default function DatabaseConnectionDetailsPage({ params }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [connection, setConnection] = useState<ConnectionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadError('');

    getDatabaseConnectionMeta(params.id)
      .then((meta) => {
        if (cancelled) {
          return;
        }

        if (!meta) {
          setConnection(null);
          setLoadError('Database connection not found.');
          return;
        }

        setConnection(meta);
      })
      .catch((error) => {
        if (!cancelled) {
          setConnection(null);
          setLoadError(error instanceof Error ? error.message : 'Unable to load database connection.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleCheckConnection = async () => {
    if (!connection) {
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkDatabaseConnection(connection.id);
      toast({
        title: result.success ? 'Connection healthy' : 'Connection failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Connection check failed',
        description: error?.message || 'Unable to check connection.',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (!connection) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteDatabaseConnection(connection.id);
      toast({
        title: 'Connection deleted',
        description: result.message,
      });
      router.push('/database');
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Unable to delete connection.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const title = connection?.title || 'Database connection';
  const description = connection?.description || 'External database connection';

  return (
    <div className="grid gap-8 pb-20">
      <PageTitleBack
        backHref="/database"
        title={
          <span className="flex items-center gap-3">
            <span className="p-2.5 bg-primary/10 rounded-xl">
              <Database className="w-6 h-6 text-primary" />
            </span>
            <span>{title}</span>
          </span>
        }
        description={description}
      />

      {loadError && (
        <Card className="p-4 text-sm text-destructive">
          {loadError}
        </Card>
      )}

      {connection ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground mb-2">Connection Type</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase">
                  {connection.connectionType}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground mb-2">Status</div>
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium capitalize">{connection.connectionStatus}</span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground mb-2">Credentials Summary</div>
              <div className="text-sm font-mono break-all">{connection.credentails}</div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Connection Test</div>
                <p className="text-sm text-muted-foreground">Check whether the saved connection can still be maintained.</p>
              </div>
              <Button onClick={handleCheckConnection} variant="outline" disabled={isChecking || isDeleting}>
                {isChecking ? 'Checking...' : 'Check for connection'}
              </Button>
            </div>
            {connection.lastValidatedAt && (
              <div className="mt-3 text-xs text-muted-foreground">
                Last checked: {new Date(connection.lastValidatedAt).toLocaleString()}
              </div>
            )}
          </Card>

          <Card className="p-4 border-destructive/20 bg-destructive/5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Danger Zone</div>
                <p className="text-sm text-muted-foreground">Remove this saved connection from Neup.Cloud.</p>
              </div>
              <Button onClick={handleDeleteConnection} variant="destructive" disabled={isDeleting || isChecking}>
                {isDeleting ? 'Deleting...' : 'Delete connection'}
              </Button>
            </div>
          </Card>

          <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <Link href={`/database/${connection.id}/table`} className="block">
              <div className="p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4 cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0 h-8">
                    <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4">
                      Tables and Views
                    </h3>
                    <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Browse all tables and views for this external connection.
                  </p>
                </div>
              </div>
            </Link>

            <Link href={`/database/${connection.id}/shell`} className="block border-t border-border">
              <div className="p-4 min-w-0 w-full transition-colors hover:bg-muted/50 group flex items-start gap-4 cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0 h-8">
                    <h3 className="font-semibold leading-none tracking-tight truncate pr-4 text-foreground group-hover:underline decoration-muted-foreground/30 underline-offset-4">
                      SQL Shell
                    </h3>
                    <div className="h-8 w-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Execute SQL commands against this external connection.
                  </p>
                </div>
              </div>
            </Link>
          </Card>

          <Card className="p-4 text-xs text-muted-foreground flex items-start gap-2">
            <Link2 className="h-4 w-4 mt-0.5" />
            <span>All table and row browsing is executed on the server side using the saved connection details.</span>
          </Card>
        </>
      ) : null}

      {isLoading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading...</Card>
      ) : null}
    </div>
  );
}
