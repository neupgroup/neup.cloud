
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Globe, Search, ShoppingCart, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { checkDomain, type DomainStatus } from './actions';
import { useToast } from '@/hooks/use-toast';

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

export default function DomainsPage() {
  const searchParams = useSearchParams();
  const [domainQuery, setDomainQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<DomainStatus[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [searchParams]);

  const handleSearch = async (query: string) => {
    if (!query) return;
    startSearchTransition(async () => {
      const results = await checkDomain(query);
      setSearchResults(results);
    });
  };
  
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearch(domainQuery);
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Globe className="w-8 h-8" />
            Find Your Perfect Domain
        </h1>
        <p className="text-muted-foreground">
          Search for and register your new domain name instantly.
        </p>
      </div>

      <div className="flex gap-2">
          <Input 
              value={domainQuery}
              onChange={(e) => setDomainQuery(e.target.value)}
              placeholder="your-awesome-idea.com" 
              className="flex-grow" 
          />
          <Button type="submit" disabled={isSearching} onClick={() => handleSearch(domainQuery)}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" />Search</>}
          </Button>
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

      {!isSearching && searchResults.length === 0 && domainQuery && (
         <Card className="text-center p-8 text-muted-foreground">
            No results found for "{domainQuery}". Try another search.
        </Card>
      )}

    </div>
  );
}
