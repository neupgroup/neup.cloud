'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createApplication } from './actions';
import { Loader2, Plus, X } from 'lucide-react';

interface ApplicationFormProps {
    userId: string;
}

export function ApplicationForm({ userId }: ApplicationFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [language, setLanguage] = useState('');
    const [repository, setRepository] = useState('');
    const [networkAccess, setNetworkAccess] = useState<string[]>([]);
    const [newPort, setNewPort] = useState('');
    const [commands, setCommands] = useState<Record<string, string>>({});
    const [newCommandName, setNewCommandName] = useState('');
    const [newCommandValue, setNewCommandValue] = useState('');
    const [informationJson, setInformationJson] = useState('{}');

    const handleAddPort = () => {
        if (newPort && !networkAccess.includes(newPort)) {
            setNetworkAccess([...networkAccess, newPort]);
            setNewPort('');
        }
    };

    const handleRemovePort = (port: string) => {
        setNetworkAccess(networkAccess.filter(p => p !== port));
    };

    const handleAddCommand = () => {
        if (newCommandName && newCommandValue) {
            setCommands({ ...commands, [newCommandName]: newCommandValue });
            setNewCommandName('');
            setNewCommandValue('');
        }
    };

    const handleRemoveCommand = (key: string) => {
        const newCommands = { ...commands };
        delete newCommands[key];
        setCommands(newCommands);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Parse information JSON
            let information: Record<string, any> = {};
            try {
                information = JSON.parse(informationJson);
            } catch (err) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid JSON',
                    description: 'The information field contains invalid JSON.',
                });
                setIsLoading(false);
                return;
            }

            const appId = await createApplication({
                name,
                location,
                language,
                repository: repository || undefined,
                networkAccess: networkAccess.length > 0 ? networkAccess : undefined,
                commands: Object.keys(commands).length > 0 ? commands : undefined,
                information: Object.keys(information).length > 0 ? information : undefined,
                owner: userId,
            });

            toast({
                title: 'Application created',
                description: `${name} has been created successfully.`,
            });

            router.push('/applications');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to create application.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter the basic details of your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Application Name *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Application"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">Location *</Label>
                        <Input
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="/var/www/myapp"
                            required
                        />
                        <p className="text-sm text-muted-foreground">
                            The directory path where the application is located on the server
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="language">Language/Framework *</Label>
                        <Input
                            id="language"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            placeholder="Node.js, Python, React, etc."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="repository">Repository (Optional)</Label>
                        <Input
                            id="repository"
                            value={repository}
                            onChange={(e) => setRepository(e.target.value)}
                            placeholder="https://github.com/username/repo"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Network Access</CardTitle>
                    <CardDescription>Define which ports this application uses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={newPort}
                            onChange={(e) => setNewPort(e.target.value)}
                            placeholder="8080 or 3000:80"
                        />
                        <Button type="button" onClick={handleAddPort} variant="outline">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {networkAccess.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {networkAccess.map((port) => (
                                <div
                                    key={port}
                                    className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md"
                                >
                                    <span className="text-sm">{port}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePort(port)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Commands</CardTitle>
                    <CardDescription>Define commands to manage your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            value={newCommandName}
                            onChange={(e) => setNewCommandName(e.target.value)}
                            placeholder="Command name (e.g., start)"
                        />
                        <div className="flex gap-2">
                            <Input
                                value={newCommandValue}
                                onChange={(e) => setNewCommandValue(e.target.value)}
                                placeholder="Command value (e.g., npm start)"
                            />
                            <Button type="button" onClick={handleAddCommand} variant="outline">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    {Object.keys(commands).length > 0 && (
                        <div className="space-y-2">
                            {Object.entries(commands).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between bg-secondary px-3 py-2 rounded-md"
                                >
                                    <div className="flex-1">
                                        <span className="font-medium text-sm">{key}:</span>{' '}
                                        <span className="text-sm text-muted-foreground">{value}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCommand(key)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                    <CardDescription>Store additional metadata as JSON</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={informationJson}
                        onChange={(e) => setInformationJson(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={6}
                        className="font-mono text-sm"
                    />
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Application
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/applications')}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
