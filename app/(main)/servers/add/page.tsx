import { Metadata } from 'next';
import AddServerClientPage from './client-page';

export const metadata: Metadata = {
    title: 'Add Server, Neup.Cloud',
    description: 'Add a new server to your account.',
};

export default function AddServerPage() {
    return <AddServerClientPage />;
}
