import { ApplicationSection } from '@/components/specifics/application/section';

export function ApplicationsPage() {
  return (
    <ApplicationSection
      showAddButton
      source="all"
      statusFilter="all"
      title="Applications"
      description="Manage and monitor your deployed applications."
    />
  );
}
