
'use server';

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { runCommandOnServer } from '@/services/ssh';
import { cookies } from 'next/headers';

// This is a temporary solution to get the firestore instance on the server.
// In a real-world scenario, you would want to use the Firebase Admin SDK for server-side operations.
const { firestore } = initializeFirebase();

export async function selectServer(serverId: string, serverName: string) {
  const cookieStore = await cookies();
  cookieStore.set('selected_server', serverId);
  cookieStore.set('selected_server_name', serverName);
  revalidatePath('/');
  return { success: true };
}

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
  return { id: serverDoc.id, ...serverData } as {
    id: string;
    name: string;
    proxyHandler?: string;
    loadBalancer?: string;
    [key: string]: any;
  };
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
    proxyHandler?: string;
    loadBalancer?: string;
  };
}

export async function getRamUsage(serverId: string) {
  const server = await getServerForRunner(serverId);
  if (!server) {
    return { error: 'Server not found.' };
  }
  if (!server.username || !server.privateKey) {
    return { error: 'Server is missing username or private key configuration for SSH access.' };
  }

  try {
    // ps -eo rss= lists the resident set size (memory usage) of all processes in kilobytes
    const result = await runCommandOnServer(server.publicIp, server.username, server.privateKey, 'ps -eo rss=');
    if (result.code !== 0) {
      return { error: result.stderr || 'Failed to get RAM usage.' };
    }

    const lines = result.stdout.trim().split('\n');
    const totalRamKb = lines.reduce((sum, line) => {
      const ram = parseInt(line.trim(), 10);
      return sum + (isNaN(ram) ? 0 : ram);
    }, 0);

    const usedRam = Math.round(totalRamKb / 1024); // Convert KB to MB
    return { usedRam };

  } catch (e: any) {
    return { error: e.message };
  }
}

export async function createServer(serverData: {
  name: string;
  username: string;
  type: string;
  provider: string;
  ram?: string;
  storage?: string;
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
  proxyHandler: string;
  loadBalancer: string;
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
