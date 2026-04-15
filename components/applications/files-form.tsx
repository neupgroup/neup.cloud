import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Application } from "@/services/applications/_types";
import { updateApplication } from "@/services/applications/applications-service";

export interface FilesFormProps {
    application: Application;
}

export function useFilesForm(application: Application) {
    const router = useRouter();
    const [files, setFiles] = useState<Record<string, string>>(application.files || {});
    const [isSaving, setIsSaving] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentFile, setCurrentFile] = useState<{ path: string; content: string } | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [isNewFile, setIsNewFile] = useState(false);

    const handleSaveFile = () => {
        if (!currentFile || !currentFile.path.trim()) return;
        const updatedFiles = { ...files };
        updatedFiles[currentFile.path] = currentFile.content;
        setFiles(updatedFiles);
        setIsEditDialogOpen(false);
        saveToBackend(updatedFiles);
    };

    const handleDeleteFile = () => {
        if (!fileToDelete) return;
        const updatedFiles = { ...files };
        delete updatedFiles[fileToDelete];
        setFiles(updatedFiles);
        setIsDeleteAlertOpen(false);
        saveToBackend(updatedFiles);
    };

    const saveToBackend = async (newFiles: Record<string, string>) => {
        setIsSaving(true);
        try {
            await updateApplication(application.id, { files: newFiles });
            toast.success("Files updated successfully");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update files");
        } finally {
            setIsSaving(false);
        }
    };

    const openNewFileDialog = () => {
        setCurrentFile({ path: "", content: "" });
        setIsNewFile(true);
        setIsEditDialogOpen(true);
    };

    const openEditDialog = (path: string, content: string) => {
        setCurrentFile({ path, content });
        setIsNewFile(false);
        setIsEditDialogOpen(true);
    };

    const openDeleteAlert = (path: string) => {
        setFileToDelete(path);
        setIsDeleteAlertOpen(true);
    };

    return {
        files,
        setFiles,
        isSaving,
        setIsSaving,
        isEditDialogOpen,
        setIsEditDialogOpen,
        currentFile,
        setCurrentFile,
        isDeleteAlertOpen,
        setIsDeleteAlertOpen,
        fileToDelete,
        setFileToDelete,
        isNewFile,
        setIsNewFile,
        handleSaveFile,
        handleDeleteFile,
        openNewFileDialog,
        openEditDialog,
        openDeleteAlert,
    };
}
