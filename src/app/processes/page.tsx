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
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const processes = [
  { pid: "3451", name: "nginx", cpu: "0.5%", memory: "50.2 MB" },
  { pid: "3452", name: "node /app/server.js", cpu: "12.3%", memory: "256.8 MB" },
  { pid: "3453", name: "redis-server", cpu: "1.2%", memory: "102.4 MB" },
  { pid: "3454", name: "postgres", cpu: "5.7%", memory: "512.0 MB" },
  { pid: "3455", name: "sidekiq", cpu: "2.1%", memory: "128.5 MB" },
];

export default function ProcessesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Running Processes</CardTitle>
        <CardDescription>
          A list of currently active processes on the server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PID</TableHead>
              <TableHead>Process Name</TableHead>
              <TableHead>CPU Usage</TableHead>
              <TableHead>Memory</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processes.map((process) => (
              <TableRow key={process.pid}>
                <TableCell>{process.pid}</TableCell>
                <TableCell className="font-medium">{process.name}</TableCell>
                <TableCell>{process.cpu}</TableCell>
                <TableCell>{process.memory}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Kill Process</DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}