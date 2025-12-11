"use client";

import { cn } from "@/lib/utils";
import {
    Files,
    CheckCircle,
    XCircle,
    TrendUp,
    Users
} from "@phosphor-icons/react";

interface StatusStats {
    totalApplications: number;
    foundationTrack: number;
    accelerationTrack: number;
    eligibleApplications: number;
    pendingReview: number;
}

export function DashboardStats({ stats }: { stats: StatusStats | null }) {
    if (!stats) return null;

    const total = stats.totalApplications || 0;
    const eligible = stats.eligibleApplications || 0;
    const ineligible = total - eligible;
    const pendingReview = stats.pendingReview || 0;

    // Calculate pass rate
    const passRate = total > 0 ? ((eligible / total) * 100).toFixed(0) : "0";

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
            {/* Card 1: Total Volume */}
            <div className="relative group overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Files size={80} weight="fill" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1">Total Applications</span>
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                        {total.toLocaleString()}
                    </span>
                    <div className="mt-2 flex items-center text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
                        <TrendUp className="mr-1" />
                        Active Cycle
                    </div>
                </div>
            </div>

            {/* Card 2: Passed System Check */}
            <div className="relative group overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle size={80} weight="fill" className="text-green-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1">System Verified</span>
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                        {eligible.toLocaleString()}
                    </span>
                    <div className="mt-2 flex items-center text-xs text-gray-400">
                        <span className="font-semibold text-green-600 mr-1">{passRate}%</span> pass rate
                    </div>
                </div>
            </div>

            {/* Card 3: Failed System Check */}
            <div className="relative group overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <XCircle size={80} weight="fill" className="text-red-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1">System Rejected</span>
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                        {ineligible.toLocaleString()}
                    </span>
                    <div className="mt-2 text-xs text-gray-400">
                        Requires manual review
                    </div>
                </div>
            </div>

            {/* Card 4: Detailed Review */}
            <div className="relative group overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users size={80} weight="fill" className="text-blue-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1">Pending Review</span>
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                        {pendingReview.toLocaleString()}
                    </span>
                    <div className="mt-2 flex gap-2">
                        <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                            {(stats.foundationTrack || 0)} Foundation
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {(stats.accelerationTrack || 0)} Acceleration
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
