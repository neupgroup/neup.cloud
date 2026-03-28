import type { Metadata } from 'next';
import { PlusCircle } from 'lucide-react';

import { PageTitleBack } from '@/components/page-header';
import ModelCreateForm from '@/app/intelligence/models/model-create-form';

export const metadata: Metadata = {
  title: 'Add Intelligence Model, Neup.Cloud',
};

export default function IntelligenceModelsAddPage() {
  return (
    <div className="grid gap-8">
      <PageTitleBack
        title={
          <span className="flex items-center gap-3">
            <PlusCircle className="h-8 w-8 text-primary" />
            Add Intelligence Model
          </span>
        }
        description="Save a provider model definition that can be reused by prompt records."
        backHref="/intelligence/models"
      />

      <ModelCreateForm />
    </div>
  );
}
