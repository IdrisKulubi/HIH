type Level = "info" | "warn" | "error";

/** One-line structured JSON log so fieldwork failures are searchable in the platform logs. */
export function logFieldwork(level: Level, event: string, meta: Record<string, unknown> = {}) {
  const line = JSON.stringify({ scope: "fieldwork", level, event, at: new Date().toISOString(), ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
