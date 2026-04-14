import type { Metadata } from 'next';
import ServersClient from './servers-client';

export const metadata: Metadata = {
  title: 'Servers, Neup.Cloud',
};

export default function Page() {
  return <ServersClient />;
}
