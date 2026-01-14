"use client";

import { useState, useActionState, useEffect } from "react";
import { updateReviewerPassword } from "@/lib/actions/password.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Check, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PasswordChangeForm() {
    const [state, action, isPending] = useActionState(updateReviewerPassword, null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [newPassword, setNewPassword] = useState("");

    const requirements = [
        { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
        { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
        { label: "Contains lowercase letter", test: (p: string) => /[a-z]/.test(p) },
        { label: "Contains a number", test: (p: string) => /\d/.test(p) },
        { label: "Contains special character (@$!%*?&)", test: (p: string) => /[@$!%*?&]/.test(p) },
    ];

    const strength = requirements.filter(r => r.test(newPassword)).length;
    const strengthColor = strength <= 2 ? "bg-red-500" : strength <= 4 ? "bg-amber-500" : "bg-green-500";
    const strengthText = strength <= 2 ? "Weak" : strength <= 4 ? "Medium" : "Strong";

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message);
            // reset form or redirect if needed
            const form = document.getElementById("password-form") as HTMLFormElement;
            form.reset();
            setNewPassword("");
        } else if (state?.success === false) {
            toast.error(state.message);
        }
    }, [state]);

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Security Settings
                </CardTitle>
                <CardDescription>
                    Change your password to keep your reviewer account secure.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form id="password-form" action={action} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type={showCurrent ? "text" : "password"}
                                className="pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type={showNew ? "text" : "password"}
                                    className="pr-10"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Strength Indicator */}
                        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <span>Password Strength</span>
                                <span className={strength <= 2 ? "text-red-500" : strength <= 4 ? "text-amber-500" : "text-green-600"}>
                                    {strengthText}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                    <div
                                        key={lvl}
                                        className={`h-full flex-1 transition-all duration-500 ${lvl <= strength ? strengthColor : "bg-transparent"}`}
                                    />
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {requirements.map((req, i) => {
                                    const met = req.test(newPassword);
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            {met ? (
                                                <Check className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <X className="h-3 w-3 text-slate-300" />
                                            )}
                                            <span className={met ? "text-slate-700 font-medium" : "text-slate-400"}>
                                                {req.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isPending || strength < 5}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-bold shadow-lg shadow-blue-200 disabled:opacity-50 transition-all"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating Password...
                            </>
                        ) : (
                            "Update Password"
                        )}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="bg-slate-50/30 border-t border-slate-100 p-4">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3" />
                    We recommend using a unique password that you don&apos;t use for other site.
                </p>
            </CardFooter>
        </Card>
    );
}
