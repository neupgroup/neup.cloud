'use client';

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, CheckCircle, XCircle, ShoppingCart, Loader2, ArrowLeft } from 'lucide-react';
import { checkDomain, type DomainStatus } from '../actions';
import Link from 'next/link';
import { PageTitleBack } from '@/components/page-header';

function DomainResultCard({ domain }: { domain: DomainStatus }) {
    const { toast } = useToast();

    const handlePurchase = () => {
        toast({
            title: "Feature not available",
            description: `Purchasing for ${domain.name} is not implemented in this demo.`,
        });
    };

    return (
        <Card className="flex flex-col sm:flex-row justify-between items-center p-4">
            <div className="flex-1 mb-4 sm:mb-0">
                <p className="text-lg font-bold font-headline">{domain.name}</p>
                {domain.isAvailable ? (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Available</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Taken</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4">
                <p className="text-xl font-semibold">${domain.price.toFixed(2)}<span className="text-sm text-muted-foreground">/yr</span></p>
                <Button onClick={handlePurchase} disabled={!domain.isAvailable}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Purchase
                </Button>
            </div>
        </Card>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col sm:flex-row justify-between items-center p-4">
                    <div className="flex-1 w-full mb-4 sm:mb-0">
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

function FindDomainContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get('query') || searchParams.get('q') || '';

    const [searchTerm, setSearchTerm] = useState(query);
    const [results, setResults] = useState<DomainStatus[]>([]);
    const [isSearching, startTransition] = useTransition();

    useEffect(() => {
        setSearchTerm(query);
        if (query) {
            performSearch(query);
        }
    }, [query]);

    const performSearch = (term: string) => {
        startTransition(async () => {
            const data = await checkDomain(term);
            setResults(data);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            router.push(`/domains/find?query=${encodeURIComponent(searchTerm)}`);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitleBack
                title="Find a domain for you"
                description="Find your perfect domain name."
                backHref="/domains"
            />

            <div className="max-w-3xl">
                <form onSubmit={handleSearch} className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="example.com"
                        className="pl-12 pr-32 h-14 text-lg rounded-full shadow-sm bg-background border-muted"
                    />
                    <div className="absolute right-2">
                        <Button type="submit" disabled={isSearching} size="sm" className="rounded-full h-10 px-6">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                        </Button>
                    </div>
                </form>
            </div>

            <div className="space-y-4">
                {isSearching ? (
                    <LoadingSkeleton />
                ) : results.length > 0 ? (
                    results.map((domain) => (
                        <DomainResultCard key={domain.name} domain={domain} />
                    ))
                ) : query && !isSearching ? (
                    <div className="text-center text-muted-foreground py-8">
                        No results found for "{query}".
                    </div>
                ) : null}
                {!query && (
                    <div className="pt-4">
                        <p className="text-sm text-muted-foreground">
                            Already feature a domain? <Link href="/domains/add" className="underline hover:text-primary">Add an existing domain</Link>.
                        </p>
                    </div>
                )}
            </div>
        </div >
    );
}

export default function FindDomainPage() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <FindDomainContent />
        </Suspense>
    )
}
