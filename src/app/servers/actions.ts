
'use server';

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

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
    return { id: serverDoc.id, ...serverDoc.data() };
}

export async function createServer(serverData: {
    name: string;
    type: string;
    provider: string;
    ram: string;
    storage: string;
    publicIp: string;
    privateIp: string;
    privateKey: string;
    status: string;
}) {
    await addDoc(collection(firestore, 'servers'), serverData);
    revalidatePath('/servers');
}

export async function updateServer(id: string, serverData: Partial<{
    name: string;
    type: string;
    provider: string;
    ram: string;
    storage: string;
    publicIp: string;
    privateIp: string;
    privateKey: string;
}>) {
    await updateDoc(doc(firestore, 'servers', id), serverData);
    revalidatePath(`/servers/${id}`);
    revalidatePath('/servers');
}


export async function deleteServer(id: string) {
    await deleteDoc(doc(firestore, "servers", id));
    revalidatePath('/servers');
}

export async function updateServerStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'Running' ? 'Stopped' : 'Running';
    const serverDoc = doc(firestore, "servers", id);
    await updateDoc(serverDoc, { status: newStatus });
    revalidatePath('/servers');
    revalidatePath(`/servers/${id}`);
}
