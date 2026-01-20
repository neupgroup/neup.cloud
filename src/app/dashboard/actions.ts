'use server';

import { collection, getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { getServer } from '@/app/servers/actions';

const { firestore } = initializeFirebase();

export type ActivityLog = {
    id: string;
    command: string;
    commandName?: string;
    status: 'Success' | 'Error' | 'pending';
    runAt: number; // Processed timestamp
    serverId: string;
    serverName?: string;
};

export async function getRecentActivity(serverId?: string): Promise<ActivityLog[]> {
    try {
        let q;
        if (serverId) {
            q = query(
                collection(firestore, 'serverLogs'),
                where('serverId', '==', serverId),
                orderBy('runAt', 'desc'),
                limit(10)
            );
        } else {
            q = query(
                collection(firestore, 'serverLogs'),
                orderBy('runAt', 'desc'),
                limit(10)
            );
        }

        const snapshot = await getDocs(q);

        // Fetch server names concurrently if needed
        // For optimization, we might store serverName in logs in future, 
        // but for now let's try to map it quickly or just show ID/command.
        // Actually, fetching server details for each log might be slow if many distinct servers.
        // Let's assume we just return the raw data and maybe map singular selected server name on client.

        const logs: ActivityLog[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                command: data.command,
                commandName: data.commandName,
                status: data.status,
                runAt: data.runAt?.toMillis() || Date.now(),
                serverId: data.serverId,
                // serverName: ... we can fetch this if needed
            };
        });

        return logs;
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
    }
}
