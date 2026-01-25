'use server';

import { addDoc, collection, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

export interface CommandSetCommand {
    id: string;
    title: string;
    command: string;
    description?: string;
    order: number;
    isSkippable?: boolean;
    isRepeatable?: boolean;
}

export interface CommandSet {
    id: string;
    userId: string;
    name: string;
    description?: string;
    commands: CommandSetCommand[];
    createdAt?: string;
}

export async function createCommandSet(data: Omit<CommandSet, 'id' | 'createdAt'>) {
    try {
        const docRef = await addDoc(collection(firestore, 'commandSets'), {
            ...data,
            createdAt: new Date().toISOString()
        });
        revalidatePath('/commandset');
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error("Error creating command set:", error);
        return { success: false, error: error.message };
    }
}

export async function getCommandSets(userId: string) {
    if (!userId) return [];
    try {
        const q = query(
            collection(firestore, 'commandSets'),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as CommandSet[];
    } catch (error: any) {
        console.error("Error fetching command sets:", error);
        return [];
    }
}

export async function getCommandSet(id: string) {
    try {
        const docRef = doc(firestore, 'commandSets', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as CommandSet;
        } else {
            return null;
        }
    } catch (error: any) {
        console.error("Error fetching command set:", error);
        return null;
    }
}

export async function updateCommandSet(id: string, data: Partial<Omit<CommandSet, 'id' | 'createdAt' | 'userId'>>) {
    try {
        await updateDoc(doc(firestore, 'commandSets', id), data);
        revalidatePath('/commandset');
        revalidatePath(`/commandset/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating command set:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCommandSet(id: string) {
    try {
        await deleteDoc(doc(firestore, 'commandSets', id));
        revalidatePath('/commandset');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting command set:", error);
        return { success: false, error: error.message };
    }
}
