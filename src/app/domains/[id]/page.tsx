
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
import { getDomain, ManagedDomain } from "../actions";
import { useEffect, useState } from "react";
import { PageTitleBack } from "@/components/page-header";


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

    const [domain, setDomain] = useState<ManagedDomain | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDomain() {
            try {
                const data = await getDomain(id);
                setDomain(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadDomain();
    }, [id]);

    const domainName = loading ? "Loading..." : (domain?.name || "Unknown Domain");

    // This layout structure handles the navigation and the main content area.
    // The actual page content (overview, dns, nameservers) is passed as `children`.
    // If the current path is the base path for the domain, we show an overview card.
    const pathname = usePathname();
    const isOverviewPage = pathname === `/domains/${id}`;


    return (
        <div className="grid gap-6">
            <PageTitleBack
                title={domainName}
                description="Manage your domain settings, DNS, and more."
                backHref="/domains"
            />

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
                                {loading ? (
                                    <p>Loading details...</p>
                                ) : domain ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                                            <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                                domain.status === 'active' ? "border-transparent bg-green-500/15 text-green-700" :
                                                    domain.status === 'pending' ? "border-transparent bg-yellow-500/15 text-yellow-700" :
                                                        "border-transparent bg-red-500/15 text-red-700"
                                            )}>
                                                {domain.status}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Added On</p>
                                            <p className="font-medium">{new Date(domain.addedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Domain ID</p>
                                            <p className="font-mono text-xs text-muted-foreground">{domain.id}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p>Domain details could not be loaded.</p>
                                )}
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
