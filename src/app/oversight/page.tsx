import { redirect } from "next/navigation";
import { OversightHub } from "@/components/oversight/OversightHub";
import { getOversightDashboardSummary } from "@/lib/actions/oversight-dashboard";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function OversightDashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "oversight" && user.role !== "admin" && user.role !== "redo") {
    redirect("/");
  }

  const summaryResult = await getOversightDashboardSummary();
  const summary = summaryResult.data ?? {
    pendingApprovals: 0,
    urgentApprovals: 0,
    preScreeningNotScreened: 0,
    preScreeningMyDrafts: 0,
    a2fDdAwaiting: 0,
    cdpReadyToFinalize: 0,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!summaryResult.success && (
        <p className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {summaryResult.error ?? "Some dashboard counts could not be loaded"}
        </p>
      )}
      <OversightHub
        user={{
          firstName:
            "firstName" in user && typeof user.firstName === "string"
              ? user.firstName
              : user.name?.split(" ")[0] ?? null,
          role: user.role,
        }}
        summary={summary}
      />
    </div>
  );
}
