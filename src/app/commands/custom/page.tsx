
import React from 'react';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import CustomCommandClient from './custom-command-client';
import { PageTitleBack } from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming Button is needed for fallback link if we want one, or just error message
import { Server } from 'lucide-react'; // For consistency if we use Card

export const metadata: Metadata = {
    title: 'Run Custom Command, Neup.Cloud',
};

export default async function CustomCommandPage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    const serverName = cookieStore.get('selected_server_name')?.value;

    return (
        <div className="space-y-6">
            <PageTitleBack
                title="Run Custom Command"
                description={serverName ? `Execute ad-hoc commands on ${serverName}` : "Execute ad-hoc commands on your servers without saving them."}
                backHref="/commands"
            />

            {!serverId ? (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4 text-sm font-medium flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    No server selected. You cannot run commands. Please select a server from the dashboard.
                </div>
            ) : (
                <CustomCommandClient serverId={serverId} />
            )}
        </div>
    );
}
