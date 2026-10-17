/**
 * Formatting helpers (constitution II). NO currency formatting here — money arrives
 * pre-formatted from the server (`display_*`) and is rendered by `<Money>`.
 */

const DATE_LOCALE = "ar";

export interface DateFormatOptions {
  timeZone?: string;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
}

export function formatDate(iso: string | Date, opts: DateFormatOptions = {}): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    numberingSystem: "latn",
    timeZone: opts.timeZone,
    dateStyle: opts.dateStyle ?? "medium",
    timeStyle: opts.timeStyle,
  }).format(d);
}

export function formatDateTime(iso: string | Date, timeZone?: string): string {
  return formatDate(iso, { timeZone, dateStyle: "medium", timeStyle: "short" });
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

export function formatRelative(iso: string | Date, now: Date = new Date()): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  // `ar-u-nu-latn` forces western digits (RelativeTimeFormatOptions has no numberingSystem field in TS lib)
  const rtf = new Intl.RelativeTimeFormat(`${DATE_LOCALE}-u-nu-latn`, { numeric: "auto" });
  for (const [unit, secs] of RELATIVE_STEPS) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return rtf.format(diffSec, "second");
}

/** Integer/decimal counts (NOT money): western digits with locale thousands separators. */
export function formatNumber(n: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(n);
}

/** Arabic-Indic → Western digits (for user input). */
export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalize a Yemeni/Saudi phone to the backend's international form without `+`
 * (`0770841802` → `967770841802`, `0501234567` → `966501234567`, `+966…` → `966…`).
 */
export function normalizePhone(input: string, defaultCountry: "967" | "966" = "967"): string {
  let digits = toWesternDigits(input).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("967") || digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `${defaultCountry}${digits}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)}•••••${phone.slice(-3)}`;
}

/** Display an international number as the user wrote it, grouped, LTR-safe (wrap in `<Ltr>`). */
export function prettyPhone(phone: string): string {
  const m = /^(967|966)(\d{3})(\d{3})(\d{3,4})$/.exec(phone);
  if (!m) return phone;
  return `+${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
