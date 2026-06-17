"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowClockwise,
  Bell,
  BellRinging,
  CheckCircle,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  getTopbarNotifications,
  type NotificationTone,
  type TopbarNotification,
} from "@/lib/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Surface = "light" | "dark";

const TONE_STYLES: Record<NotificationTone, string> = {
  info: "bg-sky-50 text-sky-700 border-sky-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-red-50 text-red-700 border-red-200",
};

function renderToneIcon(tone: NotificationTone) {
  if (tone === "success") return <CheckCircle weight="duotone" className="size-4" />;
  if (tone === "warning" || tone === "danger") {
    return <WarningCircle weight="duotone" className="size-4" />;
  }
  return <Clock weight="duotone" className="size-4" />;
}

function NotificationRow({ notification }: { notification: TopbarNotification }) {
  return (
    <Link
      href={notification.href}
      className="group block rounded-md px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
            TONE_STYLES[notification.tone]
          )}
        >
          {renderToneIcon(notification.tone)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold leading-snug text-slate-900">
              {notification.title}
            </span>
            {notification.count ? (
              <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[11px]">
                {notification.count}
              </Badge>
            ) : null}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-600">
            {notification.body}
          </span>
          <span className="mt-1.5 block text-[11px] font-medium uppercase tracking-wide text-brand-blue">
            {notification.group}
          </span>
        </span>
      </div>
    </Link>
  );
}

export function NotificationBell({
  className,
  surface = "light",
}: {
  className?: string;
  surface?: Surface;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TopbarNotification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const cappedCount = useMemo(() => (totalCount > 99 ? "99+" : String(totalCount)), [totalCount]);

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await getTopbarNotifications();
      setLoaded(true);
      if (!result.success || !result.data) {
        setError(result.error ?? "Could not load notifications");
        return;
      }
      setError(null);
      setItems(result.data.items);
      setTotalCount(result.data.totalCount);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasNotifications = totalCount > 0;
  const BellIcon = hasNotifications ? BellRinging : Bell;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex size-10 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40",
            surface === "dark"
              ? "border-white/15 text-white/85 hover:bg-white/10 hover:text-white"
              : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-brand-blue",
            className
          )}
          aria-label={
            hasNotifications
              ? `Open notifications, ${totalCount} pending`
              : "Open notifications"
          }
        >
          <BellIcon weight={hasNotifications ? "fill" : "regular"} className="size-5" />
          {hasNotifications ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-brand-red px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white shadow-sm">
              {cappedCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">
              {hasNotifications ? `${totalCount} pending item${totalCount === 1 ? "" : "s"}` : "No pending work"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={load}
            disabled={pending}
            aria-label="Refresh notifications"
          >
            <ArrowClockwise className={cn("size-4", pending && "animate-spin")} />
          </Button>
        </div>
        <Separator />
        {!loaded || pending ? (
          <div className="space-y-3 p-4">
            <div className="h-10 rounded-md bg-slate-100" />
            <div className="h-10 rounded-md bg-slate-100" />
            <div className="h-10 rounded-md bg-slate-100" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">{error}</div>
        ) : items.length > 0 ? (
          <ScrollArea className="max-h-[420px]">
            <div className="p-2">
              {items.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center">
            <CheckCircle weight="duotone" className="mx-auto size-9 text-emerald-600" />
            <p className="mt-2 text-sm font-semibold text-slate-900">You are all caught up</p>
            <p className="mt-1 text-xs text-slate-500">
              New role-specific tasks will appear here.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
