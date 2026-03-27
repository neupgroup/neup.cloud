import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, ReceiptText, Sparkles } from 'lucide-react';

import { PageTitle } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCurrentIntelligenceAccountId } from '@/lib/intelligence/account';
import { getIntelligenceLogs, parseLogContext } from '@/lib/intelligence/store';

export const metadata: Metadata = {
  title: 'Intelligence Billing, Neup.Cloud',
};

export default async function IntelligenceBillingPage() {
  const logs = await getIntelligenceLogs(await getCurrentIntelligenceAccountId());
  const totalCost = logs.reduce((sum, log) => {
    const parsedContext = parseLogContext(log.context);
    return sum + (parsedContext.estimatedCost || 0);
  }, 0);
  const totalInputTokens = logs.reduce((sum, log) => sum + (log.inputTokens || 0), 0);
  const totalOutputTokens = logs.reduce((sum, log) => sum + (log.outputTokens || 0), 0);

  return (
    <div className="grid gap-8">
      <PageTitle
        title={
          <span className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            Intelligence Billing
          </span>
        }
        description="A placeholder area for billing-focused insights, summaries, and future financial intelligence."
      />

      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ReceiptText className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-headline">
            Billing intelligence lives here
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">
            This page now summarizes the overall estimated cost and token usage from completed intelligence logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/intelligence">Back to Intelligence Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/intelligence/logs">Go to Logs</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-primary" />
            Overall Cost
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 p-4">
            <p className="text-sm text-muted-foreground">Estimated Total Cost</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">${totalCost.toFixed(8)}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-4">
            <p className="text-sm text-muted-foreground">Input Tokens</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalInputTokens}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-4">
            <p className="text-sm text-muted-foreground">Output Tokens</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalOutputTokens}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
