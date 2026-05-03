import { NextRequest, NextResponse } from 'next/server';

import { getCurrentIntelligenceAccountId } from '@/core/ai/files/intelligence/account';
import { executeOpenFlowRequest } from '@/services/intelligence/openflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      provider?: string;
      model?: string;
      apiKey?: string;
      fallbackProvider?: string | null;
      fallbackModel?: string | null;
      fallbackApiKey?: string | null;
      prompt?: string;
      context?: string;
      accountId?: string;
    };

    if (!body.provider || !body.model || !body.apiKey || !body.prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'provider, model, apiKey, and prompt are required',
        },
        { status: 400 }
      );
    }

    const accountId = body.accountId || (await getCurrentIntelligenceAccountId());
    const result = await executeOpenFlowRequest({
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      fallbackProvider: body.fallbackProvider ?? null,
      fallbackModel: body.fallbackModel ?? null,
      fallbackApiKey: body.fallbackApiKey ?? null,
      prompt: body.prompt,
      context: body.context || '',
      accountId,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute OpenFlow request',
      },
      { status: 500 }
    );
  }
}
