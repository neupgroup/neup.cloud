import { redirect } from 'next/navigation';

export default async function IntelligenceAccessDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/intelligence/prompts/${resolvedParams.id}`);
}
