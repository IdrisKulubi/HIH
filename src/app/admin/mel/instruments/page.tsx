import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { InstrumentAdminWorkspace } from "@/components/mel/phase5/InstrumentAdminWorkspace";
import { getMelInstrumentWorkspace } from "@/lib/actions/mel-instruments";

export default async function MelInstrumentsPage() { const result = await getMelInstrumentWorkspace(); if (!result.success || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</p>; return <div className="container mx-auto space-y-7 px-4 py-8"><header><Link href="/admin/mel" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> MEL configuration</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Configurable instruments</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Build baseline, midline, endline, monitoring, and special-study forms. Published versions are immutable.</p></header><InstrumentAdminWorkspace data={result.data} /></div>; }
