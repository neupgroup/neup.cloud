import { PageTitleBack } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { getAuthorizedKeys } from "../actions";
import { cookies } from 'next/headers';
import { notFound } from "next/navigation";

export default async function ViewKeyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const keyIndex = parseInt(id, 10);

    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) {
        return <div>No server selected</div>;
    }

    const { keys, error } = await getAuthorizedKeys(serverId);

    if (error || !keys) {
        // Handle error gracefully
        return <div>Error loading key: {error}</div>;
    }

    const key = keys.find(k => k.index === keyIndex);

    if (!key) {
        return notFound();
    }

    return (
        <div className="space-y-6">
            <PageTitleBack
                title={key.comment !== 'No comment' ? key.comment : `Key #${key.index + 1}`}
                description="View details of this authorized key."
                backHref="/firewall/keys"
            >
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Key
                </Button>
            </PageTitleBack>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Key Information</CardTitle>
                        <CardDescription>Metadata about this key.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="font-medium text-muted-foreground">Type</div>
                            <div className="col-span-2 font-mono">{key.type}</div>

                            <div className="font-medium text-muted-foreground">Index</div>
                            <div className="col-span-2 font-mono">{key.index}</div>

                            <div className="font-medium text-muted-foreground">Source</div>
                            <div className="col-span-2 font-mono break-all">{key.source}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Public Key Content</CardTitle>
                        <CardDescription>The actual public key string.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="raw-key" className="sr-only">Raw Key</Label>
                            <Textarea
                                id="raw-key"
                                readOnly
                                value={key.raw}
                                className="font-mono text-xs min-h-[100px] bg-muted/50"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
