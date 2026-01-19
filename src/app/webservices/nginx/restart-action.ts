'use server';

import { doc, getDoc, collection, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { runCommandOnServer } from '@/services/ssh';
import { cookies } from 'next/headers';
import { getServerForRunner } from '@/app/servers/actions';

const { firestore } = initializeFirebase();

/**
 * Restart Nginx service on the selected server
 */
export async function restartNginxService() {
    try {
        const cookieStore = await cookies();
        const serverId = cookieStore.get('selected_server')?.value;

        if (!serverId) {
            return { success: false, error: 'No server selected' };
        }

        const server = await getServerForRunner(serverId);
        if (!server || !server.username || !server.privateKey) {
            return { success: false, error: 'Server information incomplete' };
        }

        const command = 'sudo systemctl restart nginx';

        // Log command to history
        const historyRef = doc(collection(firestore, 'command-history'));
        await setDoc(historyRef, {
            serverId,
            serverName: server.name,
            command: command,
            status: 'running',
            startedAt: serverTimestamp(),
            createdBy: 'user', // Ideally get current user ID
            type: 'system',
            output: ''
        });

        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            command
        );

        // Update history with result
        await updateDoc(historyRef, {
            status: result.code === 0 ? 'success' : 'failed',
            completedAt: serverTimestamp(),
            output: result.stdout + (result.stderr ? '\nError:\n' + result.stderr : ''),
            exitCode: result.code
        });

        if (result.code !== 0) {
            return { success: false, error: result.stderr || 'Failed to restart Nginx' };
        }

        return { success: true, message: 'Nginx restarted successfully' };
    } catch (error: any) {
        console.error('Error restarting nginx:', error);
        return { success: false, error: error.message };
    }
}
