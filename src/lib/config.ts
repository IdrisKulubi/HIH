// Application configuration
export const APP_CONFIG = {
  // Application deadline - January 30, 2026 at 11:59 PM East Africa Time (UTC+3)
  applicationDeadline: new Date("2026-01-30T23:59:59+03:00"),
  
  // Display strings
  applicationDeadlineDisplay: "January 30, 2026 at 11:59 PM EAT",
  nextApplicationPeriod: "2027",
} as const;

// Helper function to check if applications are still open
export function areApplicationsOpen(): boolean {
  const now = new Date();
  return now < APP_CONFIG.applicationDeadline;
}

// Helper to get time remaining until deadline
export function getTimeUntilDeadline(): {
  isOpen: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const now = new Date();
  const deadline = APP_CONFIG.applicationDeadline;
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { isOpen: false, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { isOpen: true, days, hours, minutes, seconds, totalMs: diff };
}