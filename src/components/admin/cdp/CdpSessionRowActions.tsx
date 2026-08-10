"use client";

import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

export function CdpSessionRowActions({
  mode,
  reportStarted,
  approvalStatus,
  canManage,
  canDelete,
  disabled,
  onEdit,
  onDelete,
}: {
  mode: "planning" | "reporting";
  reportStarted: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  canManage: boolean;
  canDelete: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canManage) {
    return <span className="text-xs text-muted-foreground">View only</span>;
  }

  const isReturned = approvalStatus === "rejected";
  const isApproved = approvalStatus === "approved";
  const reportActionLabel = isReturned
    ? "Edit & resubmit"
    : isApproved
      ? "View report"
      : reportStarted
        ? "Edit report"
        : "Complete report";
  const ReportActionIcon = isApproved ? Eye : Pencil;

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        type="button"
        variant={isReturned ? "default" : "ghost"}
        size="sm"
        className={isReturned ? "bg-emerald-700 text-white hover:bg-emerald-800" : undefined}
        onClick={onEdit}
        disabled={disabled}
      >
        <ReportActionIcon className="mr-1 h-3.5 w-3.5" />
        {mode === "planning" ? "Edit plan" : reportActionLabel}
      </Button>
      {mode === "planning" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={disabled || !canDelete}
          title={canDelete ? "Delete session" : "Approved sessions cannot be deleted"}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      ) : null}
    </div>
  );
}
