"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export function CdpSessionRowActions({
  mode,
  reportStarted,
  canManage,
  canDelete,
  disabled,
  onEdit,
  onDelete,
}: {
  mode: "planning" | "reporting";
  reportStarted: boolean;
  canManage: boolean;
  canDelete: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canManage) {
    return <span className="text-xs text-muted-foreground">View only</span>;
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={onEdit} disabled={disabled}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        {mode === "planning" ? "Edit plan" : reportStarted ? "Edit report" : "Complete report"}
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
