import { PageTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Users } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Users | Firewall | Neup.Cloud',
};

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <PageTitle
                title={
                    <span className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Instance Users
                    </span>
                }
                description="Manage system accounts and user access for this instance."
            />

            <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4 lg:col-span-3 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Account</CardTitle>
                            <CardDescription>Add a new user to the system.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" placeholder="jdoe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" placeholder="••••••••" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="groups">Groups (optional)</Label>
                                <Input id="groups" placeholder="sudo, docker" />
                            </div>
                            <Button className="w-full">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create User
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-8 lg:col-span-9">
                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Users</CardTitle>
                            <CardDescription>List of all users currently configured on this instance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Groups</TableHead>
                                        <TableHead>Shell</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">root</TableCell>
                                        <TableCell>root</TableCell>
                                        <TableCell>/bin/bash</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" disabled>System</Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">neup_admin</TableCell>
                                        <TableCell>sudo, docker</TableCell>
                                        <TableCell>/bin/bash</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="destructive" size="sm">Remove</Button>
                                        </TableCell>
                                    </TableRow>
                                    {/* Mock data for now */}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
