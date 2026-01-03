
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { CopyButton } from "./copy-button";


const nameservers = [
  "ns1.neup.cloud",
  "ns2.neup.cloud",
  "ns3.neup.cloud",
  "ns4.neup.cloud",
];

export default function NameserversPage({ params }: { params: { id: string } }) {
    const domainName = "example.com"; // In a real app, you'd fetch this using params.id

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Nameservers</CardTitle>
        <CardDescription>
          Update your domain's nameservers to manage it with Neup.Cloud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            To manage your domain <span className="font-semibold text-foreground">{domainName}</span>, please log in to your domain registrar and replace your current nameservers with the following:
          </AlertDescription>
        </Alert>

        <div className="space-y-2 rounded-md border bg-muted p-4">
            <p className="text-sm font-medium">Neup.Cloud Nameservers:</p>
            <ul className="space-y-2">
                {nameservers.map((ns) => (
                    <li key={ns} className="flex items-center justify-between rounded-md bg-background p-3">
                        <code className="font-mono text-sm">{ns}</code>
                        <CopyButton textToCopy={ns} />
                    </li>
                ))}
            </ul>
        </div>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Please Note</AlertTitle>
          <AlertDescription>
            DNS changes can take up to 24-48 hours to propagate throughout the internet. Your domain will show as "pending" until we can verify the nameserver change.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
