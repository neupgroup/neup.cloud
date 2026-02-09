import { getServer } from '@/app/servers/actions';
import ServerDetailsClientPage from './client-page';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const server = await getServer(id);
    if (!server) {
        return {
            title: 'Server Not Found',
        };
    }
    return {
        title: `Manage ${server.name}, Neup.Cloud`,
        description: `Manage server ${server.name}`,
    };
}

export default async function ServerDetailsPage({ params }: Props) {
    const { id } = await params;
    const server = await getServer(id);

    if (!server) {
        notFound();
    }

    // Ensure type compatibility with the client component
    const typedServer = {
        id: server.id,
        name: server.name || '',
        username: server.username || '',
        type: server.type || '',
        provider: server.provider || '',
        ram: server.ram || '',
        storage: server.storage || '',
        publicIp: server.publicIp || '',
        privateIp: server.privateIp || '',
        proxyHandler: server.proxyHandler || '',
        loadBalancer: server.loadBalancer || '',
    }

    return <ServerDetailsClientPage server={typedServer} />;
}
