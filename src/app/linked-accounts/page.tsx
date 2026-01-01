
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link2 } from "lucide-react";

export default function LinkedAccountsPage() {
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Link2 className="w-8 h-8" />
            Linked Accounts
        </h1>
        <p className="text-muted-foreground">Manage your connected third-party accounts.</p>
      </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Connect Accounts</CardTitle>
            <CardDescription>
                Link your accounts from other providers to import servers and streamline management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Account linking functionality will be available here.</p>
          </CardContent>
           <CardFooter>
            <Button>Link New Account</Button>
          </CardFooter>
        </Card>
    </div>
  );
}
