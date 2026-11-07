"use client";

export function ConfirmDownloadLink({ href, message, children }: { href: string; message: string; children: React.ReactNode }) {
  return (
    <a href={href} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}
      className="inline-flex h-8 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-900 hover:bg-amber-100">
      {children}
    </a>
  );
}
