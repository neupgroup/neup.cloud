import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageTitleProps {
    title: string;
    description?: string;
    className?: string;
    children?: React.ReactNode;
}

export function PageTitle({ title, description, className, children }: PageTitleProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
                {children}
            </div>
            {description && <p className="text-muted-foreground text-lg">{description}</p>}
        </div>
    );
}

interface PageTitleBackProps extends PageTitleProps {
    backHref: string;
}

export function PageTitleBack({ title, description, backHref, className, children }: PageTitleBackProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground hover:underline" asChild>
                <Link href={backHref}>
                    &lt; Go back
                </Link>
            </Button>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
                    {children}
                </div>
                {description && <p className="text-muted-foreground text-lg">{description}</p>}
            </div>
        </div>
    );
}
