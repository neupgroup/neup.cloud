import { NextResponse } from 'next/server';
let dns: typeof import('dns').promises;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    dns = require('dns').promises;
} else {
    throw new Error('dns module can only be used in a Node.js environment');
}

export async function getNameservers(domain: string) {
    if (!domain) {
        return {
            error: 'Domain parameter is required',
            status: 400
        };
    }
    try {
        const nameservers = await dns.resolveNs(domain);
        return {
            nameservers: nameservers.sort(),
            status: 200
        };
    } catch (error) {
        return {
            nameservers: [
                "ns1.neup.cloud",
                "ns2.neup.cloud",
                "ns3.neup.cloud",
                "ns4.neup.cloud",
            ],
            isDefault: true,
            error: error instanceof Error ? error.message : 'Failed to resolve nameservers',
            status: 200
        };
    }
}
