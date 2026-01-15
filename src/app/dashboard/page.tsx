
"use client";


"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Cpu, Database, Gauge, Server, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getStatus } from "@/app/status/actions";
import Cookies from 'universal-cookie';
import { format } from 'date-fns';

// bandwidthData removed


const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {payload[0].name}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].value.toFixed(1)}{unit}
            </span>
            <span className="text-[0.65rem] text-muted-foreground mt-1">
              {label}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const BandwidthTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold mb-1">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Egress
            </span>
            <span className="font-bold" style={{ color: payload[0].fill }}>{payload[0].value} MB</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Ingress
            </span>
            <span className="font-bold" style={{ color: payload[1].fill }}>{payload[1].value} MB</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();

  const [cpuData, setCpuData] = useState<{ time: string; usage: number }[]>([]);
  const [ramData, setRamData] = useState<{ time: string; usage: number }[]>([]);
  const [networkData, setNetworkData] = useState<{ time: string; ingress: number; egress: number }[]>([]);
  const [avgCpu, setAvgCpu] = useState(0);
  const [avgRam, setAvgRam] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serverId, setServerId] = useState<string | null>(null);

  useEffect(() => {
    const cookies = new Cookies(null, { path: '/' });
    const id = cookies.get('selected_server');
    setServerId(id);

    if (id) {
      fetchStats(id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchStats = async (id: string) => {
    try {
      const { data, error } = await getStatus(id);
      if (data) {
        // Process CPU Data
        if (data.cpuHistory.length > 0) {
          const processedCpu = data.cpuHistory.map(item => ({
            time: format(new Date(item.timestamp), "HH:mm"),
            usage: item.usage
          }));
          setCpuData(processedCpu);

          // Calculate Average CPU
          const totalCpu = data.cpuHistory.reduce((acc, curr) => acc + curr.usage, 0);
          setAvgCpu(totalCpu / data.cpuHistory.length);
        }

        // Process RAM Data
        if (data.ramHistory.length > 0) {
          const processedRam = data.ramHistory.map(item => ({
            time: format(new Date(item.timestamp), "HH:mm"),
            usage: (item.used / item.total) * 100
          }));
          setRamData(processedRam);

          // Calculate Average RAM
          const totalRamUsage = processedRam.reduce((acc, curr) => acc + curr.usage, 0);
          setAvgRam(totalRamUsage / processedRam.length);
        }

        // Process Network Data
        if (data.networkHistory && data.networkHistory.length > 0) {
          const processedNet = data.networkHistory.map(item => ({
            time: format(new Date(item.timestamp), "HH:mm"),
            ingress: item.incoming,
            egress: item.outgoing
          }));
          setNetworkData(processedNet);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">



      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servers Online</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 / 1</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverId ? `${avgCpu.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Last hour average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. RAM Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverId ? `${avgRam.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Last hour average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth Usage</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2 TB</div>
            <p className="text-xs text-muted-foreground">
              70% of monthly quota
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              An overview of recent deployments and server events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Deployment: frontend-prod</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Git push by @jane.doe
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-500 border-green-500">Successful</Badge>
                  </TableCell>
                  <TableCell className="text-right">5 min ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Server Restart: db-cluster-1</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Manual restart initiated
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Completed</Badge>
                  </TableCell>
                  <TableCell className="text-right">1 hour ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Deployment: api-gateway</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Git push by @john.smith
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Failed</Badge>
                  </TableCell>
                  <TableCell className="text-right">3 hours ago</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bandwidth Usage</CardTitle>
            <CardDescription>Real-time ingress and egress traffic (last hour).</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[200px]">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : serverId ? (
                networkData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={networkData} margin={{ top: 5, right: 20, left: -20, bottom: 0, }}>
                      <defs>
                        <linearGradient id="colorEgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorIngress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip content={<BandwidthTooltip />} />
                      <Area type="monotone" dataKey="egress" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorEgress)" />
                      <Area type="monotone" dataKey="ingress" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorIngress)" />
                      <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} MB`} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full text-muted-foreground">
                    <p>No Data Available.</p>
                  </div>
                )
              ) : (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                    <p>No Server Selected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Live CPU Usage</CardTitle>
            <CardDescription>Real-time CPU utilization across all servers.</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : serverId ? (
              cpuData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTooltip unit="%" />} />
                    <Area type="monotone" dataKey="usage" name="CPU Usage" strokeWidth={2} stroke="hsl(var(--primary))" fill="url(#colorCpu)" />
                    <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                  <p>No Data Available. Start monitoring in Server Status.</p>
                </div>
              )
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>No Server Selected</p>
              </div>
            )}

          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live RAM Usage</CardTitle>
            <CardDescription>Real-time memory utilization across all servers.</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : serverId ? (
              ramData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ramData}>
                    <defs>
                      <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTooltip unit="%" />} />
                    <Area type="monotone" dataKey="usage" name="RAM Usage" strokeWidth={2} stroke="hsl(var(--accent))" fill="url(#colorRam)" />
                    <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                  <p>No Data Available. Start monitoring in Server Status.</p>
                </div>
              )
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>No Server Selected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
