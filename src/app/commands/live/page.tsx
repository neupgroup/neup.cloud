import { cookies } from 'next/headers';
import { getServer } from '@/app/servers/actions';
import ClientTerminal from './client';

export default async function LiveConsolePage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    let serverName = 'Mock Server';

    if (serverId) {
        const server = await getServer(serverId);
        if (server) {
            serverName = server.name;
        }
    }

    // Generate a random Session ID for this visit
    const sessionId = Math.random().toString(36).substring(2, 10);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-zinc-950 text-green-500 font-mono text-sm p-4 rounded-lg border border-zinc-800 shadow-2xl overflow-hidden">
            <ClientTerminal
                sessionId={sessionId}
                serverId={serverId}
                serverName={serverName}
            />
        </div>
    );
}
