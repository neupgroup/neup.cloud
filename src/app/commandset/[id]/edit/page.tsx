'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase/provider';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CommandSetForm } from '../../command-set-form';
import { updateCommandSet, getCommandSet, CommandSet, CommandSetCommand } from '../../actions';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function EditCommandSetPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();

    // params.id might be string or string[], handle carefully. Using as string.
    const id = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [commandSet, setCommandSet] = useState<CommandSet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // TEMPORARY: Hardcoded user
        const tempUid = "tempaccount";
        const mockUser = { uid: tempUid } as User;

        setUser(mockUser);

        // Fetch data
        if (id) {
            getCommandSet(id).then(data => {
                if (data) {
                    // Check ownership if needed, but actions filter by ID for now.
                    // Ideally check data.userId === user.uid
                    if (data.userId !== mockUser.uid) {
                        setError("You do not have permission to edit this command set.");
                    } else {
                        setCommandSet(data);
                    }
                } else {
                    setError("Command set not found.");
                }
                setIsLoading(false);
            }).catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
        }
    }, [auth, id]);

    if (isLoading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (error) {
        return <div className="p-20 text-center text-destructive font-medium">{error}</div>;
    }

    if (!user || !commandSet) {
        return <div className="p-20 text-center">Something went wrong.</div>;
    }

    const handleSubmit = async (data: { name: string, description: string, commands: CommandSetCommand[] }) => {
        return await updateCommandSet(id, {
            name: data.name,
            description: data.description,
            commands: data.commands
        });
    };

    return (
        <div className="container py-8">
            <CommandSetForm
                userId={user.uid}
                initialData={commandSet}
                title="Edit Command Set"
                subtitle={`Modify "${commandSet.name}" details and steps.`}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
