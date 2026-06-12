import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationStats } from "@/lib/actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
  ArrowRight,
  Bank,
  Calculator,
  ChartBar,
  ChatCircle,
  CheckCircle,
  ClipboardText,
  DownloadSimple,
  EnvelopeSimple,
  Eye,
  FileText,
  ListChecks,
  ShieldCheck,
  SquaresFour,
  Target,
  UserCheck,
  Users,
} from "@phosphor-icons/react/dist/ssr";

type StatPanelProps = {
  label: string;
  value: number;
  detail: string;
  variant?: "brand" | "muted" | "warning";
};

type QuickLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; weight?: "duotone" }>;
};

type QuickLinkGroup = {
  title: string;
  links: QuickLink[];
};

const QUICK_LINK_GROUPS: QuickLinkGroup[] = [
  {
    title: "Pipeline",
    links: [
      { href: "/admin", label: "Dashboard", icon: SquaresFour },
      { href: "/admin/applications", label: "Applications", icon: FileText },
      { href: "/admin/observation", label: "Observation", icon: Eye },
      { href: "/admin/due-diligence", label: "Due Diligence", icon: ClipboardText },
      { href: "/admin/qualified", label: "Qualified", icon: CheckCircle },
    ],
  },
  {
    title: "Business Support",
    links: [
      { href: "/admin/a2f", label: "A2F Administration", icon: Bank },
      { href: "/a2f", label: "Passed Matching Grant Pipeline", icon: Bank },
      { href: "/admin/kyc", label: "KYC Verification", icon: ShieldCheck },
      { href: "/admin/cna", label: "CNA", icon: ListChecks },
      { href: "/admin/cdp", label: "CDP Work Queue", icon: Target },
      { href: "/admin/mentorship", label: "Mentorship", icon: Users },
    ],
  },
  {
    title: "Management",
    links: [
      { href: "/admin/analytics", label: "Analytics", icon: ChartBar },
      { href: "/admin/scoring", label: "Scoring", icon: Calculator },
      { href: "/admin/review", label: "Review", icon: ChatCircle },
      { href: "/admin/assignments", label: "Assignments", icon: UserCheck },
      { href: "/admin/users", label: "User Management", icon: Users },
      { href: "/admin/feedback", label: "Feedback Emails", icon: EnvelopeSimple },
      { href: "/admin/export", label: "Export Data", icon: DownloadSimple },
    ],
  },
];

function StatPanel({ label, value, detail, variant = "brand" }: StatPanelProps) {
  const panelStyles = {
    brand: "bg-brand-blue/5 border-brand-blue/15",
    muted: "bg-muted/50 border-border",
    warning: "bg-amber-50/80 border-amber-200/80",
  };
  const labelStyles = {
    brand: "text-brand-blue-dark",
    muted: "text-muted-foreground",
    warning: "text-amber-700",
  };

  return (
    <div className={`rounded-xl border px-4 py-4 ${panelStyles[variant]}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${labelStyles[variant]}`}>{label}</p>
      <p className="text-3xl font-bold mt-1 text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-600 mt-1">{detail}</p>
    </div>
  );
}

function ProgressStat({ label, count, total, barClass }: { label: string; count: number; total: number; barClass: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900 tabular-nums">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickLinkRow({ href, label, icon: Icon }: QuickLink) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:text-brand-blue hover:bg-slate-50 transition-colors group"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon weight="duotone" className="size-4 shrink-0 text-brand-blue" />
        <span className="truncate">{label}</span>
      </span>
      <ArrowRight weight="bold" className="size-3.5 text-slate-300 group-hover:text-brand-blue shrink-0 transition-colors" />
    </Link>
  );
}

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    redirect("/");
  }

  const statsResult = await getApplicationStats();
  const stats = statsResult.success
    ? statsResult.data
    : { totalApplications: 0, eligibleApplications: 0, pendingReview: 0 };

  const total = stats?.totalApplications ?? 0;
  const eligible = stats?.eligibleApplications ?? 0;
  const pending = stats?.pendingReview ?? 0;
  const conversion =
    total > 0 ? `${Math.round((eligible / total) * 100)}% eligible` : "No applications yet";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of the BIRE Programme.</p>
        </div>
        <Button asChild className="bg-brand-blue hover:bg-brand-blue-dark shrink-0">
          <Link href="/admin/applications">
            <FileText className="size-4 mr-1.5" weight="bold" />
            View applications
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatPanel
          label="Total applications"
          value={total}
          detail="All submissions"
          variant="brand"
        />
        <StatPanel
          label="Eligible"
          value={eligible}
          detail={conversion}
          variant="muted"
        />
        <StatPanel
          label="Pending review"
          value={pending}
          detail="Needs attention"
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {QUICK_LINK_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-brand-blue-dark">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-0.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <QuickLinkRow {...link} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ChartBar weight="duotone" className="size-4 text-brand-blue" />
            Programme breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total > 0 ? (
            <div className="space-y-6 max-w-xl">
              <ProgressStat
                label="Eligible applications"
                count={eligible}
                total={total}
                barClass="bg-brand-blue"
              />
              <ProgressStat
                label="Pending review"
                count={pending}
                total={total}
                barClass="bg-amber-500"
              />
            </div>
          ) : (
            <div className="py-8 text-center">
              <ChartBar weight="duotone" className="size-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Stats will appear once applications arrive.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
