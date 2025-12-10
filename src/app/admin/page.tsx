import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getApplicationStats } from "@/lib/actions";
import {
  UsersIcon,
  CheckCircleIcon ,
  ClockIcon,
  ChartBarIcon,
  FileTextIcon,
  DownloadSimpleIcon,
  TrendUpIcon,
  PulseIcon,
  EyeIcon,
  GearIcon,
  ChatIcon,
  ShieldCheckIcon,
  EnvelopeSimpleIcon,
  CaretRightIcon
} from "@phosphor-icons/react/dist/ssr"; // Use SSR import if needed, or standard
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {

  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    redirect("/");
  }
  // Fetch real stats from the database
  const statsResult = await getApplicationStats();

  // Set default stats if fetch fails
  const stats = statsResult.success ? statsResult.data : {
    totalApplications: 0,
    eligibleApplications: 0,
    pendingReview: 0,
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 space-y-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 text-lg font-normal tracking-wide">
              Overview of the YouthAdapt Challenge.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-full border-slate-300 text-slate-700 hover:bg-white hover:text-black hover:border-slate-400 transition-all shadow-sm"
              asChild
            >
              <Link href="/admin/analytics">
                <ChartBarIcon className="h-4 w-4 mr-2" weight="bold" />
                Analytics
              </Link>
            </Button>
            <Button
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all"
              asChild
            >
              <Link href="/admin/applications">
                <EyeIcon className="h-4 w-4 mr-2" weight="bold" />
                View All
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards - Bento Grid Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardStatCard
            title="Total Applications"
            value={stats?.totalApplications}
            subtext="All submissions"
            icon={<UsersIcon weight="duotone" className="w-8 h-8 text-blue-500" />}
            trendIcon={<TrendUpIcon weight="bold" className="w-4 h-4 text-slate-400" />}
            trendLabel="Total submissions"
          />
          <DashboardStatCard
            title="Eligible"
            value={stats?.eligibleApplications}
            subtext="Qualified candidates"
            icon={<CheckCircleIcon weight="duotone" className="w-8 h-8 text-emerald-500" />}
            trendIcon={<PulseIcon weight="bold" className="w-4 h-4 text-emerald-500" />}
            trendLabel={stats?.totalApplications && stats.totalApplications > 0 ? `${Math.round((stats.eligibleApplications / stats.totalApplications) * 100)}% conversion` : 'No data'}
          />
          <DashboardStatCard
            title="Pending Review"
            value={stats?.pendingReview}
            subtext="Awaiting action"
            icon={<ClockIcon weight="duotone" className="w-8 h-8 text-amber-500" />}
            trendIcon={<ClockIcon weight="bold" className="w-4 h-4 text-amber-500" />}
            trendLabel="Needs attention"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <GearIcon weight="duotone" className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
                <p className="text-slate-500 text-sm">Manage the platform</p>
              </div>
            </div>

            <div className="grid gap-3">
              <QuickActionRow
                href="/admin/applications"
                icon={<FileTextIcon weight="duotone" className="w-5 h-5 text-blue-500" />}
                title="Review Applications"
                description="Evaluate and manage incoming submissions"
              />
              <QuickActionRow
                href="/admin/applications?status=eligible"
                icon={<CheckCircleIcon weight="duotone" className="w-5 h-5 text-emerald-500" />}
                title="View Eligible Candidates"
                description="Browse qualified applications only"
              />
              <QuickActionRow
                href="/admin/scoring"
                icon={<GearIcon weight="duotone" className="w-5 h-5 text-purple-500" />}
                title="Scoring Criteria"
                description="Configure evaluation metrics & weights"
              />
              <QuickActionRow
                href="/admin/support"
                icon={<ChatIcon weight="duotone" className="w-5 h-5 text-cyan-500" />}
                title="Support Tickets"
                description="View and respond to user queries"
              />
              <QuickActionRow
                href="/admin/review"
                icon={<ShieldCheckIcon weight="duotone" className="w-5 h-5 text-indigo-500" />}
                title="Senior Review"
                description="Final evaluation for shortlisted apps"
              />
              <QuickActionRow
                href="/admin/export"
                icon={<DownloadSimpleIcon weight="duotone" className="w-5 h-5 text-orange-500" />}
                title="Export Data"
                description="Download complete dataset as CSV/Excel"
              />
              <QuickActionRow
                href="/admin/feedback"
                icon={<EnvelopeSimpleIcon weight="duotone" className="w-5 h-5 text-pink-500" />}
                title="Feedback Emails"
                description="Send bulk feedback to applicants"
              />
            </div>
          </div>

          {/* Program Stats Panel */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <ChartBarIcon weight="duotone" className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Live Statistics</h2>
                <p className="text-slate-500 text-sm">Real-time program metrics</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {stats?.totalApplications && stats.totalApplications > 0 ? (
                <div className="space-y-8">
                  <StatProgressBar
                    label="Eligible Applications"
                    count={stats.eligibleApplications}
                    total={stats.totalApplications}
                    color="bg-emerald-500"
                  />
                  <StatProgressBar
                    label="Pending Review"
                    count={stats.pendingReview}
                    total={stats.totalApplications}
                    color="bg-amber-500"
                  />

                  <div className="pt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.totalApplications}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                      <div className="text-2xl font-bold text-emerald-700 tracking-tight">{stats.eligibleApplications}</div>
                      <div className="text-xs font-medium text-emerald-600/70 uppercase tracking-wider mt-1">Qualified</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ChartBarIcon weight="duotone" className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-medium">No Data Yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Stats will appear here once applications arrive.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function DashboardStatCard({ title, value, subtext, icon, trendIcon, trendLabel }: any) {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 relative overflow-hidden group hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[15px] font-medium text-slate-500">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-semibold text-slate-900 tracking-tight leading-none">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-slate-500">
        {trendIcon}
        {trendLabel}
      </div>
    </div>
  );
}

function QuickActionRow({ href, icon, title, description }: any) {
  return (
    <Link href={href} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors duration-200 border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 hover:border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h4 className="text-base font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{title}</h4>
          <p className="text-sm text-slate-500 font-normal">{description}</p>
        </div>
      </div>
      <CaretRightIcon weight="bold" className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
    </Link>
  )
}

function StatProgressBar({ label, count, total, color }: any) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
} 