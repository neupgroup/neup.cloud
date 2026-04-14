// Moved from /app/(main)/server/applications/[id]/lifecycle-section.tsx
'use client';

import { executeApplicationCommand } from "@/app/(main)/server/applications/actions";
import { Card } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { Check, Hammer, Loader2, Play, PlayCircle, RefreshCw, StopCircle, Terminal, Download } from "lucide-react";
import { useState } from "react";
import * as LucideIcons from "lucide-react";

interface LifecycleSectionProps {
    application: any;
}

export function LifecycleSection({ application }: LifecycleSectionProps) {
    // ...existing code from lifecycle-section.tsx...
}
