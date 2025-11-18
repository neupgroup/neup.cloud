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
import { ShieldCheck, Server, Database } from "lucide-react";

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
    status: " degraded",
    icon: <ShieldCheck className="h-5 w-5 text-muted-foreground" />,
  },
  {
    name: "Background Worker",
    status: "Stopped",
    icon: <Server className="h-5 w-5 text-muted-foreground" />,
  },
];

export default function StatusPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">System Status</CardTitle>
        <CardDescription>
          An overview of the health of your system services.
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
  );
}