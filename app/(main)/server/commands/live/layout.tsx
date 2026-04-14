import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Terminal, Neup.Cloud',
};

export default function LiveConsoleLayout({ children }: { children: React.ReactNode }) {
  return children;
}

