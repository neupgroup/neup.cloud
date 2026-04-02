import type { Metadata } from 'next';

import { PipelineProviderConnectionPage } from '@/components/pipeline/provider-connection-page';

export const metadata: Metadata = {
  title: 'GitHub Node Setup | Neup.Cloud',
  description: 'Connect GitHub credentials for sample pipeline nodes.',
};

export default function PipelineGithubNodePage() {
  return <PipelineProviderConnectionPage provider="github" />;
}
