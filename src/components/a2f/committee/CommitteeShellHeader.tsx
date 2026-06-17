import { CommitteeNav } from "./CommitteeNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function CommitteeShellHeader({ isAdmin }: { isAdmin: boolean }) {
    return (
        <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-sm">
            <div className="container mx-auto py-2.5 px-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                   
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue">
                            BIRE Programme
                        </p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                            Access to Finance Committee
                        </p>
                    </div>
                </div>
                <nav className="flex shrink-0 items-center gap-2">
                    <NotificationBell />
                    <CommitteeNav isAdmin={isAdmin} />
                </nav>
            </div>
            <div className="h-0.5 w-full bg-brand-blue" aria-hidden />
        </header>
    );
}
