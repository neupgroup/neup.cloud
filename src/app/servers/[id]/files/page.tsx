
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Folder as FolderIcon, File as FileIcon, FileSymlink, Home, UploadCloud, FolderUp, Loader2 } from 'lucide-react';
import { browseDirectory, uploadFile, type FileOrFolder } from '../actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
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

function ServerFilesBrowser({ serverId }: { serverId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [files, setFiles] = useState<FileOrFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const currentPath = searchParams.get('filesPath') || '/';

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
 
      return params.toString()
    },
    [searchParams]
  )

  const fetchFiles = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const { files: fetchedFiles, error } = await browseDirectory(serverId, path);
      if (error) {
        toast({ variant: "destructive", title: "Failed to browse directory", description: error });
        setFiles([]);
      } else {
        const sortedFiles = fetchedFiles.sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });
        setFiles(sortedFiles);
      }
    } catch (e: any) {
       toast({ variant: "destructive", title: "An unexpected error occurred", description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [serverId, toast]);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
        const result = await uploadFile(serverId, currentPath, formData);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
        } else {
            toast({ title: 'Upload Successful', description: `File "${selectedFile.name}" has been uploaded.` });
            await fetchFiles(currentPath);
        }
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Upload Error', description: e.message });
    } finally {
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  }
  
  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;
      setIsUploading(true);
      toast({ title: 'Folder Upload Started', description: `Starting to upload ${selectedFiles.length} files.` });
      let successCount = 0;
      let errorCount = 0;
      for (const file of Array.from(selectedFiles)) {
          const formData = new FormData();
          const remoteFilePath = file.webkitRelativePath ? currentPath + '/' + file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf('/')) : currentPath;
          formData.append('file', file);
          try {
            const result = await uploadFile(serverId, remoteFilePath, formData);
            if (result.error) {
              errorCount++;
              console.error(`Failed to upload ${file.name}: ${result.error}`);
            } else {
              successCount++;
            }
          } catch(e) {
              errorCount++;
               console.error(`Failed to upload ${file.name}: ${e}`);
          }
      }
      toast({ 
        title: 'Folder Upload Complete', 
        description: `${successCount} files uploaded successfully. ${errorCount} files failed.` 
      });
      await fetchFiles(currentPath);
      setIsUploading(false);
      if(folderInputRef.current) folderInputRef.current.value = '';
  }

  const handleItemClick = (item: FileOrFolder) => {
    if (item.type === 'directory') {
      const newPath = `${currentPath.endsWith('/') ? currentPath : currentPath + '/'}${item.name}`;
      router.push(pathname + '?' + createQueryString('filesPath', newPath));
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const pathSegments = currentPath.split('/').filter(Boolean);
    const newPath = '/' + pathSegments.slice(0, index + 1).join('/');
    router.push(pathname + '?' + createQueryString('filesPath', newPath));
  }
  
  const breadcrumbSegments = currentPath.split('/').filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline flex items-center gap-2">
                    <FolderIcon className="h-6 w-6" />
                    File Browser
                </CardTitle>
                <CardDescription>
                Browse and manage files on your server.
                </CardDescription>
            </div>
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <input type="file" ref={folderInputRef} onChange={handleFolderUpload} className="hidden" multiple webkitdirectory="" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
                 <Button onClick={() => folderInputRef.current?.click()} disabled={isUploading} variant="outline">
                    <FolderUp className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Folder'}
                </Button>
            </div>
        </div>
        <Breadcrumb className="pt-4">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <button onClick={() => router.push(pathname + '?' + createQueryString('filesPath', '/'))} className="flex items-center gap-1">
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
        {isLoading || isUploading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 <span className="ml-2">{isUploading ? "Uploading files..." : "Loading..."}</span>
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

export default function ServerFilesPage() {
    const params = useParams();
    const id = params.id as string;
  
    if (!id) return null;
  
    return <ServerFilesBrowser serverId={id} />;
}
