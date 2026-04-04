import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDatabaseById } from '@/services/databases/data';
import ShellClient from './shell-client';

export const metadata: Metadata = {
  title: 'Database Shell, Neup.Cloud',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DatabaseShellPage({ params }: Props) {
  const { id } = await params;
  const connection = await getDatabaseById(id);

  if (!connection) {
    notFound();
  }

  return <ShellClient connectionId={connection.id} title={connection.title} connectionType={connection.connectionType} />;
}
