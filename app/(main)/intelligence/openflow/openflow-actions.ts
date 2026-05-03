'use server';

import { executeOpenFlowRequest } from '@/services/intelligence/openflow';

interface InvokeOpenFlowInput {
  provider: string;
  model: string;
  apiKey: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  fallbackApiKey: string | null;
  prompt: string;
  context: string;
  accountId: string;
}

interface InvokeOpenFlowResult {
  success: boolean;
  response?: string;
  modelUsed?: string;
  provider?: string;
  error?: string;
  fallbackUsed?: boolean;
}

export async function invokeOpenFlowAction(
  input: InvokeOpenFlowInput
): Promise<InvokeOpenFlowResult> {
  return executeOpenFlowRequest(input);
}
