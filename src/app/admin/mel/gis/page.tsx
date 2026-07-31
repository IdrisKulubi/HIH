import Link from "next/link";
import { ArrowLeft, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { GisWorkspace } from "@/components/mel/reporting/GisWorkspace";
import { getMelGisData } from "@/lib/actions/mel-reporting";

export default async function MelGisPage() {
  const result = await getMelGisData();
  if (!result.success || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</p>;
  return <div className="container mx-auto space-y-7 px-4 py-8"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/admin/mel/reporting" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> Reporting dashboard</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Protected enterprise GIS</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Verified KYC locations with server-side access control and reduced display precision.</p></div><Button variant="outline" asChild><a href="/api/mel/exports?type=gis&format=csv"><DownloadSimple className="size-4" /> Restricted export</a></Button></header><GisWorkspace points={result.data.points} invalid={result.data.invalid} /></div>;
}
