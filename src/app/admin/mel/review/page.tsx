import Link from "next/link";
import { CheckCircle, Files, Lightbulb } from "@phosphor-icons/react/dist/ssr";
import { getMelReviewQueue } from "@/lib/actions/mel-review";
import { ReviewQueueTable } from "@/components/mel/review/ReviewQueueTable";
import { Button } from "@/components/ui/button";

export default async function MelReviewQueuePage() {
  const result = await getMelReviewQueue();
  if (!result.success || !result.data) {
    return <div className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error ?? "Unable to load review queue"}</div>;
  }
  const { rows, periods, reviewer } = result.data;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">MEL · Phase 3</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Report review queue</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {reviewer.role === "redo" ? "Validate EDO reports before they move to MEL." : reviewer.role === "mel" ? "Complete final quality assurance and approve trusted reports." : "Review REDO and MEL workflow stages."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/mel/evidence"><Files className="mr-2 size-4" />Evidence repository</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/mel/learning"><Lightbulb className="mr-2 size-4" />Learning actions</Link></Button>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-brand-blue/15 bg-brand-blue/5 px-4 py-3 text-sm text-slate-700">
        <CheckCircle className="size-5 shrink-0 text-brand-blue" weight="duotone" />
        <span><strong>{rows.length}</strong> report{rows.length === 1 ? "" : "s"} currently require your review stage.</span>
      </div>
      <ReviewQueueTable rows={rows} periods={periods} />
    </div>
  );
}
