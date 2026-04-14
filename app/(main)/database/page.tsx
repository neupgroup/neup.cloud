import type { Metadata } from 'next';
import ClientPage from './client-page';

export const metadata: Metadata = {
  title: 'Databases, Neup.Cloud',
};

export default function Page() {
  return <ClientPage />;
}
