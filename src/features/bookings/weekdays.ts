/**
 * The ONE place that converts between how days are SHOWN and how the backend STORES them
 * (M26 FR-26.02, discovery 02 §16.4). Django's `ServiceAvailability.weekday` is Python's
 * `date.weekday()`: 0 = Monday … 6 = Sunday. JavaScript's `Date#getDay()` is 0 = Sunday.
 * Nothing outside this file may do weekday arithmetic; `scripts/bookings-check.ts` asserts
 * all 7 days × both week starts (SC-26.2).
 */
export const WEEK_STARTS = ["sunday", "monday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

/** Backend weekday (0 = Monday) → Arabic name. */
export const BACKEND_WEEKDAY_LABELS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"] as const;

/** JS `getDay()` (0 = Sunday) → backend weekday (0 = Monday). */
export function jsDayToBackend(jsDay: number): number {
  return (((jsDay + 6) % 7) + 7) % 7;
}

/** Backend weekday (0 = Monday) → JS `getDay()` (0 = Sunday). */
export function backendToJsDay(backend: number): number {
  return (backend + 1) % 7;
}

/** Backend weekday of a calendar date `YYYY-MM-DD` (the date is a wall-clock day, no zone). */
export function backendWeekdayOf(date: string): number {
  return jsDayToBackend(new Date(`${date}T12:00:00Z`).getUTCDay());
}

/** The seven backend weekdays in the order the store's week is DISPLAYED. */
export function displayOrder(weekStart: WeekStart): number[] {
  const first = weekStart === "sunday" ? 6 : 0;
  return Array.from({ length: 7 }, (_, i) => (first + i) % 7);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First day (`YYYY-MM-DD`) of the store week that contains `date`. */
export function weekStartOf(date: string, weekStart: WeekStart): string {
  const order = displayOrder(weekStart);
  const index = order.indexOf(backendWeekdayOf(date));
  return addDays(date, -index);
}

/** `YYYY-MM-DD` of an instant on the wall clock of `timeZone`. */
export function zonedDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

/** Minutes past midnight of an instant on the wall clock of `timeZone`. */
export function zonedMinutes(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ms);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
