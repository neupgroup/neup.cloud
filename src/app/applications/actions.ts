
'use server';

import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { executeCommand } from '../commands/actions';

const { firestore } = initializeFirebase();

export async function getApplications() {
    const querySnapshot = await getDocs(collection(firestore, "applications"));
    const appsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return appsData;
}

export async function getApplication(id: string) {
    const docRef = doc(firestore, "applications", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
}

export async function createApplication(appData: {
    name: string;
    repo: string;
    language: string;
    status: string;
    applicationLocation: string;
    commands: {
        start: string;
        stop: string;
        restart: string;
    };
    customCommands?: { name: string; command: string; }[];
    allowNetwork: boolean;
    allowedPorts: number[];
    url?: string;
}) {
    await addDoc(collection(firestore, 'applications'), appData);
    revalidatePath('/applications');
}

export async function deleteApplication(id: string) {
    await deleteDoc(doc(firestore, "applications", id));
    revalidatePath('/applications');
}

export async function updateApplication(id: string, data: any) {
    await updateDoc(doc(firestore, "applications", id), data);
    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);
}

export async function executeApplicationCommand(applicationId: string, command: string) {
    const app = await getApplication(applicationId) as any;
    if (!app) throw new Error("Application not found");
    if (!app.serverId) throw new Error("Application is not associated with any server");

    return await executeCommand(app.serverId, command);
}
