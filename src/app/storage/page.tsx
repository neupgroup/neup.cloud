import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Folder, File, Database } from "lucide-react";

const storageItems = [
    { name: "System Files", size: "25 GB", usage: 50, icon: <HardDrive className="h-5 w-5 text-muted-foreground" /> },
    { name: "Application Data", size: "40 GB", usage: 80, icon: <Folder className="h-5 w-5 text-muted-foreground" /> },
    { name: "User Uploads", size: "15 GB", usage: 30, icon: <File className="h-5 w-5 text-muted-foreground" /> },
    { name: "Database", size: "20 GB", usage: 40, icon: <Database className="h-5 w-5 text-muted-foreground" /> },
]

export default function StoragePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Storage Management</CardTitle>
        <CardDescription>
          Monitor and manage your disk space.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            {storageItems.map((item) => (
                <div key={item.name}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            {item.icon}
                            <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.size} / 100 GB</span>
                    </div>
                    <Progress value={item.usage} />
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}