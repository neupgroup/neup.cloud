import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get('domain');

    if (!domain) {
        return NextResponse.json(
            { error: 'Domain parameter is required' },
            { status: 400 }
        );
    }

    try {
        // Fetch NS records (nameservers) for the domain
        const nameservers = await dns.resolveNs(domain);

        return NextResponse.json({
            nameservers: nameservers.sort() // Sort alphabetically for consistency
        });
    } catch (error) {
        console.error('Nameserver lookup error:', error);

        // If DNS lookup fails, return default neup.cloud nameservers
        // This could mean the domain is newly added and not yet configured
        return NextResponse.json({
            nameservers: [
                "ns1.neup.cloud",
                "ns2.neup.cloud",
                "ns3.neup.cloud",
                "ns4.neup.cloud",
            ],
            isDefault: true,
            error: error instanceof Error ? error.message : 'Failed to resolve nameservers'
        });
    }
}