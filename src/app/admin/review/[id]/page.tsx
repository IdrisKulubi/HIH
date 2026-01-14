"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    User,
    Calendar,
    Note,
    ChatText,
    TrendUp,
    Files,
    CheckCircle,
    Warning
} from "@phosphor-icons/react";
import { getApplicationById, saveAdminOversightComment, DetailedApplication } from "@/lib/actions/admin-applications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminReviewDetailPage() {
    const params = useParams();
    const router = useRouter();
    const applicationId = Number(params.id);

    const [application, setApplication] = useState<DetailedApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchData() {
            const response = await getApplicationById(applicationId);
            if (response.success && response.data) {
                setApplication(response.data);
                setComment(response.data.eligibility?.adminOversightComment || "");
            } else {
                toast.error(response.error || "Failed to fetch application details");
                router.push("/admin/review");
            }
            setLoading(false);
        }
        fetchData();
    }, [applicationId, router]);

    const handleSaveComment = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const response = await saveAdminOversightComment(applicationId, comment);
            if (response.success) {
                toast.success("Oversight comment saved successfully");
            } else {
                toast.error(response.error || "Failed to save comment");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading comparison data...</p>
            </div>
        );
    }

    if (!application) return null;

    const eligibility = application.eligibility;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/review">
                                <Button variant="ghost" className="rounded-xl hover:bg-gray-100 gap-2 px-3">
                                    <ArrowLeft size={20} weight="bold" />
                                    <span className="font-medium">Back</span>
                                </Button>
                            </Link>
                            <div className="h-8 w-px bg-gray-200 mx-1" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    Review Comparison: {application.business.name}
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-0">
                                        ID: #{application.id}
                                    </Badge>
                                    <span className="text-gray-400 text-xs">•</span>
                                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">{application.track} Track</span>
                                </div>
                            </div>
                        </div>

                        <Link href={`/admin/applications/${application.id}`}>
                            <Button variant="outline" className="rounded-xl gap-2 h-11 px-6">
                                <Files size={18} />
                                View Full Application
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Reviewer 1 Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                            <h2 className="text-xl font-bold text-gray-900">Reviewer 1 Evaluation</h2>
                        </div>

                        {eligibility?.reviewer1Score !== null ? (
                            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-8 border-b border-gray-100 bg-blue-50/30">
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Total Score Given</div>
                                    <div className="text-5xl font-black text-gray-900 tracking-tighter">
                                        {eligibility?.reviewer1Score}<span className="text-lg font-normal text-gray-400 ml-1">/100</span>
                                    </div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            <Note size={18} weight="bold" />
                                            Assessor Notes
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 leading-relaxed italic border border-gray-100">
                                            {eligibility?.reviewer1Notes || "No specific notes provided by Reviewer 1."}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-gray-400" />
                                            <span className="text-gray-500">Evaluated on</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">
                                            {eligibility?.reviewer1At ? format(new Date(eligibility.reviewer1At), "PPP p") : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center">
                                <Warning size={48} className="text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-500">Not Evaluated by Reviewer 1</h3>
                                <p className="text-gray-400 text-sm mt-1">This application hasn't reached or completed the first review stage.</p>
                            </div>
                        )}
                    </div>

                    {/* Reviewer 2 Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">2</div>
                            <h2 className="text-xl font-bold text-gray-900">Reviewer 2 Evaluation</h2>
                        </div>

                        {eligibility?.reviewer2Score !== null ? (
                            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-8 border-b border-gray-100 bg-emerald-50/30">
                                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Total Score Given</div>
                                    <div className="text-5xl font-black text-gray-900 tracking-tighter">
                                        {eligibility?.reviewer2Score}<span className="text-lg font-normal text-gray-400 ml-1">/100</span>
                                    </div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            <Note size={18} weight="bold" />
                                            Assessor Notes
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 leading-relaxed italic border border-gray-100">
                                            {eligibility?.reviewer2Notes || "No specific notes provided by Reviewer 2."}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-gray-400" />
                                            <span className="text-gray-500">Evaluated on</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">
                                            {eligibility?.reviewer2At ? format(new Date(eligibility.reviewer2At), "PPP p") : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center">
                                <Warning size={48} className="text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-500">Not Evaluated by Reviewer 2</h3>
                                <p className="text-gray-400 text-sm mt-1">This application hasn't reached or completed the second review stage.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Oversight Section */}
                <div className="mt-12 bg-gray-900 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <ChatText size={32} weight="fill" className="text-blue-400" />
                        <h2 className="text-2xl font-bold tracking-tight">Administrator Oversight Comment</h2>
                    </div>

                    <p className="text-gray-400 mb-8 max-w-2xl">
                        As an administrator, you can leave an oversight comment on this specific evaluation cycle.
                        This comment is for internal record-keeping and won't affect the applicant's existing scores.
                    </p>

                    <div className="space-y-6">
                        <Textarea
                            placeholder="Enter your oversight notes, observations or decisions here..."
                            className="min-h-[200px] bg-white text-gray-900 rounded-2xl p-6 text-lg border-0 ring-offset-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />

                        <div className="flex items-center justify-end gap-4">
                            <Button
                                onClick={handleSaveComment}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10 h-14 font-bold text-lg shadow-lg shadow-blue-900/40 transition-all hover:-translate-y-0.5"
                            >
                                {saving ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                        Saving...
                                    </div>
                                ) : "Save Oversight Comment"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
