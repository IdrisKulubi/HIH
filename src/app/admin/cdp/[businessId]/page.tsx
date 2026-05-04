import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/db/drizzle";
import { businesses, cnaDiagnostics } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCdpPlanFull, getLatestFinalizedCnaForCdp, listCdpPlansForBusiness } from "@/lib/actions/cdp";
import { CdpWorkspace } from "@/components/admin/cdp/CdpWorkspace";

export default async function AdminCdpBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ planId?: string }>;
}) {
  const { businessId: idStr } = await params;
  const { planId: planIdStr } = await searchParams;
  const businessId = Number(idStr);
  if (!Number.isFinite(businessId)) notFound();

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    with: { applicant: true },
  });
  if (!business) notFound();

  const plansRes = await listCdpPlansForBusiness(businessId);
  const plans = plansRes.success && plansRes.data ? plansRes.data : [];

  const requestedPlanId = planIdStr ? Number(planIdStr) : NaN;
  const defaultPlanId = plans[0]?.id;
  const planId =
    Number.isFinite(requestedPlanId) && plans.some((p) => p.id === requestedPlanId)
      ? requestedPlanId
      : defaultPlanId;

  const planFullRes = planId != null ? await getCdpPlanFull(planId) : null;
  const initialPlan =
    planFullRes?.success && planFullRes.data ? planFullRes.data : null;

  const latestCna = await db.query.cnaDiagnostics.findFirst({
    where: eq(cnaDiagnostics.businessId, businessId),
    orderBy: [desc(cnaDiagnostics.conductedAt)],
    columns: { id: true },
  });
  const latestFinalizedCnaRes = await getLatestFinalizedCnaForCdp(businessId);
  const latestFinalizedCna =
    latestFinalizedCnaRes.success && latestFinalizedCnaRes.data
      ? latestFinalizedCnaRes.data
      : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Link href="/admin/cdp" className="text-sm text-sky-700 hover:underline">
            ← All businesses
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2">{business.name}</h1>
          <p className="text-sm text-muted-foreground">
            {business.applicant.firstName} {business.applicant.lastName} · {business.applicant.email}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <Link href={`/admin/cna/${businessId}`} className="text-sky-700 hover:underline">
              CNA (A–L survey)
            </Link>
          </p>
        </div>
      </div>

      <CdpWorkspace
        key={planId ?? "no-plan"}
        businessId={businessId}
        businessName={business.name}
        plans={plans}
        initialPlan={initialPlan}
        hasCnaForImport={!!latestCna}
        latestFinalizedCna={latestFinalizedCna}
      />
    </div>
  );
}
