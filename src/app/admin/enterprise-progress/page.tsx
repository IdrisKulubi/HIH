import { EnterpriseProgressTable } from "@/components/admin/enterprise-progress/EnterpriseProgressTable";
import { getEnterpriseProgressRows } from "@/lib/actions/enterprise-progress";

export default async function EnterpriseProgressPage() {
  const result = await getEnterpriseProgressRows();

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{result.error ?? "Failed to load enterprise progress"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Programme oversight</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Enterprise Progress</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Follow each enterprise from application through due diligence, business support, mentorship, and Access to Finance.
        </p>
      </div>
      <EnterpriseProgressTable rows={result.data} />
    </div>
  );
}
