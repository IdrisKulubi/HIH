"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CaretRight,
  MagnifyingGlass,
  Funnel,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ClipboardText
} from "@phosphor-icons/react";
import { getReviewedApplications, ApplicationListItem } from "@/lib/actions/admin-applications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminReviewPage() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      const response = await getReviewedApplications();
      if (response.success && response.data) {
        setApplications(response.data);
      } else {
        toast.error(response.error || "Failed to fetch reviewed applications");
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredApplications = applications.filter(app =>
    app.business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicant.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Link href="/admin/applications">
                <Button variant="ghost" className="rounded-xl hover:bg-gray-100 gap-2 px-3">
                  <ArrowLeft size={20} weight="bold" />
                  <span className="font-medium">Back</span>
                </Button>
              </Link>
              <div className="h-10 w-px bg-gray-200" />
              <div>
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-1">
                  <ClipboardText size={18} weight="bold" />
                  <span>Admin Oversight</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Review Oversight</h1>
                <p className="text-gray-500 mt-1">Oversee and compare reviewer evaluations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        {/* Stats & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search by business or applicant name..."
              className="pl-10 h-11 bg-white border-gray-200 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border-blue-200">
              {filteredApplications.length} Applications Reviewed
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading reviewed applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No applications found</h3>
            <p className="text-gray-500">Currently, there are no applications that have been scored by reviewers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApplications.map((app) => {
              const result = app.eligibilityResults[0];
              const score = result?.totalScore ?? 0;

              return (
                <div
                  key={app.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`uppercase text-[10px] font-bold tracking-wider ${app.track === 'foundation' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {app.track}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">ID: #{app.id}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {app.business.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="text-gray-400" size={16} weight="fill" />
                          <span>{app.applicant.firstName} {app.applicant.lastName}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="text-gray-400" size={16} />
                          <span>{app.submittedAt ? format(new Date(app.submittedAt), "MMM d, yyyy") : "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Score Summary */}
                      <div className="text-center md:px-8 md:border-x border-gray-100">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Current Score</div>
                        <div className="text-3xl font-black text-gray-900 tracking-tighter">
                          {score}<span className="text-sm font-normal text-gray-400 ml-0.5">/100</span>
                        </div>
                      </div>

                      {/* Reviewer Status */}
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Evaluated By:</span>
                          <span className="font-semibold text-gray-900">
                            {result?.evaluator?.name || result?.evaluatedBy || "System"}
                          </span>
                        </div>
                        <Link href={`/admin/review/${app.id}`} className="w-full">
                          <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11">
                            Review Oversight
                            <ArrowRight size={16} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
