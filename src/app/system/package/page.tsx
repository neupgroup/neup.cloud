'use client';

import { PageTitle } from '@/components/page-header';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Package as PackageIcon } from "lucide-react";
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PackageItem {
    name: string;
    version: string;
    description: string;
    status: 'installed' | 'pending' | 'update_available';
}

const mockPackages: PackageItem[] = [
    { name: 'nginx-core', version: '1.18.0', description: 'High performance web server', status: 'installed' },
    { name: 'postgresql-14', version: '14.10', description: 'Object-relational SQL database', status: 'installed' },
    { name: 'nodejs', version: '20.10.0', description: 'JavaScript runtime', status: 'update_available' },
    { name: 'docker-ce', version: '24.0.7', description: 'Containerization platform', status: 'installed' },
    { name: 'ufw', version: '0.36.1', description: 'Uncomplicated Firewall', status: 'installed' },
];

export default function PackagesPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPackages = mockPackages.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageTitle
                title="System Packages"
                description="Manage installed system packages and updates."
            />

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                {filteredPackages.map((pkg, index) => (
                    <div key={pkg.name} className={cn(
                        "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                        index !== filteredPackages.length - 1 && "border-b border-border"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground break-all font-mono">
                                        {pkg.name}
                                    </p>
                                    <span className={cn(
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                                        pkg.status === 'update_available'
                                            ? "bg-yellow-50 text-yellow-800 ring-yellow-600/20"
                                            : "bg-green-50 text-green-700 ring-green-600/20"
                                    )}>
                                        {pkg.status === 'update_available' ? 'Update Available' : 'Installed'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{pkg.description}</p>
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground font-mono">
                                v{pkg.version}
                            </div>
                        </div>
                    </div>
                ))}
            </Card>
        </div>
    );
}
