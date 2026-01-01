
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Server, Database, Link as LinkIcon, HeartPulse } from "lucide-react";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const services = [
  {
    name: "Web Server",
    status: "Running",
    icon: <Server className="h-5 w-5 text-muted-foreground" />,
  },
  {
    name: "API Gateway",
    status: "Running",
    icon: <Server className="h-5 w-5 text-muted-foreground" />,
  },
  {
    name: "Database",
    status: "Running",
    icon: <Database className="h-5 w-5 text-muted-foreground" />,
  },
  {
    name: "Authentication Service",
    status: "degraded",
    icon: <ShieldCheck className="h-5 w-5 text-muted-foreground" />,
  },
  {
    name: "Background Worker",
    status: "Stopped",
    icon: <Server className="h-5 w-5 text-muted-foreground" />,
  },
];

export default function StatusPage() {
  const cookieStore = cookies();
  const serverId = cookieStore.get('selected_server')?.value;
  const serverName = cookieStore.get('selected_server_name')?.value;

  return (
     <div className="grid gap-6">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                <HeartPulse className="w-8 h-8" />
                System Status
            </h1>
            {serverName ? (
                <p className="text-muted-foreground">
                Showing status for server: <span className="font-semibold text-foreground">{serverName}</span>
                </p>
            ) : (
                <p className="text-muted-foreground">
                No server selected. Please select a server to view its status.
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
                    <CardTitle className="font-headline">Service Health</CardTitle>
                    <CardDescription>
                    An overview of the health of services on {serverName}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.map((service) => (
                        <TableRow key={service.name}>
                            <TableCell>
                            <div className="flex items-center gap-3">
                                {service.icon}
                                <span className="font-medium">{service.name}</span>
                            </div>
                            </TableCell>
                            <TableCell className="text-right">
                            <Badge
                                variant={
                                service.status === "Running"
                                    ? "default"
                                    : service.status === "Stopped"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={
                                service.status === "Running"
                                    ? "bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30"
                                    : service.status === "degraded"
                                    ? "bg-yellow-500/20 text-yellow-700 border-yellow-400 hover:bg-yellow-500/30"
                                    : ""
                                }
                            >
                                {service.status}
                            </Badge>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
     </div>
  );
}
