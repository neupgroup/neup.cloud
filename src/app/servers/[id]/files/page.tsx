
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { File } from "lucide-react";

export default function ServerFilesPage({ params }: { params: { id: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <File className="h-6 w-6" />
            File Browser
        </CardTitle>
        <CardDescription>
          Browse and manage files on server {params.id}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>A file browser will be available here.</p>
      </CardContent>
    </Card>
  );
}
