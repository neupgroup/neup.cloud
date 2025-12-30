
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, HardDrive, File, Server as ServerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getServer } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Server = {
  id: string;
  name: string;
};

export default function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [server, setServer] = useState<Server | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServer = useCallback(async (serverId: string) => {
    setIsLoading(true);
    try {
      const serverData = await getServer(serverId) as Server | null;
      if (serverData) {
        setServer(serverData);
      } else {
        router.push('/servers');
      }
    } catch (e: any) {
      console.error(e);
      router.push('/servers');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchServer(params.id);
  }, [params.id, fetchServer]);

  const getActiveTab = () => {
    if (pathname.endsWith('/storage')) return 'storage';
    if (pathname.endsWith('/files')) return 'files';
    return 'details';
  };

  const handleTabChange = (value: string) => {
    if (value === 'details') {
      router.push(`/servers/${params.id}`);
    } else {
      router.push(`/servers/${params.id}/${value}`);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/servers">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold font-headline tracking-tight">{server?.name}</h1>
          )}
          <p className="text-muted-foreground">Manage your server details, settings, and run commands.</p>
        </div>
      </div>
      
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
                <ServerIcon className="mr-2 h-4 w-4" />
                Details
            </TabsTrigger>
            <TabsTrigger value="storage">
                <HardDrive className="mr-2 h-4 w-4" />
                Storage
            </TabsTrigger>
            <TabsTrigger value="files">
                <File className="mr-2 h-4 w-4" />
                Files
            </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="mt-4">
        {children}
      </div>

    </div>
  );
}
