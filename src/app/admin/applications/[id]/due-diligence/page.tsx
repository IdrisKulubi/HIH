
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getDueDiligence } from "@/lib/actions/due-diligence";
import { DueDiligenceForm } from "@/components/application/admin/due-diligence/DueDiligenceForm";
import { PHASE_1_CONFIG, PHASE_2_CONFIG } from "@/lib/config/due-diligence";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DueDiligencePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const applicationId = parseInt(id);
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
        return redirect("/admin/login");
    }

    const { success, data: record } = await getDueDiligence(applicationId);

    if (!success || !record) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/admin/applications/${applicationId}`}>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/80">
                                <ArrowLeft weight="bold" className="w-5 h-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Due Diligence Review</h1>
                            <p className="text-xs text-slate-500 font-medium">Application #{applicationId}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                            record.phase1Status === 'completed' && record.phase2Status === 'completed'
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-orange-50 border-orange-200 text-orange-700"
                        )}>
                            {record.phase1Status === 'completed' && record.phase2Status === 'completed' ? (
                                <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                            )}
                            <span className="text-xs font-semibold">
                                {record.phase1Status === 'completed' && record.phase2Status === 'completed' ? 'Done' : 'In Progress'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                <Tabs defaultValue="phase1" className="space-y-8">
                    <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto inline-flex h-auto">
                        <TabsTrigger
                            value="phase1"
                            className="flex-1 md:flex-none px-6 py-3 rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 gap-2"
                        >
                            <span className="font-semibold">Phase 1: Phone / Desk</span>
                            {(record.phase1Score ?? 0) > 0 && <span className="text-xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-md">{record.phase1Score} pts</span>}
                            {record.phase1Status === 'completed' && <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400" />}
                        </TabsTrigger>
                        <TabsTrigger
                            value="phase2"
                            className="flex-1 md:flex-none px-6 py-3 rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 gap-2"
                        >
                            <span className="font-semibold">Phase 2: Physical Visit</span>
                            {(record.phase2Score ?? 0) > 0 && <span className="text-xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-md">{record.phase2Score} pts</span>}
                            {record.phase2Status === 'completed' && <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400" />}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="phase1" className="outline-none">
                        <DueDiligenceForm
                            applicationId={applicationId}
                            phase="phase1"
                            config={PHASE_1_CONFIG}
                            existingItems={record.items}
                            existingVerdict={record.finalVerdict as any}
                            existingReason={record.finalReason}
                        />

                        {/* Phase 1 Summary / Actions */}
                        <div className={cn(
                            "mt-8 p-6 rounded-2xl border flex items-start gap-4 transition-colors",
                            record.phase1Status === 'completed' ? "bg-emerald-50 border-emerald-100" : "bg-purple-50 border-purple-100"
                        )}>
                            {record.phase1Status === 'completed' ? (
                                <CheckCircle className="w-6 h-6 text-emerald-600 mt-1" />
                            ) : (
                                <Clock className="w-6 h-6 text-purple-600 mt-1" />
                            )}
                            <div>
                                <h4 className={cn("font-semibold", record.phase1Status === 'completed' ? "text-emerald-900" : "text-purple-900")}>
                                    Phase 1 Status: {record.phase1Status === 'completed' ? 'Completed' : record.phase1Status}
                                </h4>
                                <p className={cn("text-sm mt-1", record.phase1Status === 'completed' ? "text-emerald-700" : "text-purple-700")}>
                                    {record.phase1Status === 'completed'
                                        ? "Final decision for this phase has been recorded. You can still update it if necessary."
                                        : "Scores are saved automatically. Once all criteria are evaluated, the status will move to complete."}
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="phase2" className="outline-none">
                        <DueDiligenceForm
                            applicationId={applicationId}
                            phase="phase2"
                            config={PHASE_2_CONFIG}
                            existingItems={record.items}
                            existingVerdict={record.finalVerdict as any}
                            existingReason={record.finalReason}
                        />
                        <div className={cn(
                            "mt-8 p-6 rounded-2xl border flex items-start gap-4 transition-colors",
                            record.phase2Status === 'completed' ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
                        )}>
                            {record.phase2Status === 'completed' ? (
                                <CheckCircle className="w-6 h-6 text-emerald-600 mt-1" />
                            ) : (
                                <Clock className="w-6 h-6 text-blue-600 mt-1" />
                            )}
                            <div>
                                <h4 className={cn("font-semibold", record.phase2Status === 'completed' ? "text-emerald-900" : "text-blue-900")}>
                                    Phase 2 Status: {record.phase2Status === 'completed' ? 'Completed' : record.phase2Status}
                                </h4>
                                <p className={cn("text-sm mt-1", record.phase2Status === 'completed' ? "text-emerald-700" : "text-blue-700")}>
                                    {record.phase2Status === 'completed'
                                        ? "Final decision for the physical visit has been recorded. You can still update it if necessary."
                                        : "Physical verification requires site visit. Ensure photos are uploaded in the main application view if needed."}
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
