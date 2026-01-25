'use client';

import { PageTitle } from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Cpu, HardDrive } from "lucide-react";

export default function SystemPage() {
    return (
        <div className="space-y-8">
            <PageTitle
                title="System Overview"
                description="View system status and general configuration."
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total CPU
                        </CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12%</div>
                        <p className="text-xs text-muted-foreground">
                            +2% from last hour
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Memory Usage
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2 GB</div>
                        <p className="text-xs text-muted-foreground">
                            total 16 GB
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Disk Space
                        </CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">245 GB</div>
                        <p className="text-xs text-muted-foreground">
                            32% free
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="p-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">System Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">OS Class</span>
                            <span className="font-mono">Linux</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Distribution</span>
                            <span className="font-mono">Ubuntu 22.04 LTS</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Kernel</span>
                            <span className="font-mono">5.15.0-91-generic</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Architecture</span>
                            <span className="font-mono">x86_64</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
