import type { Metadata } from 'next';

import { PipelineProviderConnectionPage } from '@/components/pipeline/provider-connection-page';

export const metadata: Metadata = {
  title: 'Google Node Setup | Neup.Cloud',
  description: 'Connect Google credentials for sample pipeline nodes.',
};

export default function PipelineGoogleNodePage() {
  return <PipelineProviderConnectionPage provider="google" />;
}
