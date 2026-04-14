import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Database Shell, Neup.Cloud',
};

export default function DatabaseShellLayout({ children }: { children: ReactNode }) {
  return children;
}
