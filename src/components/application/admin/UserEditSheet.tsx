"use client";

import { useState, useTransition } from "react";
import type { UserListItem } from "@/lib/users/roles";
import { updateUserDetails } from "@/lib/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";

export function UserEditSheet({
    user,
    open,
    onOpenChange,
    onSaved,
}: {
    user: UserListItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) {
    const [firstName, setFirstName] = useState(user?.firstName ?? "");
    const [lastName, setLastName] = useState(user?.lastName ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [pending, startTransition] = useTransition();

    const submit = () => {
        if (!user) return;
        startTransition(async () => {
            const result = await updateUserDetails({
                userId: user.id,
                firstName,
                lastName,
                email,
            });
            if (!result.success) {
                toast.error(result.error ?? "Failed to update user");
                return;
            }

            toast.success("User details updated");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader className="border-b px-6 py-5">
                    <SheetTitle>Edit user</SheetTitle>
                    <SheetDescription>
                        Correct the user&apos;s name or login email. Their role is managed from the user list.
                    </SheetDescription>
                </SheetHeader>

                {user ? (
                    <form
                        className="space-y-5 px-6 pb-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit();
                        }}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="edit-user-first-name">First name</Label>
                            <Input
                                id="edit-user-first-name"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                maxLength={100}
                                autoComplete="given-name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-user-last-name">Last name</Label>
                            <Input
                                id="edit-user-last-name"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                maxLength={100}
                                autoComplete="family-name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-user-email">Email</Label>
                            <Input
                                id="edit-user-email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                maxLength={255}
                                autoComplete="email"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                The updated address will be used the next time this user signs in.
                            </p>
                        </div>

                        <SheetFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={pending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={pending}>
                                {pending ? <Spinner className="mr-2 size-4 animate-spin" /> : null}
                                {pending ? "Saving..." : "Save changes"}
                            </Button>
                        </SheetFooter>
                    </form>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
