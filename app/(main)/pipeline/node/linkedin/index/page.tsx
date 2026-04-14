import type { Metadata } from 'next';

import { PipelineProviderConnectionPage } from '@/components/pipeline/provider-connection-page';

export const metadata: Metadata = {
  title: 'LinkedIn Node Setup | Neup.Cloud',
  description: 'Connect LinkedIn credentials for sample pipeline nodes.',
};

export default function PipelineLinkedinNodePage() {
  return <PipelineProviderConnectionPage provider="linkedin" />;
}
