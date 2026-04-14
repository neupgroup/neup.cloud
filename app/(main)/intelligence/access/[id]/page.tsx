import { redirect } from 'next/navigation';
import AccessEditForm from '@/app/(main)/intelligence/access/[id]/access-edit-form';

export default async function IntelligenceAccessDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/intelligence/prompts/${resolvedParams.id}`);
}
