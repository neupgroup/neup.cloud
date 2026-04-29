import { cn } from "@/core/utils";
import { FolderOpen, Network, User, Calendar } from "lucide-react";
import Link from 'next/link';
import React from 'react';

export interface SystemSectionProps {
    application: any;
}

export function useSystemSection(application: any) {
    const uniquePorts = application.networkAccess?.map(String).filter((p: string) => p && p !== "NaN") || [];
    const portsDescription = uniquePorts.length > 0 ? uniquePorts.join(', ') : "No ports exposed";
    const createdDate = application.createdAt ? new Date(application.createdAt).toLocaleString('en-US') : 'Unknown';
    const updatedDate = application.updatedAt ? new Date(application.updatedAt).toLocaleString('en-US') : 'Unknown';
    return { portsDescription, createdDate, updatedDate };
}
