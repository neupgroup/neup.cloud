
'use server';

import { addDoc, collection, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

export type DomainStatus = {
    name: string;
    isAvailable: boolean;
    price: number;
    tld: string;
};

// This is a mock function. In a real application, you would use a domain registrar's API.
export async function checkDomain(domain: string): Promise<DomainStatus[]> {
    const tlds = ['.com', '.net', '.org', '.io', '.app', '.dev'];
    const baseName = domain.split('.')[0];

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const results: DomainStatus[] = tlds.map(tld => {
        const fullName = `${baseName}${tld}`;
        const isAvailable = Math.random() > 0.3; // 70% chance of being available
        let price = 12.99;
        if (tld === '.io') price = 39.99;
        if (tld === '.app' || tld === '.dev') price = 19.99;

        return {
            name: fullName,
            isAvailable: fullName.toLowerCase() === domain.toLowerCase() ? isAvailable : Math.random() > 0.5,
            price,
            tld,
        };
    });

    // Ensure the specifically searched domain is first in the list
    const searchedDomainIndex = results.findIndex(r => r.name.toLowerCase() === domain.toLowerCase());
    if (searchedDomainIndex > 0) {
        const [searchedDomain] = results.splice(searchedDomainIndex, 1);
        results.unshift(searchedDomain);
    }

    return results;
}

export type ManagedDomain = {
    id: string;
    name: string;
    status: 'pending' | 'active' | 'error';
    addedAt: string;
};

export async function addDomain(domainName: string) {
    if (!domainName) {
        throw new Error('Domain name cannot be empty.');
    }
    
    // Check if domain already exists
    const q = query(collection(firestore, 'domains'), where('name', '==', domainName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`Domain "${domainName}" has already been added.`);
    }

    await addDoc(collection(firestore, 'domains'), {
        name: domainName,
        status: 'pending',
        addedAt: serverTimestamp(),
    });

    revalidatePath('/domains');
}

export async function getDomains(): Promise<ManagedDomain[]> {
    const querySnapshot = await getDocs(collection(firestore, "domains"));
    const domains = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            status: data.status,
            addedAt: data.addedAt?.toDate().toISOString() || new Date().toISOString(),
        }
    }) as ManagedDomain[];
    return domains;
}
