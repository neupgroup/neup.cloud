'use server';

import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

export interface EnvironmentVariable {
    id: string;
    key: string;
    value: string;
    targetType: 'account' | 'server' | 'app';
    selectedTargets: string[];
    isConfidential: boolean;
    protectValue: boolean;
    createdAt?: any;
}

export async function getEnvironmentVariables() {
    try {
        const q = query(collection(firestore, 'environmentVariables'), orderBy('key', 'asc'));
        const querySnapshot = await getDocs(q);
        const variables: EnvironmentVariable[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EnvironmentVariable));
        return { variables };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function createEnvironmentVariable(data: Omit<EnvironmentVariable, 'id' | 'createdAt'>) {
    try {
        await addDoc(collection(firestore, 'environmentVariables'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        revalidatePath('/environments');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deleteEnvironmentVariable(id: string) {
    try {
        await deleteDoc(doc(firestore, 'environmentVariables', id));
        revalidatePath('/environments');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
