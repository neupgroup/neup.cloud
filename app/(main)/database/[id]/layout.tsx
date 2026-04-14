import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Database Connection, Neup.Cloud',
};

export default function DatabaseConnectionLayout({ children }: { children: ReactNode }) {
  return children;
}

