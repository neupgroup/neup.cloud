
'use server';

import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { getServers } from '../servers/actions';

const { firestore } = initializeFirebase();

export async function getApplications() {
  const querySnapshot = await getDocs(collection(firestore, "applications"));
  const appsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return appsData;
}

export async function createApplication(appData: {
    name: string;
    repo: string;
    serverId?: string;
    status: string;
    url?: string;
}) {
    await addDoc(collection(firestore, 'applications'), appData);
    revalidatePath('/applications');
}

export async function deleteApplication(id: string) {
    await deleteDoc(doc(firestore, "applications", id));
    revalidatePath('/applications');
}
