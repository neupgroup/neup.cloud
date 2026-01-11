import { ApplicationForm } from '../application-form';
import { cookies } from 'next/headers';

export default async function NewApplicationPage() {
    // In a real app, you'd get the user ID from authentication
    // For now, using a placeholder or cookie-based approach
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value || 'default-user';

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">New Application</h1>
                <p className="text-muted-foreground">
                    Register a new application in your infrastructure
                </p>
            </div>

            <ApplicationForm userId={userId} />
        </div>
    );
}
