/**
 * Deterministic Arabic fixtures for mocks. Seeded PRNG → stable screenshots.
 * Money is PRE-FORMATTED here because that is what Django does (`display_*`);
 * the UI must never format currency itself.
 */
export type Currency = "SAR" | "USD" | "YER_OLD" | "YER_NEW";

export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

export function int(rnd: () => number, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

export const FIRST_NAMES = [
  "محمد",
  "أحمد",
  "فاطمة",
  "سارة",
  "خالد",
  "نورة",
  "عبدالله",
  "ريم",
  "علي",
  "هند",
  "يوسف",
  "لمى",
  "عمر",
  "مريم",
  "سلطان",
] as const;

export const LAST_NAMES = [
  "العمري",
  "الشهري",
  "الحربي",
  "القحطاني",
  "الزهراني",
  "المطيري",
  "الغامدي",
  "الدوسري",
  "باوزير",
  "الحضرمي",
  "الصنعاني",
  "العدني",
] as const;

export const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "صنعاء", "عدن", "تعز", "حضرموت"] as const;

export const PRODUCT_NAMES = [
  "عباية كلاسيك سوداء",
  "عطر عود ملكي 50مل",
  "سماعة لاسلكية",
  "حقيبة جلد طبيعي",
  "ساعة ذكية",
  "ثوب قطن صيفي",
  "قهوة عربية مطحونة 500غ",
  "تمر سكري فاخر 1كغ",
  "شماغ أحمر",
  "نعال جلد",
  "كريم ترطيب طبيعي",
  "مبخرة سيراميك",
  "طقم فناجين",
  "جوال بحافظة",
  "كتاب تطوير الذات",
  "حذاء رياضي",
  "نظارة شمسية",
  "مصباح مكتبي",
] as const;

export function fullName(rnd: () => number): string {
  return `${pick(rnd, FIRST_NAMES)} ${pick(rnd, LAST_NAMES)}`;
}

/** Yemeni/Saudi-looking international numbers without `+` (as stored by Django). */
export function phone(rnd: () => number): string {
  const prefix = rnd() < 0.6 ? "9677" : "9665";
  return `${prefix}${int(rnd, 10_000_000, 99_999_999)}`;
}

const CURRENCY_SUFFIX: Record<Currency, string> = {
  SAR: "ر.س",
  USD: "$",
  YER_OLD: "ر.ي",
  YER_NEW: "ر.ي",
};

/** Mirrors Django `format_money()`: western digits, thousands separators, 2 decimals, NBSP + suffix. */
export function displayMoney(amount: number, currency: Currency = "SAR"): string {
  const n = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n} ${CURRENCY_SUFFIX[currency]}`;
}

export function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date(Date.UTC(2026, 9, 17, hour, 0, 0));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function sku(rnd: () => number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "SHW-";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(rnd() * chars.length)];
  return out;
}
