import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Coins, KeyRound, Plus, ShieldCheck } from 'lucide-react';

import { PageTitle } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentIntelligenceAccountId } from '@/lib/intelligence/account';
import { getIntelligenceAccesses, maskSecret } from '@/lib/intelligence/store';

export const metadata: Metadata = {
  title: 'Intelligence Prompts, Neup.Cloud',
};

export default async function IntelligencePromptsPage() {
  const prompts = await getIntelligenceAccesses(await getCurrentIntelligenceAccountId());

  return (
    <div className="grid gap-8">
      <PageTitle
        title={
          <span className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Intelligence Prompts
          </span>
        }
        description="Manage prompt IDs, linked provider tokens, model fallbacks, and master prompts for your signed-in account."
      />

      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-headline">
            Prompt records live here
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Use this section to manage `intelligenceAccess` entries as prompts, including generated access IDs, primary models, fallback models, master prompts, and attached access keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/intelligence/prompts/add">Add Prompt</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/intelligence/tokens">View Tokens</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Plus className="h-5 w-5 text-primary" />
            Existing Prompt Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prompt records yet. Add one to connect models, tokens, and a generated access ID.
            </p>
          ) : (
            <div className="grid gap-4">
              {prompts.map((prompt) => {
                const currency = prompt.primaryModelConfig?.currency || prompt.fallbackModelConfig?.currency || 'USD';

                return (
                  <Card key={prompt.id} className="border-border/70">
                    <CardHeader className="gap-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <CardTitle className="font-headline">
                            {prompt.prompt_id}
                          </CardTitle>
                          <CardDescription>Generated prompt access ID for this record.</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">ID {prompt.id}</Badge>
                          <Badge variant="outline">
                            <Coins className="mr-1 h-3.5 w-3.5" />
                            Balance {prompt.balance.toFixed(6)} {currency}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                      <div>
                        <p className="font-medium text-foreground">Primary</p>
                        <p>{prompt.primaryModelConfig?.title || prompt.primaryModel || 'Not set'}</p>
                        <p>{prompt.primaryModelConfig ? `${prompt.primaryModelConfig.provider}:${prompt.primaryModelConfig.model}` : null}</p>
                        <p>{prompt.primaryAccessTokenName || 'No token selected'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Fallback</p>
                        <p>{prompt.fallbackModelConfig?.title || prompt.fallbackModel || 'Not set'}</p>
                        <p>{prompt.fallbackModelConfig ? `${prompt.fallbackModelConfig.provider}:${prompt.fallbackModelConfig.model}` : null}</p>
                        <p>{prompt.fallbackAccessTokenName || 'No token selected'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Access Token Hash</p>
                        <p className="font-mono">{maskSecret(prompt.token_hash)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Max Tokens</p>
                        <p>{prompt.maxTokens ?? 'Default provider limit'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="font-medium text-foreground">Master Prompt</p>
                        <p className="whitespace-pre-wrap">{prompt.defPrompt || 'No master prompt configured.'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button variant="outline" asChild>
                            <Link href={`/intelligence/prompts/${prompt.id}`}>
                              Edit Prompt
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href={`/intelligence/logs/recharge?accessId=${prompt.id}`}>
                              Recharge This Balance
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
