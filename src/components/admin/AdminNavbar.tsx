"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  SquaresFour,
  FileText,
  Eye,
  ClipboardText,
  CheckCircle,
  Bank,
  ShieldCheck,
  ListChecks,
  Target,
  Users,
  ChartBar,
  Calculator,
  ChatCircle,
  UserCheck,
  ArrowLeft,
  List,
  CaretDown,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavIcon = React.ComponentType<{ className?: string; weight?: "duotone" | "bold" }>;

type NavLink = {
  href: string;
  label: string;
  icon: NavIcon;
};

type NavGroup = {
  label: string;
  match: (pathname: string) => boolean;
  items: NavLink[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Pipeline",
    match: (pathname) =>
      pathname === "/admin" ||
      pathname.startsWith("/admin/applications") ||
      pathname.startsWith("/admin/observation") ||
      pathname.startsWith("/admin/due-diligence") ||
      pathname.startsWith("/admin/qualified"),
    items: [
      { href: "/admin", label: "Dashboard", icon: SquaresFour },
      { href: "/admin/applications", label: "Applications", icon: FileText },
      { href: "/admin/observation", label: "Observation", icon: Eye },
      { href: "/admin/due-diligence", label: "Due Diligence", icon: ClipboardText },
      { href: "/admin/qualified", label: "Qualified", icon: CheckCircle },
    ],
  },
  {
    label: "Business Support",
    match: (pathname) =>
      pathname.startsWith("/a2f") ||
      pathname.startsWith("/admin/kyc") ||
      pathname.startsWith("/admin/cna") ||
      pathname.startsWith("/admin/cdp") ||
      pathname.startsWith("/admin/mentorship"),
    items: [
      { href: "/a2f", label: "A2F", icon: Bank },
      { href: "/admin/kyc", label: "KYC", icon: ShieldCheck },
      { href: "/admin/cna", label: "CNA", icon: ListChecks },
      { href: "/admin/cdp", label: "CDP Work Queue", icon: Target },
      { href: "/admin/mentorship", label: "Mentorship", icon: Users },
    ],
  },
  {
    label: "Management",
    match: (pathname) =>
      pathname.startsWith("/admin/analytics") ||
      pathname.startsWith("/admin/scoring") ||
      pathname.startsWith("/admin/review") ||
      pathname.startsWith("/admin/assignments") ||
      pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/feedback") ||
      pathname.startsWith("/admin/export") ||
      pathname.startsWith("/admin/support"),
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: ChartBar },
      { href: "/admin/scoring", label: "Scoring", icon: Calculator },
      { href: "/admin/review", label: "Review", icon: ChatCircle },
      { href: "/admin/assignments", label: "Assignments", icon: UserCheck },
    ],
  },
];

function isLinkActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const groupActive = group.match(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40",
            groupActive
              ? "text-brand-blue bg-brand-blue/10"
              : "text-slate-600 hover:text-brand-blue hover:bg-slate-50"
          )}
        >
          {group.label}
          <CaretDown weight="bold" className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-52">
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isLinkActive(pathname, item.href);
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 cursor-pointer",
                  active && "text-brand-blue font-semibold"
                )}
              >
                <Icon weight="duotone" className="size-4 shrink-0 text-brand-blue" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden shrink-0" aria-label="Open menu">
          <List weight="bold" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left text-sm font-semibold text-slate-900">Admin navigation</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue mb-2">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                          active
                            ? "text-brand-blue font-semibold bg-brand-blue/10"
                            : "text-slate-600 hover:text-brand-blue hover:bg-slate-50"
                        )}
                      >
                        <Icon weight="duotone" className="size-4 shrink-0 text-brand-blue" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="border-t pt-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue transition-colors"
            >
              <ArrowLeft weight="bold" className="size-3.5" />
              Back to site
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function AdminNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/admin" className="flex items-center gap-3 min-w-0 shrink">
          <div className="min-w-0 hidden sm:block">
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue leading-none">
              BIRE Programme
            </p>
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight mt-0.5">Admin</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_GROUPS.map((group) => (
            <NavDropdown key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue transition-colors"
          >
            <ArrowLeft weight="bold" className="size-3.5" />
            Back to site
          </Link>
          <MobileNav pathname={pathname} />
        </div>
      </div>
      <div className="h-0.5 w-full bg-brand-blue" aria-hidden />
    </header>
  );
}
