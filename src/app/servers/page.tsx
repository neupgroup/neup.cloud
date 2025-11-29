
'use client';

import {
  MoreHorizontal,
  PlusCircle,
  Power,
  Trash2,
} from "lucide-react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore } from "@/firebase";

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
import React from "react";
import { useToast } from "@/hooks/use-toast";

type Server = {
  id: string;
  name: string;
  os: string;
  plan: string;
  provider: string;
  ram: string;
  storage: string;
  ip: string;
  status: 'Running' | 'Starting' | 'Error' | 'Stopped';
};

export default function VpsPage() {
  const firestore = useFirestore();
  const { data: servers, error, isLoading } = useCollection<Server>(collection(firestore, "servers"));
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "servers", id));
      toast({
        title: "Server Deleted",
        description: "The server has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem deleting the server.",
      });
    }
  };

  const handleRestart = async (id: string, currentStatus: string) => {
    if (!firestore) return;
    const newStatus = currentStatus === 'Running' ? 'Stopped' : 'Running';
    try {
      const serverDoc = doc(firestore, "servers", id);
      await updateDoc(serverDoc, { status: newStatus });
      toast({
        title: "Server Status Updated",
        description: `The server is now ${newStatus.toLowerCase()}.`,
      });
    } catch (error) {
      console.error("Error updating document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem updating the server status.",
      });
    }
  };
  
  const handleCreateServer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) return;

    const formData = new FormData(event.currentTarget);
    const serverData = {
        name: formData.get('name') as string,
        os: formData.get('os') as string,
        plan: formData.get('plan') as string,
        provider: formData.get('provider') as string,
        ram: formData.get('ram') as string,
        storage: formData.get('storage') as string,
        ip: "192.168.1.1", // Placeholder
        status: "Running", // Default status
    };

    try {
        await addDoc(collection(firestore, "servers"), serverData);
        toast({
            title: "Server Created",
            description: "Your new server has been provisioned.",
        });
        setIsDialogOpen(false);
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not create the server.",
        });
    }
  };

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Create Server
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleCreateServer}>
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
                    <Input id="name" name="name" defaultValue="web-server-02" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="os" className="text-right">
                      OS
                    </Label>
                    <Select name="os">
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
                    <Label htmlFor="provider" className="text-right">
                      Provider
                    </Label>
                    <Select name="provider">
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                        <SelectItem value="aws">AWS</SelectItem>
                        <SelectItem value="gcp">Google Cloud</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ram" className="text-right">
                      RAM
                    </Label>
                    <Input id="ram" name="ram" defaultValue="8GB" className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="storage" className="text-right">
                      Storage
                    </Label>
                    <Input id="storage" name="storage" defaultValue="160GB" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Plan</Label>
                    <RadioGroup name="plan" defaultValue="standard" className="col-span-3 flex gap-4">
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
              </form>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading servers...</TableCell>
              </TableRow>
            ) : error ? (
               <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">Error loading servers: {error.message}</TableCell>
              </TableRow>
            ) : servers && servers.length > 0 ? (
              servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>{server.ip}</TableCell>
                  <TableCell>{server.os}</TableCell>
                  <TableCell>{server.ram}, {server.storage}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleRestart(server.id, server.status)}>
                          <Power className="mr-2 h-4 w-4" />
                          {server.status === 'Running' ? 'Stop' : 'Start'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(server.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No servers found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
