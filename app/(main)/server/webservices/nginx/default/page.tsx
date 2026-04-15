import { cookies } from 'next/headers';
import { getServer } from '@/services/servers/server-service';
import DefaultNginxConfigClient from './client';

export default async function DefaultNginxConfigPage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    let serverName = 'No Server Selected';

    if (serverId) {
        const server = await getServer(serverId);
        if (server) {
            serverName = server.name;
        }
    }

    return (
        <DefaultNginxConfigClient
            serverId={serverId || ''}
            serverName={serverName}
        />
    );
}
