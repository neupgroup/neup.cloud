
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { listDatabaseUsers } from "../../actions";
import { UsersClientPage } from "./users-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Manage Users | Neup.Cloud',
};

type Props = {
    params: Promise<{ id: string }>
}

export default async function DatabaseUsersPage({ params }: Props) {
    const { id } = await params;
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) notFound();

    // Parse ID: Format is "engine-name"
    const parts = id.split('-');
    if (parts.length < 2) notFound();

    const engine = parts[0] as 'mysql' | 'postgres';
    const dbName = parts.slice(1).join('-');

    let users = [];
    try {
        users = await listDatabaseUsers(serverId, engine, dbName);
    } catch (error) {
        console.error("Failed to fetch database users:", error);
    }

    return (
        <UsersClientPage
            serverId={serverId}
            engine={engine}
            dbName={dbName}
            initialUsers={users}
        />
    );
}
