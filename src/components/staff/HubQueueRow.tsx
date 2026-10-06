import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

export function HubQueueRow({
  title,
  description,
  href,
  count,
  countLabel,
  primary,
  ctaLabel,
}: {
  title: string;
  description: string;
  href: string;
  count?: number;
  countLabel?: string;
  primary?: boolean;
  ctaLabel?: string;
}) {
  const borderClass = primary
    ? "border-slate-300 bg-white hover:border-slate-400"
    : "border-slate-200 bg-white hover:border-slate-300";

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border px-4 py-3.5 transition-colors hover:bg-slate-50/80 ${borderClass}`}
    >
      <Link href={href} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{title}</p>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {count} {countLabel ?? "waiting"}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </Link>
      {ctaLabel ? (
        <Button
          asChild
          size="sm"
          className={
            primary ? "shrink-0 bg-emerald-700 text-white hover:bg-emerald-800" : "shrink-0"
          }
          variant={primary ? "default" : "outline"}
        >
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      ) : (
        <Link href={href} className="shrink-0 p-1 text-muted-foreground hover:text-slate-700">
          <CaretRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
