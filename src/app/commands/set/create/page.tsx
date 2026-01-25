'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase/provider';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CommandSetForm } from '../command-set-form';
import { createCommandSet, CommandSetCommand } from '../actions';
import { Loader2 } from 'lucide-react';

export default function CreateCommandSetPage() {
    const auth = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // TEMPORARY: Hardcoded user
        const tempUid = "tempaccount";
        const mockUser = { uid: tempUid } as User;

        setUser(mockUser);
        setIsLoading(false);

        /*
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setIsLoading(false);
        });
        return () => unsubscribe();
        */
    }, [auth]);

    if (isLoading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!user) {
        return <div className="p-20 text-center">Please sign in to create command sets.</div>;
    }

    const handleSubmit = async (data: { name: string, description: string, commands: CommandSetCommand[] }) => {
        return await createCommandSet({
            userId: user.uid,
            name: data.name,
            description: data.description,
            commands: data.commands
        });
    };

    return (
        <div className="container py-8">
            <CommandSetForm
                userId={user.uid}
                title="Create Command Set"
                subtitle="Build a new sequence of commands to automate your tasks."
                onSubmit={handleSubmit}
            />
        </div>
    );
}
