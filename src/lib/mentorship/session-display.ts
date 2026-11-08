export function formatMentorshipDurationMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function splitDurationMinutes(total: number | null | undefined): {
  hours: number;
  minutes: number;
} {
  if (!total || total <= 0) return { hours: 0, minutes: 0 };
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
  };
}
