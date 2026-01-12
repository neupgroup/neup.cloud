
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageTitleProps {
    title: React.ReactNode;
    description?: React.ReactNode;
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
            {description && <div className="text-muted-foreground text-lg">{description}</div>}
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
                {description && <div className="text-muted-foreground text-lg">{description}</div>}
            </div>
        </div>
    );
}

interface PageTitleWithComponentProps extends PageTitleProps {
    actionComponent: React.ReactNode;
}

export function PageTitleWithComponent({ title, description, className, actionComponent, children }: PageTitleWithComponentProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
                {actionComponent}
                {children && <div className="ml-auto">{children}</div>}
            </div>
            {description && <div className="text-muted-foreground text-lg">{description}</div>}
        </div>
    );
}

interface PageTitleBackWithComponentProps extends PageTitleBackProps {
    actionComponent: React.ReactNode;
}

export function PageTitleBackWithComponent({ title, description, backHref, className, actionComponent, children }: PageTitleBackWithComponentProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground hover:underline" asChild>
                <Link href={backHref}>
                    &lt; Go back
                </Link>
            </Button>
            <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
                    {actionComponent}
                    {children && <div className="ml-auto">{children}</div>}
                </div>
                {description && <div className="text-muted-foreground text-lg">{description}</div>}
            </div>
        </div>
    );
}
