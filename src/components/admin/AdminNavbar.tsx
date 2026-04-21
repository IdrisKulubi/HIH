"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  LayoutDashboard,
  FileText,
  Eye,
  ClipboardCheck,
  CheckCircle,
  Landmark,
  ShieldCheck,
  ClipboardList,
  Target,
  Users,
  BarChart3,
  Calculator,
  MessageSquare,
  UserCheck,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function NavItem({ href, icon, children }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className={cn(
            "flex items-start gap-3 rounded-md p-3 transition-all",
            "hover:bg-slate-100 focus:bg-slate-100",
            "group",
            isActive && "bg-slate-100"
          )}
        >
          <div className={cn("mt-0.5 shrink-0", isActive && "text-slate-900")}>{icon}</div>
          <div className="flex flex-col gap-0.5">{children}</div>
          <ChevronRight className={cn(
            "ml-auto h-4 w-4 text-slate-300 transition-opacity",
            isActive ? "opacity-100 text-slate-500" : "opacity-0 group-hover:opacity-100"
          )} />
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export function AdminNavbar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-16 z-40 border-b bg-slate-800 text-white shadow-lg">
      <div className="container mx-auto py-3 px-4 flex justify-between items-center">
        <Link href="/admin" className="font-bold text-xl flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-400" />
          BIRE Programme Admin
        </Link>

        <NavigationMenu className="text-slate-800" delayDuration={0}>
          <NavigationMenuList className="gap-1">
            {/* Pipeline Group */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "text-white hover:text-white transition-all",
                  isActive("/admin") || isActive("/admin/applications") || isActive("/admin/observation") || isActive("/admin/due-diligence") || isActive("/admin/qualified")
                    ? "bg-slate-600"
                    : "bg-slate-700/50 hover:bg-slate-600"
                )}
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-blue-400" />
                  Pipeline
                </span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[280px] gap-1 p-3">
                  <NavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4 text-blue-500" />}>
                    <span className="font-medium">Dashboard</span>
                    <span className="text-xs text-muted-foreground">Overview & stats</span>
                  </NavItem>
                  <NavItem href="/admin/applications" icon={<FileText className="h-4 w-4 text-slate-500" />}>
                    <span className="font-medium">Applications</span>
                    <span className="text-xs text-muted-foreground">View all applications</span>
                  </NavItem>
                  <NavItem href="/admin/observation" icon={<Eye className="h-4 w-4 text-amber-500" />}>
                    <span className="font-medium text-amber-600">Observation</span>
                    <span className="text-xs text-muted-foreground">Under review stage</span>
                  </NavItem>
                  <NavItem href="/admin/due-diligence" icon={<ClipboardCheck className="h-4 w-4 text-emerald-500" />}>
                    <span className="font-medium text-emerald-600">Due Diligence</span>
                    <span className="text-xs text-muted-foreground">Verification process</span>
                  </NavItem>
                  <NavItem href="/admin/qualified" icon={<CheckCircle className="h-4 w-4 text-green-500" />}>
                    <span className="font-medium text-green-600">Qualified</span>
                    <span className="text-xs text-muted-foreground">Approved candidates</span>
                  </NavItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Business Support Group */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "text-white hover:text-white transition-all",
                  isActive("/a2f") || isActive("/admin/kyc") || isActive("/admin/cna") || isActive("/admin/cdp") || isActive("/admin/mentorship")
                    ? "bg-slate-600"
                    : "bg-slate-700/50 hover:bg-slate-600"
                )}
              >
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  Business Support
                </span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[280px] gap-1 p-3">
                  <NavItem href="/a2f" icon={<Landmark className="h-4 w-4 text-cyan-500" />}>
                    <span className="font-medium text-cyan-600">A2F</span>
                    <span className="text-xs text-muted-foreground">Access to Finance</span>
                  </NavItem>
                  <NavItem href="/admin/kyc" icon={<ShieldCheck className="h-4 w-4 text-sky-500" />}>
                    <span className="font-medium text-sky-600">KYC</span>
                    <span className="text-xs text-muted-foreground">Know Your Customer</span>
                  </NavItem>
                  <NavItem href="/admin/cna" icon={<ClipboardList className="h-4 w-4 text-teal-500" />}>
                    <span className="font-medium text-teal-600">CNA</span>
                    <span className="text-xs text-muted-foreground">Capacity Needs Assessment</span>
                  </NavItem>
                  <NavItem href="/admin/cdp" icon={<Target className="h-4 w-4 text-emerald-500" />}>
                    <span className="font-medium text-emerald-600">CDP</span>
                    <span className="text-xs text-muted-foreground">Capacity Development Plan</span>
                  </NavItem>
                  <NavItem href="/admin/mentorship" icon={<Users className="h-4 w-4 text-violet-500" />}>
                    <span className="font-medium text-violet-600">Mentorship</span>
                    <span className="text-xs text-muted-foreground">Mentor matching</span>
                  </NavItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Management Group */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "text-white hover:text-white transition-all",
                  isActive("/admin/analytics") || isActive("/admin/scoring") || isActive("/admin/review") || isActive("/admin/assignments")
                    ? "bg-slate-600"
                    : "bg-slate-700/50 hover:bg-slate-600"
                )}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                  Management
                </span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[280px] gap-1 p-3">
                  <NavItem href="/admin/analytics" icon={<BarChart3 className="h-4 w-4 text-purple-500" />}>
                    <span className="font-medium">Analytics</span>
                    <span className="text-xs text-muted-foreground">Reports & insights</span>
                  </NavItem>
                  <NavItem href="/admin/scoring" icon={<Calculator className="h-4 w-4 text-indigo-500" />}>
                    <span className="font-medium">Scoring</span>
                    <span className="text-xs text-muted-foreground">Evaluation criteria</span>
                  </NavItem>
                  <NavItem href="/admin/review" icon={<MessageSquare className="h-4 w-4 text-pink-500" />}>
                    <span className="font-medium">Review</span>
                    <span className="text-xs text-muted-foreground">Review management</span>
                  </NavItem>
                  <NavItem href="/admin/assignments" icon={<UserCheck className="h-4 w-4 text-purple-500" />}>
                    <span className="font-medium text-purple-600">Assignments</span>
                    <span className="text-xs text-muted-foreground">Task assignments</span>
                  </NavItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Back to Site Button */}
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-white/90 hover:text-white transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Site
        </Link>
      </div>
    </header>
  );
}
