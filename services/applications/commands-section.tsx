import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Terminal } from "lucide-react";

export interface CommandsSectionProps {
    application: any;
}

export function getCommandDescription(name: string, command: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName === 'start' || lowerName === 'lifecycle.start') {
        return 'Start the application and make it available';
    }
    if (lowerName === 'stop' || lowerName === 'lifecycle.stop') {
        return 'Stop the running application process';
    }
    if (lowerName === 'restart' || lowerName === 'lifecycle.restart') {
        return 'Restart the application with the latest changes';
    }
    if (lowerName === 'build' || lowerName === 'lifecycle.build') {
        return 'Build the application for production deployment';
    }
    if (lowerName === 'dev' || lowerName === 'lifecycle.dev') {
        return 'Start the application in development mode with live reload';
    }
    if (lowerName === 'install' || lowerName === 'lifecycle.install') {
        return 'Install all required dependencies for the application';
    }
    if (command.includes('pm2')) {
        return 'Process manager command for the application';
    }
    if (command.includes('npm') || command.includes('yarn')) {
        return 'Package manager command for dependencies';
    }
    if (command.includes('git')) {
        return 'Git version control command';
    }
    return 'Custom command for application management';
}

export function CommandsSection({ application }: CommandsSectionProps) {
    if (!application.commands || Object.keys(application.commands).length === 0) {
        return null;
    }
    // ...existing UI code...
}
