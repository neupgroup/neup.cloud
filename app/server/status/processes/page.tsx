import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ProcessesClient from '@/app/server/status/processes/processes-client';

export const metadata: Metadata = {
    title: 'Server Processes, Neup.Cloud',
};

export default async function StatusProcessesPage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    const serverName = cookieStore.get('selected_server_name')?.value;

    return (
        <ProcessesClient serverId={serverId} serverName={serverName} />
    );
}
