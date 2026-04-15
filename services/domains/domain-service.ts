'use server';

import { revalidatePath } from 'next/cache';
import {
  createDomain as createDomainRecord,
  deleteDomain as deleteDomainRecord,
  findDomainByName,
  getDomainById,
  getDomains as getDomainsData,
  verifyDomain as verifyDomainRecord,
} from '@/services/domains/data';
import { generateVerificationCode } from '@/services/domains/logic';
import type { DNSRecord, DomainStatus, ManagedDomain } from '@/services/domains/types';

export async function checkDomain(domain: string): Promise<DomainStatus[]> {
  const tlds = ['.com', '.net', '.org', '.io', '.app', '.dev'];
  const baseName = domain.split('.')[0];

  await new Promise((resolve) => setTimeout(resolve, 500));

  const results: DomainStatus[] = tlds.map((tld) => {
    const fullName = `${baseName}${tld}`;
    const isAvailable = Math.random() > 0.3;
    let price = 12.99;
    if (tld === '.io') price = 39.99;
    if (tld === '.app' || tld === '.dev') price = 19.99;

    return {
      name: fullName,
      isAvailable:
        fullName.toLowerCase() === domain.toLowerCase() ? isAvailable : Math.random() > 0.5,
      price,
      tld,
    };
  });

  const searchedDomainIndex = results.findIndex(
    (result) => result.name.toLowerCase() === domain.toLowerCase()
  );
  if (searchedDomainIndex > 0) {
    const [searchedDomain] = results.splice(searchedDomainIndex, 1);
    results.unshift(searchedDomain);
  }

  return results;
}

export async function getDomainDNSRecords(domainId: string): Promise<DNSRecord[]> {
  try {
    const domain = await getDomain(domainId);
    if (!domain) {
      console.error('Domain not found for ID:', domainId);
      return [];
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:25683'}/api/dns/lookup?domain=${encodeURIComponent(domain.name)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error('Failed to fetch DNS records:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('Error fetching DNS records:', error);
    return [];
  }
}

export async function getDomainNameservers(domainId: string): Promise<string[]> {
  try {
    const domain = await getDomain(domainId);
    if (!domain) {
      console.error('Domain not found for ID:', domainId);
      return [];
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:25683'}/api/dns/nameservers?domain=${encodeURIComponent(domain.name)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error('Failed to fetch nameservers:', response.statusText);
      return ['ns1.neup.cloud', 'ns2.neup.cloud', 'ns3.neup.cloud', 'ns4.neup.cloud'];
    }

    const data = await response.json();
    return data.nameservers || [];
  } catch (error) {
    console.error('Error fetching nameservers:', error);
    return ['ns1.neup.cloud', 'ns2.neup.cloud', 'ns3.neup.cloud', 'ns4.neup.cloud'];
  }
}

export async function addDomain(domainName: string) {
  if (!domainName) {
    throw new Error('Domain name cannot be empty.');
  }

  const existing = await findDomainByName(domainName);
  if (existing) {
    throw new Error(`Domain "${domainName}" has already been added.`);
  }

  await createDomainRecord({
    name: domainName,
    verificationCode: generateVerificationCode(),
  });

  revalidatePath('/domains');
}

export async function getDomains(): Promise<ManagedDomain[]> {
  return getDomainsData();
}

export async function getDomain(id: string): Promise<ManagedDomain | null> {
  if (!id) {
    return null;
  }

  try {
    return await getDomainById(id);
  } catch (error) {
    console.error('Error getting domain:', error);
    return null;
  }
}

export async function verifyDomain(domainId: string): Promise<{ success: boolean; message: string }> {
  try {
    const domain = await getDomain(domainId);
    if (!domain) {
      return { success: false, message: 'Domain not found' };
    }

    if (!domain.verificationCode) {
      return { success: false, message: 'No verification code found for this domain' };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:25683'}/api/dns/verify?domain=${encodeURIComponent(domain.name)}&code=${encodeURIComponent(domain.verificationCode)}`,
      { cache: 'no-store' }
    );

    const data = await response.json();

    if (data.verified) {
      await verifyDomainRecord(domainId);
      revalidatePath('/domains');
      revalidatePath(`/domains/${domainId}`);
      return { success: true, message: 'Domain verified successfully!' };
    }

    return {
      success: false,
      message: data.message || 'Verification failed. Please ensure the TXT record is added correctly.',
    };
  } catch (error) {
    console.error('Error verifying domain:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify domain',
    };
  }
}

export async function deleteDomain(domainId: string): Promise<{ success: boolean; message: string }> {
  try {
    const domain = await getDomain(domainId);
    if (!domain) {
      return { success: false, message: 'Domain not found' };
    }

    await deleteDomainRecord(domainId);
    revalidatePath('/domains');

    return { success: true, message: `Domain "${domain.name}" has been deleted successfully.` };
  } catch (error) {
    console.error('Error deleting domain:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete domain',
    };
  }
}

