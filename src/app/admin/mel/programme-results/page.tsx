import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ProgrammeResultWorkspace } from "@/components/mel/reporting/ProgrammeResultWorkspace";
import { getMelProgrammeResultWorkspace } from "@/lib/actions/mel-reporting";

export default async function MelProgrammeResultsPage() {
  const result = await getMelProgrammeResultWorkspace();
  if (!result.success || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</p>;
  return <div className="container mx-auto space-y-7 px-4 py-8"><header><Link href="/admin/mel/reporting" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> Reporting dashboard</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Programme-level result entries</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Enter Output 4 and other approved non-enterprise results. Draft, reopened, and voided entries never contribute to official actuals.</p></header><ProgrammeResultWorkspace data={result.data} /></div>;
}
