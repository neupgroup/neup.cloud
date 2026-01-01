
'use server';

import { runCommandOnServer } from '@/services/ssh';
import { getServerForRunner } from '../servers/actions';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

export async function getSavedCommands() {
    const querySnapshot = await getDocs(collection(firestore, "savedCommands"));
    const commandsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return commandsData;
}

export async function createSavedCommand(data: { name: string, command: string, os: string, description?: string, nextCommands?: string[] }) {
    await addDoc(collection(firestore, 'savedCommands'), data);
    revalidatePath('/commands');
}

export async function updateSavedCommand(id: string, data: { name: string, command: string, os: string, description?: string, nextCommands?: string[] }) {
    await updateDoc(doc(firestore, 'savedCommands', id), data);
    revalidatePath('/commands');
}

export async function deleteSavedCommand(id: string) {
    await deleteDoc(doc(firestore, 'savedCommands', id));
    revalidatePath('/commands');
}


async function executeSingleCommand(serverId: string, command: string): Promise<{ logId: string; status: 'Success' | 'Error'; output: string }> {
    const server = await getServerForRunner(serverId);
    if (!server) {
        throw new Error('Server not found.');
    }
    if (!server.username || !server.privateKey) {
        throw new Error('No username or private key configured for this server.');
    }

    const logRef = await addDoc(collection(firestore, 'serverLogs'), {
        serverId: serverId,
        command: command,
        output: 'Executing command...',
        status: 'pending',
        runAt: serverTimestamp(),
    });

    let finalOutput = '';
    let finalStatus: 'Success' | 'Error' = 'Error';

    try {
        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            command,
            (chunk) => {
                finalOutput += chunk;
                updateDoc(logRef, { output: finalOutput });
            },
            (chunk) => {
                finalOutput += chunk;
                updateDoc(logRef, { output: finalOutput });
            }
        );

        if (result.code === 0) {
            finalStatus = 'Success';
        } else {
            finalOutput = result.stderr || `Command exited with code ${result.code}`;
        }
        
        await updateDoc(logRef, { status: finalStatus, output: finalOutput });
        revalidatePath(`/servers/${serverId}`);

        return { logId: logRef.id, status: finalStatus, output: finalOutput };
    } catch (e: any) {
        finalOutput = `Failed to execute command: ${e.message}`;
        await updateDoc(logRef, { status: 'Error', output: finalOutput });
        revalidatePath(`/servers/${serverId}`);
        return { logId: logRef.id, status: 'Error', output: finalOutput };
    }
}

export async function executeCommand(serverId: string, command: string) {
    if (!serverId) {
        return { error: "Server not selected" };
    }
    try {
        const result = await executeSingleCommand(serverId, command);
        return { output: result.output, error: result.status === 'Error' ? result.output : undefined };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function executeSavedCommand(serverId: string, savedCommandId: string) {
    const savedCommandDoc = await getDoc(doc(firestore, "savedCommands", savedCommandId));
    if (!savedCommandDoc.exists()) {
        throw new Error("Saved command not found.");
    }
    const savedCommand = savedCommandDoc.data();

    const mainResult = await executeSingleCommand(serverId, savedCommand.command);

    if (mainResult.status === 'Success' && savedCommand.nextCommands && savedCommand.nextCommands.length > 0) {
        for (const nextCommandId of savedCommand.nextCommands) {
            const nextCommandDoc = await getDoc(doc(firestore, "savedCommands", nextCommandId));
            if (nextCommandDoc.exists()) {
                const nextCommand = nextCommandDoc.data();
                // We execute the next command but don't need to wait or handle its result in this flow
                await executeSingleCommand(serverId, nextCommand.command);
            }
        }
    }

    return mainResult;
}
