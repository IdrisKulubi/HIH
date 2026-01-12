import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { UserManagement } from "@/components/application/admin/UserManagement";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default async function UsersPage() {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10"
                        asChild
                    >
                        <Link href="/admin">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                            User Management
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Add new admins and manage user roles
                        </p>
                    </div>
                </div>

                {/* User Management Component */}
                <UserManagement />
            </div>
        </div>
    );
}
