'use server';

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

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

        const logs: ActivityLog[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                command: data.command,
                commandName: data.commandName,
                status: data.status,
                runAt: data.runAt?.toMillis() || Date.now(),
                serverId: data.serverId,
            };
        });

        return logs;
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
    }
}
