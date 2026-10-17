import { z } from "zod";

export const CURRENCIES = ["SAR", "USD", "YER_OLD", "YER_NEW"] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

export const CURRENCY_LABELS: Record<Currency, string> = {
  SAR: "ريال سعودي",
  USD: "دولار أمريكي",
  YER_OLD: "ريال يمني (صنعاء)",
  YER_NEW: "ريال يمني (عدن)",
};

/** Server-formatted amount, e.g. "1,250.00 ر.س". Never parsed, never re-formatted. */
export const displayMoney = z.string();

/** Decimal amount as text for inputs/payloads ("1250.00"); never a float. */
export const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "أدخل مبلغاً صحيحاً (مثال: 1250.00)");
