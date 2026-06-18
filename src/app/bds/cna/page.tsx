import { redirect } from "next/navigation";
import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";
import { BdsEdoHub } from "@/components/bds/BdsEdoHub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBdsEdoDashboardSummary } from "@/lib/actions/bds-edo-dashboard";
import { listBusinessesForCnaRole } from "@/lib/actions/role-cna";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function BdsCnaPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const res = await listBusinessesForCnaRole();
  const cnaCandidates = res.success && res.data ? res.data.length : 0;
  const summaryResult = await getBdsEdoDashboardSummary(cnaCandidates);
  const summary = summaryResult.data ?? {
    cnaCandidates,
    preScreeningNotScreened: 0,
    preScreeningMyDrafts: 0,
    a2fDdAwaiting: 0,
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      {!summaryResult.success && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {summaryResult.error ?? "Some dashboard counts could not be loaded"}
        </p>
      )}

      <BdsEdoHub
        user={{
          firstName:
            "firstName" in user && typeof user.firstName === "string"
              ? user.firstName
              : user.name?.split(" ")[0] ?? null,
          role: user.role,
        }}
        summary={summary}
      />

      <section id="cna-reviews" className="scroll-mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          CNA diagnostic reviews
        </h2>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Qualified enterprises
              {res.success && res.data && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({res.data.length} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!res.success || !res.data ? (
              <p className="text-sm text-destructive">{res.error ?? "Failed to load businesses"}</p>
            ) : (
              <AdminCnaBusinessTable rows={res.data} basePath="/bds/cna" actionLabel="Review" />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
