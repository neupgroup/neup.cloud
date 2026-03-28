'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function ServerNameLink({ name, className }: { name: string; className?: string }) {
    const router = useRouter();

    return (
        <span
            className={cn(
                "font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors",
                className
            )}
            onClick={() => {
                const currentPath = window.location.pathname;
                router.push(`/servers?redirects=${currentPath}`);
            }}
        >
            {name}
        </span>
    );
}
