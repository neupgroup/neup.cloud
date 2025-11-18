import { MoreHorizontal, PlusCircle, Trash2, GitBranch } from "lucide-react";

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
import Link from "next/link";

const apps = [
  {
    name: "frontend-prod",
    repo: "github.com/my-org/storefront",
    status: "Running",
    url: "https://store.neup.cloud",
  },
  {
    name: "api-gateway",
    repo: "github.com/my-org/api",
    status: "Running",
    url: "https://api.neup.cloud",
  },
  {
    name: "docs-website",
    repo: "github.com/my-org/docs",
    status: "Crashed",
    url: "https://docs.neup.cloud",
  },
  {
    name: "background-worker",
    repo: "github.com/my-org/worker",
    status: "Building",
    url: "N/A",
  },
];

export default function AppsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline">Applications</CardTitle>
            <CardDescription>
              Deploy and manage your applications.
            </CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Deploy App
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-headline">Deploy New Application</DialogTitle>
                <DialogDescription>
                  Deploy an application from a Git repository.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="repo" className="text-right">
                    Repository
                  </Label>
                  <Input
                    id="repo"
                    placeholder="https://github.com/user/repo.git"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Deploy</Button>
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
              <TableHead>Repository</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.name}>
                <TableCell className="font-medium">{app.name}</TableCell>
                <TableCell>{app.repo}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      app.status === "Running"
                        ? "default"
                        : app.status === "Crashed"
                        ? "destructive"
                        : "secondary"
                    }
                    className={
                      app.status === "Running"
                        ? "bg-green-500/20 text-green-700 border-green-400 hover:bg-green-500/30"
                        : app.status === "Building"
                        ? "bg-blue-500/20 text-blue-700 border-blue-400 hover:bg-blue-500/30"
                        : ""
                    }
                  >
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {app.url !== "N/A" ? (
                    <Link href={app.url} className="underline" target="_blank">
                      {app.url}
                    </Link>
                  ) : (
                    "N/A"
                  )}
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
                        <GitBranch className="mr-2 h-4 w-4" />
                        Redeploy
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