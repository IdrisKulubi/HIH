import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getAdminA2fDashboardData } from "@/lib/actions/admin-a2f";
import { AdminA2fDashboard } from "@/components/admin/a2f/AdminA2fDashboard";

export default async function AdminA2fPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/");

  const result = await getAdminA2fDashboardData();
  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Access to Finance administration</h1>
        <p className="mt-3 text-sm text-red-600">
          {result.error ?? "The dashboard could not be loaded."}
        </p>
      </div>
    );
  }

  return <AdminA2fDashboard initialData={result.data} />;
}
