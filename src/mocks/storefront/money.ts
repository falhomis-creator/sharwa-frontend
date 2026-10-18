import { CURRENCIES, type Currency } from "@/lib/schemas/money";
import { displayMoney } from "@/mocks/_fixtures";
import { readSettings } from "@/mocks/settings/state";

/**
 * Currency conversion the way Django does it server-side (`_convert_value_to_target`
 * with the store's `StoreSetting` rates, M34): the mock is the server here, so it is the
 * only place in the frontend tree allowed to do money arithmetic. Everything it returns
 * to the UI is a formatted `display_*` string.
 */
export interface Rates {
  usd_to_sar: number;
  sar_to_yer_old: number;
  sar_to_yer_new: number;
}

export function storeRates(store: string | null, storeHost = ""): Rates {
  const s = readSettings(store, storeHost);
  return {
    usd_to_sar: Number(s.usd_to_sar),
    sar_to_yer_old: Number(s.sar_to_yer_old),
    sar_to_yer_new: Number(s.sar_to_yer_new),
  };
}

export function storeDefaultCurrency(store: string | null): Currency {
  return readSettings(store, "").currency;
}

export function toSar(amount: number, from: Currency, r: Rates): number {
  switch (from) {
    case "SAR":
      return amount;
    case "USD":
      return amount * r.usd_to_sar;
    case "YER_OLD":
      return amount / r.sar_to_yer_old;
    case "YER_NEW":
      return amount / r.sar_to_yer_new;
  }
}

export function fromSar(amountSar: number, to: Currency, r: Rates): number {
  switch (to) {
    case "SAR":
      return amountSar;
    case "USD":
      return amountSar / r.usd_to_sar;
    case "YER_OLD":
      return amountSar * r.sar_to_yer_old;
    case "YER_NEW":
      return amountSar * r.sar_to_yer_new;
  }
}

/** Round like a stored Decimal(…, 2). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function convert(amount: number, from: Currency, to: Currency, r: Rates): number {
  if (from === to) return round2(amount);
  return round2(fromSar(toSar(amount, from, r), to, r));
}

export function fmt(amount: number, currency: Currency): string {
  return displayMoney(round2(amount), currency);
}

export function parseCurrency(value: unknown, fallback: Currency): Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value) ? (value as Currency) : fallback;
}
