
'use server';

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

    