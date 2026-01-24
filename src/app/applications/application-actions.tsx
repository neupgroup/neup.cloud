
'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash } from "lucide-react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteApplication } from "./actions";

interface ApplicationActionsProps {
    applicationId: string;
}

export function ApplicationActions({ applicationId }: ApplicationActionsProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteApplication(applicationId);
            toast({
                title: "Application deleted",
                description: "The application has been stopped and removed.",
            });
            router.push('/applications');
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete application.",
            });
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Link href={`/applications/${applicationId}/edit`}>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Edit
                    </span>
                </Button>
            </Link>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-8 gap-1.5">
                        <Trash className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Delete
                        </span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The application will be <strong>closed/stopped</strong> immediately.
                            <br /><br />
                            Note: For security reasons, the underlying files <strong>will not be deleted</strong> from the server automatically. You must manually remove them if desired.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete Application"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
