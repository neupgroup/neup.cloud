
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { browseDirectory, type FileOrFolder } from '../actions';
import { useToast } from '@/hooks/use-toast';
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
    File as FileIcon,
    Folder as FolderIcon,
    FileSymlink,
    Loader2,
    Home,
} from "lucide-react";
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


export default function ServerFilesPage() {
  const params = useParams();
  const serverId = params.id as string;
  const { toast } = useToast();

  const [files, setFiles] = useState<FileOrFolder[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const { files: fetchedFiles, error } = await browseDirectory(serverId, path);
      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to browse directory",
          description: error,
        });
        // If error, stay in the current directory
        setFiles([]);
      } else {
        // Sort with directories first
        const sortedFiles = fetchedFiles.sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });
        setFiles(sortedFiles);
        setCurrentPath(path);
      }
    } catch (e: any) {
       toast({
          variant: "destructive",
          title: "An unexpected error occurred",
          description: e.message,
        });
    } finally {
      setIsLoading(false);
    }
  }, [serverId, toast]);

  useEffect(() => {
    fetchFiles('/');
  }, [fetchFiles]);

  const handleItemClick = (item: FileOrFolder) => {
    if (item.type === 'directory') {
      const newPath = `${currentPath.endsWith('/') ? currentPath : currentPath + '/'}${item.name}`;
      fetchFiles(newPath);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const pathSegments = currentPath.split('/').filter(Boolean);
    const newPath = '/' + pathSegments.slice(0, index + 1).join('/');
    fetchFiles(newPath);
  }
  
  const breadcrumbSegments = currentPath.split('/').filter(Boolean);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <FolderIcon className="h-6 w-6" />
            File Browser
        </CardTitle>
        <CardDescription>
          Browse and manage files on your server.
        </CardDescription>
        <Breadcrumb className="pt-2">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <button onClick={() => fetchFiles('/')} className="flex items-center gap-1">
                            <Home className="h-4 w-4" /> Root
                        </button>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbSegments.map((segment, index) => (
                    <React.Fragment key={index}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <button onClick={() => handleBreadcrumbClick(index)}>{segment}</button>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>Permissions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {files.map((item, index) => (
                    <TableRow key={index} onClick={() => handleItemClick(item)} className={item.type === 'directory' ? 'cursor-pointer' : ''}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                {item.type === 'directory' && <FolderIcon className="h-4 w-4 text-primary" />}
                                {item.type === 'file' && <FileIcon className="h-4 w-4 text-muted-foreground" />}
                                {item.type === 'symlink' && <FileSymlink className="h-4 w-4 text-accent" />}
                                <span>{item.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{item.type === 'file' ? formatBytes(item.size) : '-'}</TableCell>
                        <TableCell>{item.lastModified}</TableCell>
                        <TableCell className="font-mono text-xs">{item.permissions}</TableCell>
                    </TableRow>
                    ))}
                    {files.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">This directory is empty.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}
