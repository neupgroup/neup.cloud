import { useToast } from '@/core/hooks/use-toast';
import { useState } from "react";

import { performGitOperation } from '@/services/applications/actions';

export interface RepoControlsProps {
    applicationId: string;
}

export function useRepoControls(applicationId: string) {
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (operation: 'clone' | 'pull' | 'pull-force' | 'reset-main') => {
        setLoading(operation);
        try {
            await performGitOperation(applicationId, operation);
            toast({
                title: "Operation Started",
                description: `Git operation '${operation}' has been dispatched.`,
            });
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Operation Failed",
                description: error.message || "Could not perform git operation.",
            });
        } finally {
            setLoading(null);
        }
    };

    return { loading, handleAction };
}
