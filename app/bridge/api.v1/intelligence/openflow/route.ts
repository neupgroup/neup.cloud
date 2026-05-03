import { NextRequest, NextResponse } from 'next/server';

import { getCurrentIntelligenceAccountId } from '@/core/ai/files/intelligence/account';
import { getAccessTokenById } from '@/core/ai/files/intelligence/store';
import { executeOpenFlowRequest } from '@/services/intelligence/openflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown): string | null {
  const normalized = readString(value);
  return normalized ? normalized : null;
}

function readOptionalNumber(value: unknown): number | null {
  const normalized = readString(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeProviderAndModel(value: unknown): { provider: string; model: string } | null {
  const normalized = readString(value);

  if (!normalized) {
    return null;
  }

  const [provider, ...modelParts] = normalized.split('/');
  const joinedModel = modelParts.join('/').trim();
  const normalizedProvider = provider.trim().toLowerCase();

  if (!normalizedProvider || !joinedModel) {
    return null;
  }

  return {
    provider: normalizedProvider,
    model: joinedModel,
  };
}

async function parseBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return {};
  }

  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {};
    }

    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const query = request.nextUrl.searchParams;

    const accountId = readString(body.accountId) || readString(query.get('accountId')) || (await getCurrentIntelligenceAccountId());

    const primaryRaw = readOptionalString(body.key) || readOptionalString(query.get('key'));
    const primarySelectKey = readOptionalNumber(body.selectKey) ?? readOptionalNumber(query.get('selectKey'));
    const primaryModelValue = normalizeProviderAndModel(body.model || query.get('model'));

    const fallbackRaw = readOptionalString(body.fallbackKey) || readOptionalString(query.get('fallbackKey'));
    const fallbackSelectKey = readOptionalNumber(body.fallbackSelectKey) ?? readOptionalNumber(query.get('fallbackSelectKey'));
    const fallbackModelValue = normalizeProviderAndModel(body.fallbackModel || query.get('fallbackModel'));

    const prompt = readString(body.prompt) || readString(query.get('prompt'));
    const context = readString(body.context) || readString(query.get('context'));

    if ((!primaryRaw && primarySelectKey === null) || !primaryModelValue || !prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'key or selectKey, model, and prompt are required',
        },
        { status: 400 }
      );
    }

    let primaryApiKey = primaryRaw;

    if (!primaryApiKey && primarySelectKey !== null) {
      const savedKey = await getAccessTokenById(accountId, primarySelectKey);

      if (!savedKey) {
        return NextResponse.json(
          {
            success: false,
            error: 'Selected key not found',
          },
          { status: 404 }
        );
      }

      primaryApiKey = savedKey.key;
    }

    let fallbackApiKey: string | null = fallbackRaw;

    if (!fallbackApiKey && fallbackSelectKey !== null) {
      const savedFallbackKey = await getAccessTokenById(accountId, fallbackSelectKey);

      if (!savedFallbackKey) {
        return NextResponse.json(
          {
            success: false,
            error: 'Selected fallback key not found',
          },
          { status: 404 }
        );
      }

      fallbackApiKey = savedFallbackKey.key;
    }

    const fallbackEnabled = Boolean(fallbackApiKey || fallbackSelectKey !== null || fallbackModelValue);

    if (fallbackEnabled && (!fallbackApiKey || !fallbackModelValue)) {
      return NextResponse.json(
        {
          success: false,
          error: 'fallbackKey or fallbackSelectKey, and fallbackModel are required when fallback is provided',
        },
        { status: 400 }
      );
    }

    const result = await executeOpenFlowRequest({
      provider: primaryModelValue.provider,
      model: primaryModelValue.model,
      apiKey: primaryApiKey,
      fallbackProvider: fallbackEnabled ? fallbackModelValue.provider : null,
      fallbackModel: fallbackEnabled ? fallbackModelValue.model : null,
      fallbackApiKey: fallbackEnabled ? fallbackApiKey : null,
      prompt,
      context,
      accountId,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute OpenFlow bridge request',
      },
      { status: 500 }
    );
  }
}
