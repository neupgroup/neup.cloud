import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Database, Table, ChevronRight, ShieldCheck, Link2, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageTitleBack } from '@/components/page-header';
import { getDatabaseById } from '@/services/databases/data';

export const metadata: Metadata = {
  title: 'Database Connection, Neup.Cloud',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DatabaseConnectionDetailsPage({ params }: Props) {
  const { id } = await params;
  const connection = await getDatabaseById(id);

  if (!connection) {
    notFound();
  }

  return (
    <div className="grid gap-8 pb-20">
      <PageTitleBack
        backHref="/database"
        title={
          <span className="flex items-center gap-3">
            <span className="p-2.5 bg-primary/10 rounded-xl">
              <Database className="w-6 h-6 text-primary" />
            </span>
            <span>{connection.title}</span>
          </span>
        }
        description={connection.description}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground mb-2">Connection Type</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase">{connection.connectionType}</Badge>
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

      <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
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
    </div>
  );
}
