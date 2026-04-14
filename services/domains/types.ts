export type DomainStatus = {
  name: string;
  isAvailable: boolean;
  price: number;
  tld: string;
};

export type DNSRecord = {
  id: string;
  type: 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA' | 'NS';
  name: string;
  value: string;
  ttl: number;
};

export type ManagedDomain = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'error';
  addedAt: string;
  verificationCode?: string;
  verified?: boolean;
};

