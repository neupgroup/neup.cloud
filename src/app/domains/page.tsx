
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Search, ShoppingCart, CheckCircle, XCircle, Loader2, PlusCircle, ArrowRight } from 'lucide-react';
import { checkDomain, addDomain, getDomains, type DomainStatus, type ManagedDomain } from './actions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

function AddDomainForm({ onDomainAdded }: { onDomainAdded: () => void }) {
    const { toast } = useToast();
    const [domainName, setDomainName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!domainName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Domain name cannot be empty.' });
            return;
        }
        setIsAdding(true);
        try {
            await addDomain(domainName);
            toast({ title: 'Success', description: `Domain "${domainName}" added. Please configure its nameservers.` });
            setDomainName('');
            onDomainAdded();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error adding domain', description: error.message });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Add an Existing Domain</CardTitle>
                <CardDescription>Add a domain you already own to manage it with Neup.Cloud.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            value={domainName}
                            onChange={(e) => setDomainName(e.target.value)}
                            placeholder="your-domain.com"
                            className="flex-grow"
                            disabled={isAdding}
                        />
                        <Button type="submit" disabled={isAdding}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Add Domain</>}
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
}

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
        return <LoadingSkeleton />;
    }
    
    if (domains.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                You haven't added any domains yet.
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {domains.map(domain => (
                <Card key={domain.id} className="flex items-center justify-between p-4">
                    <div>
                        <p className="text-lg font-bold font-headline">{domain.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getStatusBadge(domain.status)}
                            <span>Added {formatDistanceToNow(new Date(domain.addedAt), { addSuffix: true })}</span>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [domainQuery, setDomainQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<DomainStatus[]>([]);
  const [managedDomains, setManagedDomains] = useState<ManagedDomain[]>([]);
  const [isManagedDomainsLoading, setIsManagedDomainsLoading] = useState(true);
  const [isSearching, startSearchTransition] = useTransition();

  const fetchManagedDomains = async () => {
    setIsManagedDomainsLoading(true);
    try {
        const domains = await getDomains();
        setManagedDomains(domains);
    } finally {
        setIsManagedDomainsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagedDomains();
  }, []);

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      handleSearch(initialQuery);
      // Clear the query from URL after searching to not persist it
      router.replace('/domains', { scroll: false });
    }
  }, []);

  const handleSearch = async (query: string) => {
    if (!query) return;
    startSearchTransition(async () => {
      const results = await checkDomain(query);
      setSearchResults(results);
    });
  };
  
  const onSearchFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearch(domainQuery);
  }

  return (
    <div className="grid gap-8">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                <Globe className="w-8 h-8" />
                Domains
            </h1>
            <p className="text-muted-foreground">
              Add, purchase, and manage your domains.
            </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-headline">My Domains</h2>
                <ManagedDomainList domains={managedDomains} isLoading={isManagedDomainsLoading} />
            </div>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-headline">Add or Find a Domain</h2>
                <AddDomainForm onDomainAdded={fetchManagedDomains} />
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Find a New Domain</CardTitle>
                        <CardDescription>Search for and register your new domain name instantly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={onSearchFormSubmit} className="flex gap-2">
                            <Input 
                                value={domainQuery}
                                onChange={(e) => setDomainQuery(e.target.value)}
                                placeholder="your-awesome-idea.com" 
                                className="flex-grow" 
                            />
                            <Button type="submit" disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" />Search</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>

      {isSearching && <LoadingSkeleton />}
      
      {!isSearching && searchResults.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>Here are the availability results for "{domainQuery}".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {searchResults.map((domain) => (
                    <DomainResultCard key={domain.name} domain={domain} />
                ))}
            </CardContent>
         </Card>
      )}

    </div>
  );
}
