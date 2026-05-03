import type { Metadata } from 'next';
import { Zap, Clock } from 'lucide-react';

import { PageTitle } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCurrentIntelligenceAccountId } from '@/core/ai/files/intelligence/account';
import { getAccessTokens, getIntelligenceModels } from '@/core/ai/files/intelligence/store';
import { getOpenFlowUsageLogs } from './openflow-store';
import { OpenFlowClient } from './openflow-client';

export const metadata: Metadata = {
  title: 'OpenFlow Intelligence, Neup.Cloud',
};

export default async function OpenFlowPage() {
  const accountId = await getCurrentIntelligenceAccountId();
  const tokens = await getAccessTokens(accountId);
  const models = await getIntelligenceModels();
  const usageLogs = await getOpenFlowUsageLogs(accountId, 10);

  return (
    <div className="grid gap-8">
      <PageTitle
        title={
          <span className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            OpenFlow
          </span>
        }
        description="Connect to AI with tokens, prompts, and context to generate intelligent responses."
      />

      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Zap className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-headline">
            Direct AI Connection
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Choose a provider, model, and API key, then send your prompt and optional context with automatic fallback support.
          </CardDescription>
        </CardHeader>
      </Card>

      {tokens.length === 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-yellow-900 dark:text-yellow-200">
              No saved keys yet
            </CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-300">
              You can still paste an API key manually. Saved keys will appear here once they exist.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <OpenFlowClient tokens={tokens} models={models} accountId={accountId} />

      {usageLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Usage
            </CardTitle>
            <CardDescription>Last 10 OpenFlow invocations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usageLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-muted-foreground">
                        {log.provider}:{log.modelUsed}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Token: ...{log.tokenLast4}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {log.usedAt.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
