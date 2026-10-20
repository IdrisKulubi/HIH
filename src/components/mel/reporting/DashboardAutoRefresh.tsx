"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const REFRESH_INTERVAL_MS = 60_000;

export function DashboardAutoRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    startTransition(() => {
      router.refresh();
      setLastRefreshed(new Date());
    });
  }, [router]);

  useEffect(() => {
    const initialTimestamp = window.setTimeout(() => setLastRefreshed(new Date()), 0);
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialTimestamp);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600" aria-live="polite">
      <span>Last refreshed {lastRefreshed ? lastRefreshed.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</span>
      <span className="text-slate-400">· updates every 60 seconds</span>
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={refresh} disabled={isPending}>
        <ArrowClockwise className={`mr-1 size-3.5 ${isPending ? "animate-spin motion-reduce:animate-none" : ""}`} />
        {isPending ? "Refreshing" : "Refresh now"}
      </Button>
    </div>
  );
}
