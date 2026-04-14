import { NextRequest, NextResponse } from 'next/server';
import { getNameservers } from '@/services/dns/nameservers';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get('domain');
    const result = await getNameservers(domain || '');
    return NextResponse.json(result, { status: result.status });
}