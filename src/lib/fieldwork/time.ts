/** Fieldwork business time. Africa/Nairobi is UTC+3 with no daylight saving. */
export const FIELDWORK_TIME_ZONE = "Africa/Nairobi";
const OFFSET = "+03:00";

/** "2026-11-05T09:30" (as typed in a datetime-local input, Nairobi time) -> ISO instant. */
export function nairobiLocalToIso(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const date = new Date(`${local}:00${OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Instant -> "YYYY-MM-DDTHH:mm" in Nairobi time for a datetime-local input. */
export function isoToNairobiLocal(value: Date | string) {
  const date = new Date(new Date(value).getTime() + 3 * 3_600_000);
  return date.toISOString().slice(0, 16);
}

export function formatNairobi(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { timeZone: FIELDWORK_TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/** Adds minutes to a Nairobi-local string. */
export function addMinutesLocal(local: string, minutes: number) {
  const iso = nairobiLocalToIso(local);
  return iso ? isoToNairobiLocal(new Date(new Date(iso).getTime() + minutes * 60_000)) : local;
}

/** Midnight (Nairobi) at the start of the calendar day containing `value`, as an instant. */
export function startOfNairobiDay(value: Date | string = new Date()) {
  return new Date(`${isoToNairobiLocal(value).slice(0, 10)}T00:00:00${OFFSET}`);
}
