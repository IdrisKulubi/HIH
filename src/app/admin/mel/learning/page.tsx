import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getMelLearningActions } from "@/lib/actions/mel-review";
import { LearningActionsWorkspace } from "@/components/mel/review/LearningActionsWorkspace";

export default async function MelLearningActionsPage() {
  const result = await getMelLearningActions();
  if (!result.success || !result.data) return <div className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</div>;
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <Link href="/admin/mel/review" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-blue"><ArrowLeft className="size-4" weight="bold" />Review queue</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-blue">MEL · Learning</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Learning and adaptation</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Assign findings, follow actions through, and keep adaptation decisions accountable.</p>
      </div>
      <LearningActionsWorkspace payload={result.data} />
    </div>
  );
}
