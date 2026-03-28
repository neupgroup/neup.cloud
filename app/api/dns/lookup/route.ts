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
        const records: any[] = [];
        let recordId = 1;

        // Fetch A records
        try {
            const aRecords = await dns.resolve4(domain);
            aRecords.forEach((ip) => {
                records.push({
                    id: `a-${recordId++}`,
                    type: 'A',
                    name: '@',
                    value: ip,
                    ttl: 3600,
                });
            });
        } catch (err) {
            console.log(`No A records found for ${domain}`);
        }

        // Fetch A records for www subdomain
        try {
            const wwwRecords = await dns.resolve4(`www.${domain}`);
            wwwRecords.forEach((ip) => {
                records.push({
                    id: `a-www-${recordId++}`,
                    type: 'A',
                    name: 'www',
                    value: ip,
                    ttl: 3600,
                });
            });
        } catch (err) {
            console.log(`No A records found for www.${domain}`);
        }

        // Fetch AAAA records (IPv6)
        try {
            const aaaaRecords = await dns.resolve6(domain);
            aaaaRecords.forEach((ip) => {
                records.push({
                    id: `aaaa-${recordId++}`,
                    type: 'AAAA',
                    name: '@',
                    value: ip,
                    ttl: 3600,
                });
            });
        } catch (err) {
            console.log(`No AAAA records found for ${domain}`);
        }

        // Fetch MX records
        try {
            const mxRecords = await dns.resolveMx(domain);
            mxRecords.forEach((mx) => {
                records.push({
                    id: `mx-${recordId++}`,
                    type: 'MX',
                    name: '@',
                    value: `${mx.priority} ${mx.exchange}`,
                    ttl: 3600,
                });
            });
        } catch (err) {
            console.log(`No MX records found for ${domain}`);
        }

        // Fetch TXT records
        try {
            const txtRecords = await dns.resolveTxt(domain);
            txtRecords.forEach((txt) => {
                records.push({
                    id: `txt-${recordId++}`,
                    type: 'TXT',
                    name: '@',
                    value: txt.join(''),
                    ttl: 3600,
                });
            });
        } catch (err) {
            console.log(`No TXT records found for ${domain}`);
        }

        // Fetch NS records
        try {
            const nsRecords = await dns.resolveNs(domain);
            nsRecords.forEach((ns) => {
                records.push({
                    id: `ns-${recordId++}`,
                    type: 'NS',
                    name: '@',
                    value: ns,
                    ttl: 3600,
                });
            });
        } catch (err) {
            console.log(`No NS records found for ${domain}`);
        }

        // Fetch CNAME records (for common subdomains)
        const commonSubdomains = ['www', 'mail', 'ftp'];
        for (const subdomain of commonSubdomains) {
            try {
                const cnameRecords = await dns.resolveCname(`${subdomain}.${domain}`);
                cnameRecords.forEach((cname) => {
                    records.push({
                        id: `cname-${recordId++}`,
                        type: 'CNAME',
                        name: subdomain,
                        value: cname,
                        ttl: 3600,
                    });
                });
            } catch (err) {
                // CNAME not found for this subdomain, continue
            }
        }

        return NextResponse.json({ records });
    } catch (error) {
        console.error('DNS lookup error:', error);
        return NextResponse.json(
            { error: 'Failed to lookup DNS records', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
