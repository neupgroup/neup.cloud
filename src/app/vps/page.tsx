import {
  MoreHorizontal,
  PlusCircle,
  Power,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getServers } from "@/lib/server-data";

export default async function VpsPage() {
  const servers = await getServers();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline">Servers</CardTitle>
            <CardDescription>
              Manage your virtual private servers.
            </CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Create Server
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-headline">Create New Server</DialogTitle>
                <DialogDescription>
                  Configure and launch a new VPS instance.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input id="name" defaultValue="web-server-02" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="os" className="text-right">
                    OS
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an OS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ubuntu">Ubuntu 22.04</SelectItem>
                      <SelectItem value="debian">Debian 11</SelectItem>
                      <SelectItem value="centos">CentOS 9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Plan</Label>
                  <RadioGroup defaultValue="standard" className="col-span-3 flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="basic" id="r1" />
                      <Label htmlFor="r1">Basic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="r2" />
                      <Label htmlFor="r2">Standard</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pro" id="r3" />
                      <Label htmlFor="r3">Pro</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Server</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servers.map((server) => (
              <TableRow key={server.id}>
                <TableCell className="font-medium">{server.name}</TableCell>
                <TableCell>{server.ip}</TableCell>
                <TableCell>{server.os}</TableCell>
                <TableCell>{server.cpu}, {server.ram}, {server.storage}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      server.status === "Running"
                        ? "default"
                        : server.status === "Error"
                        ? "destructive"
                        : "secondary"
                    }
                    className={server.status === "Running" ? "bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30" : ""}
                  >
                    {server.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Power className="mr-2 h-4 w-4" />
                        Restart
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
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