
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HardDrive } from "lucide-react";

export default function ServerStoragePage({ params }: { params: { id: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <HardDrive className="h-6 w-6" />
            Server Storage
        </CardTitle>
        <CardDescription>
          Manage and view storage for server {params.id}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Storage details and management will be available here.</p>
      </CardContent>
    </Card>
  );
}
