import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Purchase Server, Neup.Cloud',
    description: 'Purchase a new server.',
};

export default function PurchaseServerPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <h1 className="text-3xl font-bold">Purchase Server</h1>
            <p className="text-muted-foreground">This feature is coming soon.</p>
        </div>
    );
}
