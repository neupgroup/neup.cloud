import React from 'react';
import { cookies } from 'next/headers';
import ViewerClient from './viewer-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'File Viewer, Neup.Cloud',
};

export default async function ViewerPage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">No server selected.</p>
            </div>
        );
    }

    return <ViewerClient serverId={serverId} />;
}
