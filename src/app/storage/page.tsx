
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Folder, File, Database, Server } from "lucide-react";
import { cookies } from "next/headers";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Storage, Neup.Cloud',
};

const storageItems = [
    { name: "System Files", size: "25 GB", usage: 50, icon: <HardDrive className="h-5 w-5 text-muted-foreground" /> },
    { name: "Application Data", size: "40 GB", usage: 80, icon: <Folder className="h-5 w-5 text-muted-foreground" /> },
    { name: "User Uploads", size: "15 GB", usage: 30, icon: <File className="h-5 w-5 text-muted-foreground" /> },
    { name: "Database", size: "20 GB", usage: 40, icon: <Database className="h-5 w-5 text-muted-foreground" /> },
]

export default async function StoragePage() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    const serverName = cookieStore.get('selected_server_name')?.value;

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <HardDrive className="w-8 h-8" />
                    Storage Management
                </h1>
                {serverName ? (
                    <p className="text-muted-foreground">
                        Showing storage for server: <span className="font-semibold text-foreground">{serverName}</span>
                    </p>
                ) : (
                    <p className="text-muted-foreground">
                        No server selected. Please select a server to view its storage.
                    </p>
                )}
            </div>

            {!serverId ? (
                <Card className="text-center p-8">
                    <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Server Selected</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Please go to the servers page and select a server to manage.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href="/servers">Go to Servers</Link>
                    </Button>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Disk Usage</CardTitle>
                        <CardDescription>
                            Monitor and manage your disk space on {serverName}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {storageItems.map((item) => (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">{item.size} / 100 GB</span>
                                    </div>
                                    <Progress value={item.usage} />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
