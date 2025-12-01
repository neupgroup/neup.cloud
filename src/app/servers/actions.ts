
'use server';

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { runCommandOnServer } from '@/services/ssh';

// This is a temporary solution to get the firestore instance on the server.
// In a real-world scenario, you would want to use the Firebase Admin SDK for server-side operations.
const { firestore } = initializeFirebase();

export async function getServers() {
  const querySnapshot = await getDocs(collection(firestore, "servers"));
  const serversData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return serversData;
}

export async function getServer(id: string) {
    const serverDoc = await getDoc(doc(firestore, "servers", id));
    if (!serverDoc.exists()) {
        return null;
    }
    const { privateKey, privateIp, ...serverData } = serverDoc.data();
    return { id: serverDoc.id, ...serverData };
}

export async function getServerForRunner(id: string) {
    const serverDoc = await getDoc(doc(firestore, "servers", id));
    if (!serverDoc.exists()) {
        return null;
    }
    return { id: serverDoc.id, ...serverDoc.data() } as {
        id: string;
        name: string;
        username: string;
        type: string;
        provider: string;
        ram: string;
        storage: string;
        publicIp: string;
        privateIp?: string;
        privateKey?: string;
    };
}

export async function getRamUsage(serverId: string) {
  const server = await getServerForRunner(serverId);
  if (!server || !server.privateKey || !server.username) {
    return { error: 'Server details (IP, key, or username) not found.' };
  }

  try {
    const result = await runCommandOnServer(server.publicIp, server.username, server.privateKey, 'free -m');
    if (result.code !== 0) {
      return { error: result.stderr || 'Failed to get RAM usage.' };
    }
    const lines = result.stdout.split('\n');
    const memLine = lines.find(line => line.startsWith('Mem:'));
    if (memLine) {
      const parts = memLine.split(/\s+/);
      // parts[0] is 'Mem:', parts[1] is total, parts[2] is used
      const usedRam = parseInt(parts[2], 10);
      return { usedRam };
    }
    return { error: 'Could not parse memory usage.' };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function createServer(serverData: {
    name: string;
    username: string;
    type: string;
    provider: string;
    ram: string;
    storage: string;
    publicIp: string;
    privateIp: string;
    privateKey: string;
}) {
    await addDoc(collection(firestore, 'servers'), serverData);
    revalidatePath('/servers');
}

export async function updateServer(id: string, serverData: Partial<{
    name: string;
    username: string;
    type: string;
    provider: string;
    ram: string;
    storage: string;
    publicIp: string;
    privateIp: string;
    privateKey: string;
}>) {
    const updateData: { [key: string]: any } = { ...serverData };

    // Only include private IP and private key if they are not empty strings
    if (serverData.privateIp === '' || serverData.privateIp === undefined) {
        delete updateData.privateIp;
    }
    if (serverData.privateKey === '' || serverData.privateKey === undefined) {
        delete updateData.privateKey;
    }

    if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(firestore, 'servers', id), updateData);
        revalidatePath(`/servers/${id}`);
        revalidatePath('/servers');
    }
}


export async function deleteServer(id: string) {
    await deleteDoc(doc(firestore, "servers", id));
    revalidatePath('/servers');
}
