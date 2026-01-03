
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
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const dnsRecords = [
  { type: "A", name: "@", value: "76.76.21.21", ttl: "3600" },
  { type: "A", name: "www", value: "76.76.21.21", ttl: "3600" },
  { type: "MX", name: "@", value: "mx.example.com", ttl: "3600" },
  { type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none;", ttl: "3600" },
];

export default function DnsPage({ params }: { params: { id: string } }) {
  const domainName = "example.com"; // In a real app, you'd fetch this using params.id

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">DNS Records</CardTitle>
                <CardDescription>
                    Manage the DNS records for <span className="font-semibold text-foreground">{domainName}</span>.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Record
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>TTL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dnsRecords.map((record, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Badge variant="secondary">{record.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{record.name}</TableCell>
                <TableCell className="font-mono text-sm">{record.value}</TableCell>
                <TableCell>{record.ttl}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
