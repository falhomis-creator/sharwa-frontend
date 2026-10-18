import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/schemas/money";

/**
 * The visitor's DISPLAY preference for currency (FR-09.07 «تُحفظ محلياً كتفضيل عرض فقط»).
 * Not an identity and not authoritative: the Django session pins the cart's currency via
 * `GET /api/v1/cart/?currency=`; this cookie only lets the first server render of the next
 * page use the same currency before any request reaches the cart.
 */
export const CURRENCY_COOKIE = "sharwa_currency";

/** Short labels for the switcher (M09 US-09.3.1). */
export const CURRENCY_SHORT: Record<Currency, string> = {
  SAR: "ر.س",
  USD: "$",
  YER_OLD: "ر.ي صنعاء",
  YER_NEW: "ر.ي عدن",
};

export { CURRENCIES, CURRENCY_LABELS };
export type { Currency };
