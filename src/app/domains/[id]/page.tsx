
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Globe,
  Network,
  Server,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
    useParams,
    usePathname,
    useRouter,
} from 'next/navigation';
import { cn } from "@/lib/utils";


function DomainNavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href}>
            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start">
                {children}
            </Button>
        </Link>
    );
}

export default function DomainDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const id = params.id as string;
  const domainName = "example.com"; // In a real app, you would fetch this by id

  // This layout structure handles the navigation and the main content area.
  // The actual page content (overview, dns, nameservers) is passed as `children`.
  // If the current path is the base path for the domain, we show an overview card.
  const pathname = usePathname();
  const isOverviewPage = pathname === `/domains/${id}`;


  return (
    <div className="grid gap-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/domains">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to domains</span>
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <Globe className="w-8 h-8" />
                    {domainName}
                </h1>
                <p className="text-muted-foreground">
                    Manage your domain settings, DNS, and more.
                </p>
            </div>
        </div>

        <div className="grid md:grid-cols-[200px_1fr] gap-8">
            <aside className="w-full">
                <nav className="grid gap-1">
                     <DomainNavLink href={`/domains/${id}`}>
                        <Globe className="mr-2 h-4 w-4" /> Overview
                    </DomainNavLink>
                    <DomainNavLink href={`/domains/${id}/dns`}>
                        <Network className="mr-2 h-4 w-4" /> DNS Records
                    </DomainNavLink>
                    <DomainNavLink href={`/domains/${id}/nameservers`}>
                        <Server className="mr-2 h-4 w-4" /> Nameservers
                    </DomainNavLink>
                     <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 mt-4">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Domain
                    </Button>
                </nav>
            </aside>
            <main>
                {isOverviewPage ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Domain Overview</CardTitle>
                            <CardDescription>
                                Current status and configuration for {domainName}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>Overview content will go here. You can manage DNS records and nameservers using the sidebar navigation.</p>
                        </CardContent>
                    </Card>
                ) : (
                    children
                )}
            </main>
        </div>
    </div>
  );
}
