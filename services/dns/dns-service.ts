// Server-only DNS utilities for neup.cloud
// All code here must only run on the server (Node.js)

import dns from 'dns';

export async function resolveHostname(hostname: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    dns.resolve(hostname, (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses);
    });
  });
}

export async function lookup(hostname: string): Promise<{ address: string; family: number }> {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address, family) => {
      if (err) return reject(err);
      resolve({ address, family });
    });
  });
}

// Add more DNS-related utilities as needed
