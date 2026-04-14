import { cn } from "@/lib/utils";
import { FolderOpen, Network, User, Calendar } from "lucide-react";
import Link from 'next/link';
import React from 'react';

export interface SystemSectionProps {
    application: any;
}

export function useSystemSection(application: any) {
    const uniquePorts = application.networkAccess?.map(String).filter((p: string) => p && p !== "NaN") || [];
    const portsDescription = uniquePorts.length > 0 ? uniquePorts.join(', ') : "No ports exposed";
    const createdDate = application.createdAt ? new Date(application.createdAt).toLocaleString() : 'Unknown';
    const updatedDate = application.updatedAt ? new Date(application.updatedAt).toLocaleString() : 'Unknown';
    return { portsDescription, createdDate, updatedDate };
}
