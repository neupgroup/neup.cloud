import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 text-foreground", className)}>
      <Cloud className="h-6 w-6 text-primary" />
      <span className="font-headline text-lg font-bold">Neup.Cloud</span>
    </Link>
  );
}
