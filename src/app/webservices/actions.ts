'use server';

import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

export type WebServiceType = 'nginx' | 'apache' | 'caddy';

export interface WebServiceConfig {
    id?: string;
    name?: string; // Optional configuration name
    type: WebServiceType;
    created_on: any; // Firestore Timestamp
    created_by: string;
    value: any; // JSON configuration
    serverId?: string; // Optional server reference
    serverName?: string; // Optional server name
}

/**
 * Save a web service configuration
 */
export async function saveWebServiceConfig(
    type: WebServiceType,
    value: any,
    createdBy: string,
    serverId?: string,
    serverName?: string,
    name?: string
): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
        const configData: Omit<WebServiceConfig, 'id'> = {
            type,
            name,
            created_on: serverTimestamp(),
            created_by: createdBy,
            value,
            serverId,
            serverName,
        };

        const docRef = await addDoc(collection(firestore, 'webservices'), configData);

        revalidatePath('/webservices');
        revalidatePath('/webservices/nginx');

        return {
            success: true,
            id: docRef.id,
            message: 'Configuration saved successfully'
        };
    } catch (error: any) {
        console.error('Error saving web service config:', error);
        return {
            success: false,
            message: error.message || 'Failed to save configuration'
        };
    }
}

/**
 * Update an existing web service configuration
 */
export async function updateWebServiceConfig(
    id: string,
    value: any,
    name?: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const updateData: any = {
            value,
            updated_on: serverTimestamp(),
        };

        if (name !== undefined) {
            updateData.name = name;
        }

        await updateDoc(doc(firestore, 'webservices', id), updateData);

        revalidatePath('/webservices');
        revalidatePath('/webservices/nginx');

        return {
            success: true,
            message: 'Configuration updated successfully'
        };
    } catch (error: any) {
        console.error('Error updating web service config:', error);
        return {
            success: false,
            message: error.message || 'Failed to update configuration'
        };
    }
}

/**
 * Delete a web service configuration
 */
export async function deleteWebServiceConfig(id: string): Promise<{ success: boolean; message?: string }> {
    try {
        await deleteDoc(doc(firestore, 'webservices', id));

        revalidatePath('/webservices');
        revalidatePath('/webservices/nginx');

        return {
            success: true,
            message: 'Configuration deleted successfully'
        };
    } catch (error: any) {
        console.error('Error deleting web service config:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete configuration'
        };
    }
}

/**
 * Get a specific web service configuration by ID
 */
export async function getWebServiceConfig(id: string): Promise<WebServiceConfig | null> {
    try {
        const docSnap = await getDoc(doc(firestore, 'webservices', id));

        if (!docSnap.exists()) {
            return null;
        }

        return serializeConfig(docSnap.id, docSnap.data());
    } catch (error) {
        console.error('Error getting web service config:', error);
        return null;
    }
}

function serializeConfig(id: string, data: any): WebServiceConfig {
    return {
        id,
        ...data,
        created_on: data.created_on?.toDate ? data.created_on.toDate().toISOString() : data.created_on,
        updated_on: data.updated_on?.toDate ? data.updated_on.toDate().toISOString() : data.updated_on,
    };
}

/**
 * Get all web service configurations
 */
export async function getAllWebServiceConfigs(): Promise<WebServiceConfig[]> {
    try {
        const querySnapshot = await getDocs(
            query(
                collection(firestore, 'webservices'),
                orderBy('created_on', 'desc')
            )
        );

        return querySnapshot.docs.map(doc => serializeConfig(doc.id, doc.data()));
    } catch (error) {
        console.error('Error getting web service configs:', error);
        return [];
    }
}

/**
 * Get web service configurations by type
 */
export async function getWebServiceConfigsByType(type: WebServiceType): Promise<WebServiceConfig[]> {
    try {
        const querySnapshot = await getDocs(
            query(
                collection(firestore, 'webservices'),
                where('type', '==', type)
            )
        );

        const configs = querySnapshot.docs.map(doc => serializeConfig(doc.id, doc.data()));

        // Sort by created_on desc in memory to avoid needing a composite index
        // Sort by created_on desc in memory to avoid needing a composite index
        return configs.sort((a, b) => {
            const timeA = new Date(a.created_on).getTime();
            const timeB = new Date(b.created_on).getTime();
            return timeB - timeA;
        });
    } catch (error) {
        console.error('Error getting web service configs by type:', error);
        return [];
    }
}

/**
 * Get web service configurations by server
 */
export async function getWebServiceConfigsByServer(serverId: string): Promise<WebServiceConfig[]> {
    try {
        const querySnapshot = await getDocs(
            query(
                collection(firestore, 'webservices'),
                where('serverId', '==', serverId),
                orderBy('created_on', 'desc')
            )
        );

        return querySnapshot.docs.map(doc => serializeConfig(doc.id, doc.data()));
    } catch (error) {
        console.error('Error getting web service configs by server:', error);
        return [];
    }
}

/**
 * Get the latest web service configuration for a specific type and server
 */
export async function getLatestWebServiceConfig(
    type: WebServiceType,
    serverId?: string
): Promise<WebServiceConfig | null> {
    try {
        let q = query(
            collection(firestore, 'webservices'),
            where('type', '==', type)
        );

        if (serverId) {
            q = query(q, where('serverId', '==', serverId));
        }

        q = query(q, orderBy('created_on', 'desc'));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const firstDoc = querySnapshot.docs[0];
        return serializeConfig(firstDoc.id, firstDoc.data());
    } catch (error) {
        console.error('Error getting latest web service config:', error);
        return null;
    }
}
