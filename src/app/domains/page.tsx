'use client';

import React, { useState, useEffect } from 'react';
import { PageTitle } from '@/components/page-header';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Search, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import { getDomains, type ManagedDomain } from './actions';
import { formatDistanceToNow } from 'date-fns';

function ManagedDomainList({ domains, isLoading }: { domains: ManagedDomain[], isLoading: boolean }) {
    const getStatusBadge = (status: ManagedDomain['status']) => {
        switch (status) {
            case 'active':
                return <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-400">Active</Badge>;
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            case 'pending':
            default:
                return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-400">Pending</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="flex items-center justify-between p-4">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-9 w-24" />
                    </Card>
                ))}
            </div>
        )
    }

    if (domains.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg space-y-4">
                <Globe className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">You haven't added any domains yet.</p>
                <Button asChild variant="default">
                    <Link href="/domains/find">Add Domain</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {domains.map(domain => (
                <Card key={domain.id} className="flex items-center justify-between p-4 group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-lg font-bold font-headline">{domain.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getStatusBadge(domain.status)}
                            <span>Added {formatDistanceToNow(new Date(domain.addedAt), { addSuffix: true })}</span>
                        </div>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/domains/${domain.id}`}>
                            Manage <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </Card>
            ))}
        </div>
    );
}

export default function DomainsPage() {

    const [managedDomains, setManagedDomains] = useState<ManagedDomain[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        const fetchDomains = async () => {
            setIsLoading(true);
            try {
                const data = await getDomains();
                setManagedDomains(data);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDomains();
    }, []);



    return (
        <div className="grid gap-8">
            <PageTitle
                title="Domains"
                description="Manage your existing domains or find a new one."
            >
                <Button asChild>
                    <Link href="/domains/find">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Domain
                    </Link>
                </Button>
            </PageTitle>



            <div>
                <h2 className="text-xl font-semibold font-headline mb-4">My Domains</h2>
                <ManagedDomainList domains={managedDomains} isLoading={isLoading} />
            </div>
        </div>
    );
}
