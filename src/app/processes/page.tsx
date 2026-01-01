
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoreHorizontal, Cpu, User, FileCode, Server as ServerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cookies } from "next/headers";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const processes = [
  { pid: "3451", name: "nginx: worker process", user: "www-data", cpu: "0.5%", memory: "50.2 MB" },
  { pid: "3452", name: "/usr/bin/node /app/server.js", user: "node", cpu: "12.3%", memory: "256.8 MB" },
  { pid: "3453", name: "redis-server 127.0.0.1:6379", user: "redis", cpu: "1.2%", memory: "102.4 MB" },
  { pid: "3454", name: "postgres: 15/main", user: "postgres", cpu: "5.7%", memory: "512.0 MB" },
  { pid: "3455", name: "sidekiq 6.5.7 web [0 of 5 busy]", user: "app", cpu: "2.1%", memory: "128.5 MB" },
];

export default function ProcessesPage() {
  const cookieStore = cookies();
  const serverId = cookieStore.get('selected_server')?.value;
  const serverName = cookieStore.get('selected_server_name')?.value;
  
  return (
    <div className="grid gap-6">
       <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
              <FileCode className="w-8 h-8" />
              Processes
          </h1>
          {serverName ? (
              <p className="text-muted-foreground">
              Showing running processes for server: <span className="font-semibold text-foreground">{serverName}</span>
              </p>
          ) : (
              <p className="text-muted-foreground">
              No server selected. Please select a server to view its processes.
              </p>
          )}
      </div>

       {!serverId ? (
            <Card className="text-center p-8">
                <ServerIcon className="mx-auto h-12 w-12 text-muted-foreground" />
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
              <CardTitle className="font-headline">Running Processes</CardTitle>
              <CardDescription>
                A list of currently active processes on the server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-my-4 divide-y divide-border">
                  {processes.map((process) => (
                    <li key={process.pid} className="flex items-center justify-between gap-4 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate font-mono">
                          {process.name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{process.user}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                             <span>{process.cpu} CPU</span>
                          </div>
                          <div className="flex items-center gap-1">
                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M2 18h20M2 6h20"/></svg>
                             <span>{process.memory} RAM</span>
                          </div>
                        </div>
                      </div>
                       <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md">{process.pid}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">Kill Process</DropdownMenuItem>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                       </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
