import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get('domain');
    const verificationCode = searchParams.get('code');

    if (!domain || !verificationCode) {
        return NextResponse.json(
            { error: 'Domain and verification code are required' },
            { status: 400 }
        );
    }

    try {
        // Fetch TXT records for the domain
        const txtRecords = await dns.resolveTxt(domain);

        // Expected TXT record format: neup.verify.{24-character-code}
        const expectedRecord = `neup.verify.${verificationCode}`;

        // Check if any TXT record matches our verification code
        const verified = txtRecords.some(record => {
            // TXT records come as arrays of strings, join them
            const recordValue = record.join('');
            return recordValue === expectedRecord;
        });

        return NextResponse.json({
            verified,
            expectedRecord,
            message: verified
                ? 'Domain verified successfully!'
                : 'Verification record not found. Please add the TXT record and try again.'
        });
    } catch (error) {
        console.error('DNS verification error:', error);
        return NextResponse.json({
            verified: false,
            error: 'Failed to verify domain. Please ensure the TXT record is added and DNS has propagated.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
