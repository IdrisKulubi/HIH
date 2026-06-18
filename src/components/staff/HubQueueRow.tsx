import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

export function HubQueueRow({
  title,
  description,
  href,
  count,
  countLabel,
  primary,
}: {
  title: string;
  description: string;
  href: string;
  count?: number;
  countLabel?: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-lg border px-4 py-3.5 transition-colors ${
        primary
          ? "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{title}</p>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {count} {countLabel ?? "waiting"}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <CaretRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
