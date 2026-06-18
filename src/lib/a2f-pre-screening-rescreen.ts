export function formatRescreenDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Compare calendar dates only — avoids timezone issues with date columns. */
export function isRescreenDateReached(rescreenEligibleAt: string | Date | null | undefined): boolean {
  if (!rescreenEligibleAt) return true;
  const scheduled =
    typeof rescreenEligibleAt === "string"
      ? rescreenEligibleAt.slice(0, 10)
      : rescreenEligibleAt.toISOString().slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return scheduled <= today;
}

export function canStartPreScreeningRescreen(input: {
  latestOutcome: string | null;
  rescreenEligibleAt: string | null;
  canClaim: boolean;
}): boolean {
  if (!input.canClaim || input.latestOutcome !== "conditional") return false;
  return isRescreenDateReached(input.rescreenEligibleAt);
}
