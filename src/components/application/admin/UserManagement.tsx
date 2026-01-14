"use client";

import { useState, useEffect, useCallback } from "react";
import {
    searchUsers,
    createAdminUser,
    updateUserRole,
    type UserListItem
} from "@/lib/actions/admin-users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    MagnifyingGlass,
    UserPlus,
    Shield,
    Spinner,
    User,
    EnvelopeSimple
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ROLES = [
    { value: "applicant", label: "Applicant", color: "bg-gray-100 text-gray-700" },
    { value: "admin", label: "Admin", color: "bg-blue-100 text-blue-700" },
    { value: "technical_reviewer", label: "Technical Reviewer", color: "bg-purple-100 text-purple-700" },
    { value: "reviewer_1", label: "Reviewer 1", color: "bg-cyan-100 text-cyan-700" },
    { value: "reviewer_2", label: "Reviewer 2", color: "bg-amber-100 text-amber-700" },
];

export function UserManagement() {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // Add user form state
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserFirstName, setNewUserFirstName] = useState("");
    const [newUserLastName, setNewUserLastName] = useState("");
    const [newUserRole, setNewUserRole] = useState<"admin" | "technical_reviewer" | "reviewer_1" | "reviewer_2">("admin");

    // Debounced search function
    const performSearch = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            const result = await searchUsers(query);
            if (result.success && result.data) {
                setUsers(result.data);
            } else {
                toast.error(result.error || "Failed to search users");
            }
        } catch {
            toast.error("An error occurred while searching");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load and search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    // Handle role change
    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingUserId(userId);
        try {
            const result = await updateUserRole(
                userId,
                newRole as "applicant" | "admin" | "technical_reviewer"
            );
            if (result.success) {
                toast.success("Role updated successfully");
                // Update local state
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
                );
            } else {
                toast.error(result.error || "Failed to update role");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setUpdatingUserId(null);
        }
    };

    // Handle add user
    const handleAddUser = async () => {
        if (!newUserEmail || !newUserFirstName || !newUserLastName) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsCreating(true);
        try {
            const result = await createAdminUser(
                newUserEmail,
                newUserFirstName,
                newUserLastName,
                newUserRole
            );
            if (result.success) {
                toast.success("User created successfully with password: BIRE@2025");
                setIsAddDialogOpen(false);
                setNewUserEmail("");
                setNewUserFirstName("");
                setNewUserLastName("");
                setNewUserRole("admin");
                // Refresh user list
                performSearch(searchQuery);
            } else {
                toast.error(result.error || "Failed to create user");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsCreating(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const roleConfig = ROLES.find((r) => r.value === role) || ROLES[0];
        return (
            <Badge className={cn("font-medium", roleConfig.color)}>
                {roleConfig.label}
            </Badge>
        );
    };

    return (
        <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-blue-600" weight="duotone" />
                            User Management
                        </CardTitle>
                        <CardDescription>
                            Search users, add new admins, and manage roles
                        </CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>
                                    Create a new user with admin or reviewer access. Default password: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">BIRE@2025</code>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={newUserFirstName}
                                        onChange={(e) => setNewUserFirstName(e.target.value)}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={newUserLastName}
                                        onChange={(e) => setNewUserLastName(e.target.value)}
                                        placeholder="Doe"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={newUserRole}
                                        onValueChange={(value) =>
                                            setNewUserRole(value as "admin" | "technical_reviewer" | "reviewer_1" | "reviewer_2")
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="technical_reviewer">
                                                Technical Reviewer
                                            </SelectItem>
                                            <SelectItem value="reviewer_1">
                                                Reviewer 1
                                            </SelectItem>
                                            <SelectItem value="reviewer_2">
                                                Reviewer 2
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleAddUser} disabled={isCreating}>
                                    {isCreating && (
                                        <Spinner className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Users List */}
                <div className="rounded-lg border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Spinner className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No users found
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {user.firstName} {user.lastName}
                                            </p>
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <EnvelopeSimple className="h-3.5 w-3.5" />
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getRoleBadge(user.role)}
                                        <Select
                                            value={user.role}
                                            onValueChange={(value) => handleRoleChange(user.id, value)}
                                            disabled={updatingUserId === user.id}
                                        >
                                            <SelectTrigger className="w-[160px] h-9">
                                                {updatingUserId === user.id ? (
                                                    <Spinner className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <SelectValue placeholder="Change role" />
                                                )}
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map((role) => (
                                                    <SelectItem key={role.value} value={role.value}>
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Results count */}
                {!isLoading && users.length > 0 && (
                    <p className="text-sm text-gray-500 text-center">
                        Showing {users.length} user{users.length !== 1 ? "s" : ""}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
