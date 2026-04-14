
import { notFound } from 'next/navigation';

import { getApplication } from '@/services/applications/actions';
import EditApplicationForm from './edit-form';

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const application = await getApplication(id);

    if (!application) {
        notFound();
    }

    return <EditApplicationForm application={application} />;
}
