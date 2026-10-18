/**
 * Date-range helpers for the report control bar (M25 US-25.2, FR-25.03). Dates are plain
 * ISO days (`YYYY-MM-DD`) — the server reads them in `StoreSetting.timezone` (§8) — and
 * "today" is the UTC day on both server and client so the first render hydrates cleanly.
 */
export const PRESETS = ["today", "7d", "30d", "month", "custom"] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_LABELS: Record<Preset, string> = {
  today: "اليوم",
  "7d": "7 أيام",
  "30d": "30 يوماً",
  month: "هذا الشهر",
  custom: "مخصص",
};
export const MAX_RANGE_DAYS = 366;

const DAY = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDay(v: string): boolean {
  return ISO.test(v) && !Number.isNaN(toMs(v));
}

export function addDays(day: string, n: number): string {
  return fromMs(toMs(day) + n * DAY);
}

export function presetRange(preset: Exclude<Preset, "custom">, today = todayIso()): { from: string; to: string } {
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: addDays(today, -6), to: today };
  if (preset === "30d") return { from: addDays(today, -29), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

export function presetOf(from: string, to: string, today = todayIso()): Preset {
  for (const p of ["today", "7d", "30d", "month"] as const) {
    const r = presetRange(p, today);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}

/** Inclusive length in days (0 when invalid). */
export function rangeDays(from: string, to: string): number {
  if (!isIsoDay(from) || !isIsoDay(to)) return 0;
  return Math.round((toMs(to) - toMs(from)) / DAY) + 1;
}

/** The previous period of the same length, ending the day before `from`. */
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const len = rangeDays(from, to);
  const cTo = addDays(from, -1);
  return { from: addDays(cTo, -(len - 1)), to: cTo };
}

export type RangeProblem = "invalid" | "reversed" | "too_long" | null;

export function rangeProblem(from: string, to: string): RangeProblem {
  if (!isIsoDay(from) || !isIsoDay(to)) return "invalid";
  if (toMs(to) < toMs(from)) return "reversed";
  if (rangeDays(from, to) > MAX_RANGE_DAYS) return "too_long";
  return null;
}

export const RANGE_PROBLEM_TEXT: Record<Exclude<RangeProblem, null>, string> = {
  invalid: "اختر تاريخي البداية والنهاية.",
  reversed: "تاريخ النهاية قبل البداية.",
  too_long: "الحد الأقصى سنة واحدة — قلّص النطاق أو صدّره كاملاً.",
};

/** Arabic short date for range labels and chart ticks (`Intl.DateTimeFormat('ar')`, western digits). */
export function shortDay(day: string): string {
  if (!isIsoDay(day)) return day;
  return new Intl.DateTimeFormat("ar", { numberingSystem: "latn", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(toMs(day)));
}

export function longDay(day: string): string {
  if (!isIsoDay(day)) return day;
  return new Intl.DateTimeFormat("ar", { numberingSystem: "latn", dateStyle: "medium", timeZone: "UTC" }).format(new Date(toMs(day)));
}
