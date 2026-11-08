import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getMelFinancialBaselineWorkspace } from "@/lib/actions/mel-financial-baselines";
import { FinancialBaselineWorkspace } from "@/components/mel/phase5/FinancialBaselineWorkspace";

export default async function MelFinancialBaselinesPage() {
  const result = await getMelFinancialBaselineWorkspace();
  if (!result.success || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</p>;
  return <div className="container mx-auto space-y-7 px-4 py-8"><header><Link href="/admin/mel/imports" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> Imports</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Enterprise financial baselines</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Validate, match, and activate monthly revenue and cost baselines before using them in progressive quarterly monitoring.</p></header><FinancialBaselineWorkspace data={result.data} /></div>;
}
