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

const swapScript = `# 1. Define the swap file path
SWAP_FILE="/command_swapfile"

# 2. Allocate 4GB of space
sudo fallocate -l 4G "$SWAP_FILE"

# 3. specific permissions (security requirement for swap)
sudo chmod 600 "$SWAP_FILE"

# 4. specific the file as swap space
sudo mkswap "$SWAP_FILE"

# 5. Enable the swap file
sudo swapon "$SWAP_FILE"`;

const requiredPackages = [
    { name: 'nginx-core', description: 'High performance web server' },
    { name: 'postgresql-14', description: 'Object-relational SQL database' },
    { name: 'nodejs', description: 'JavaScript runtime environment' },
    { name: 'docker-ce', description: 'Containerization platform' },
    { name: 'ufw', description: 'Uncomplicated Firewall' },
    { name: 'certbot', description: 'SSL Certificate automation' },
    { name: 'git', description: 'Version control system' },
    { name: 'curl', description: 'Command line tool for transferring data' },
    { name: 'unzip', description: 'Archive extraction utility' }
];

export default function RequirementsPage() {
    return (
        <div className="space-y-6">
            <PageTitle
                title="System Requirements"
                description="Verify system requirements, configuration and prerequisites."
            />

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="text-lg font-medium">Core Requirements</h3>
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
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-lg font-medium">Required Packages</h3>
                        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm p-0 overflow-hidden">
                            <div className="divide-y divide-border">
                                {requiredPackages.map((pkg) => (
                                    <div key={pkg.name} className="p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="font-mono text-sm font-medium bg-muted px-2 py-0.5 rounded text-foreground">
                                                {pkg.name}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {pkg.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="text-lg font-medium">Swap Space Configuration</h3>
                        <Card className="min-w-0 w-full rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Run the following commands to configure 4GB of swap space. This is critical for system stability.
                            </p>
                            <div className="relative rounded-md bg-muted p-4 overflow-x-auto">
                                <pre className="text-sm font-mono leading-relaxed text-foreground">
                                    {swapScript}
                                </pre>
                            </div>
                        </Card>
                    </section>
                </div>
            </div>
        </div>
    );
}
