import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDatabaseById } from '@/services/databases/data';
import DatabaseConnectionClient from './database-connection-client';

export const metadata: Metadata = {
  title: 'Database Connection, Neup.Cloud',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DatabaseConnectionDetailsPage({ params }: Props) {
  const { id } = await params;
  const connection = await getDatabaseById(id);

  if (!connection) {
    notFound();
  }

  return <DatabaseConnectionClient connection={connection} />;
}
