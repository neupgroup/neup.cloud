'use client';

import { PageTitle } from '@/components/page-header';
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from '@/lib/utils';

interface RequirementItem {
    name: string;
    details: string;
    status: 'met' | 'not_met' | 'warning';
}

const mockRequirements: RequirementItem[] = [
    { name: 'OS Version', details: 'Ubuntu 22.04 LTS or newer', status: 'met' },
    { name: 'Memory', details: 'Minimum 4GB RAM required', status: 'met' },
    { name: 'Disk Space', details: 'At least 20GB free space', status: 'met' },
    { name: 'Network Ports', details: 'Ports 80, 443 must be open', status: 'met' },
    { name: 'User Privileges', details: 'Root access or sudo privileges', status: 'met' },
    { name: 'Virtualization', details: 'KVM support enabled', status: 'warning' },
];

export default function RequirementsPage() {
    return (
        <div className="space-y-6">
            <PageTitle
                title="System Requirements"
                description="Verify system requirements and prerequisites."
            />

            <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm">
                {mockRequirements.map((req, index) => (
                    <div key={req.name} className={cn(
                        "p-4 min-w-0 w-full transition-colors hover:bg-muted/50",
                        index !== mockRequirements.length - 1 && "border-b border-border"
                    )}>
                        <div className="flex items-start gap-4">
                            <div className="pt-0.5">
                                {req.status === 'met' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                {req.status === 'not_met' && <XCircle className="h-5 w-5 text-red-500" />}
                                {req.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-foreground leading-none">
                                    {req.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {req.details}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </Card>
        </div>
    );
}
