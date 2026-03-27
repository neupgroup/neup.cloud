import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

import { PageTitle } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { getCurrentIntelligenceAccountId } from '@/lib/intelligence/account';
import { getPaginatedIntelligenceLogs, parseLogContext } from '@/lib/intelligence/store';

export const metadata: Metadata = {
  title: 'Intelligence Logs, Neup.Cloud',
};

export default async function IntelligenceLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Number(resolvedSearchParams?.page || '1');
  const {
    logs,
    currentPage,
    totalPages,
  } = await getPaginatedIntelligenceLogs(
    await getCurrentIntelligenceAccountId(),
    Number.isFinite(page) ? page : 1,
    10
  );

  return (
    <div className="grid gap-8">
      <PageTitle
        title={
          <span className="flex items-center gap-3">
            <ScrollText className="h-8 w-8 text-primary" />
            Intelligence Logs
          </span>
        }
        description="Completed intelligence requests with compact summaries and expandable details."
      />

      <Card>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No intelligence logs yet. A log is written after a model call completes and usage is known.
            </p>
          ) : (
            <div className="grid gap-4">
              {logs.map((log) => {
                const parsedContext = parseLogContext(log.context);
                const queryText = (parsedContext.query || log.query || '').trim();
                const masterPrompt = parsedContext.masterPrompt.trim();
                const contextText = parsedContext.displayContext.trim();
                const responseText = (log.response || '').trim();

                return (
                  <details
                    key={log.id}
                    className="group rounded-xl border border-border/70 bg-card transition-colors hover:border-primary/30"
                  >
                    <summary className="cursor-pointer list-none p-5">
                      <div className="grid gap-4">
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span><span className="font-medium text-foreground">account_id:</span> {log.account_id}</span>
                          <span><span className="font-medium text-foreground">access_id:</span> {log.access_id}</span>
                          {log.modal && <span><span className="font-medium text-foreground">model:</span> {log.modal}</span>}
                          {log.inputTokens !== null && <span><span className="font-medium text-foreground">input token:</span> {log.inputTokens}</span>}
                          {log.outputTokens !== null && <span><span className="font-medium text-foreground">output token:</span> {log.outputTokens}</span>}
                        </div>
                        <div className="grid gap-2">
                          <p className="text-sm font-medium text-foreground">Query</p>
                          {queryText ? (
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                              {queryText}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                              No query stored
                            </div>
                          )}
                        </div>
                      </div>
                    </summary>
                    <div className="grid gap-4 border-t border-border/70 px-5 pb-5 pt-4 md:grid-cols-2">
                      {masterPrompt && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Master Prompt</p>
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                            {masterPrompt}
                          </div>
                        </div>
                      )}
                      {contextText && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Context</p>
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                            {contextText}
                          </div>
                        </div>
                      )}
                      {responseText && (
                        <div className="space-y-2 md:col-span-2">
                          <p className="text-sm font-medium text-foreground">Response</p>
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                            {responseText}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          {currentPage > 1 ? (
            <Button variant="outline" asChild>
              <Link href={`/intelligence/logs?page=${currentPage - 1}`}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          {currentPage < totalPages ? (
            <Button variant="outline" asChild>
              <Link href={`/intelligence/logs?page=${currentPage + 1}`}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
