import React from 'react';
import { notFound } from 'next/navigation';
import NginxConfigEditor from '@/components/webservices/nginx/NginxConfigEditor';

export default async function NginxConfigPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!id || id === 'new') {
        notFound();
    }

    return <NginxConfigEditor configId={id} />;
}
