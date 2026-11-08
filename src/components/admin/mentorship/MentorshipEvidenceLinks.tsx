import { ExternalLink } from "lucide-react";
import type { MentorshipEvidenceFile } from "@/lib/mentorship/evidence";

export function MentorshipEvidenceLinks({
  files,
  className,
}: {
  files: MentorshipEvidenceFile[];
  className?: string;
}) {
  if (files.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${className ?? ""}`}>
      {files.map((file, index) => (
        <a
          key={`${file.url}-${index}`}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
        >
          <ExternalLink className="size-3" />
          View evidence{files.length > 1 ? ` (${index + 1})` : ""}
        </a>
      ))}
    </div>
  );
}
