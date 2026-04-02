import type { Metadata } from 'next';

import { PipelineProviderConnectionPage } from '@/components/pipeline/provider-connection-page';

export const metadata: Metadata = {
  title: 'WhatsApp Node Setup | Neup.Cloud',
  description: 'Connect WhatsApp Cloud API credentials for pipeline nodes.',
};

export default function PipelineWhatsAppNodePage() {
  return <PipelineProviderConnectionPage provider="whatsapp" />;
}
