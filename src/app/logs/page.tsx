import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Logs, Neup.Cloud',
};

const logEntries = [
  { level: "INFO", message: "Server started successfully on port 3000.", timestamp: "2024-07-22 10:00:00" },
  { level: "INFO", message: "GET /dashboard 200 OK", timestamp: "2024-07-22 10:01:15" },
  { level: "WARN", message: "Database connection is running slow.", timestamp: "2024-07-22 10:05:30" },
  { level: "ERROR", message: "Failed to process payment for user: 123", timestamp: "2024-07-22 10:10:02" },
  { level: "INFO", message: "POST /api/vps 201 Created", timestamp: "2024-07-22 10:12:45" },
  { level: "DEBUG", message: "User session checked for user: 456", timestamp: "2024-07-22 10:15:00" },
  { level: "FATAL", message: "Critical error in main application loop.", timestamp: "2024-07-22 10:20:00" },
];

export default function LogsPage() {
  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'INFO': return 'secondary';
      case 'WARN': return 'default';
      case 'ERROR': return 'destructive';
      case 'FATAL': return 'destructive';
      case 'DEBUG': return 'outline';
      default: return 'secondary';
    }
  }

  const getBadgeClass = (level: string) => {
     switch (level) {
      case 'WARN': return 'bg-yellow-500/20 text-yellow-700 border-yellow-400 hover:bg-yellow-500/30';
      default: return '';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Application Logs</CardTitle>
        <CardDescription>
          Real-time logs from your running applications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full rounded-md border p-4 bg-muted/20 font-mono text-sm">
          {logEntries.map((log, index) => (
            <div key={index} className="flex items-start gap-4 mb-2">
              <span className="text-muted-foreground">{log.timestamp}</span>
              <Badge variant={getBadgeVariant(log.level)} className={getBadgeClass(log.level)}>{log.level}</Badge>
              <span>{log.message}</span>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
