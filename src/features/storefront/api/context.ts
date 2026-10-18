import "server-only";
import { cookies } from "next/headers";
import { CURRENCIES, type Currency } from "@/lib/schemas/money";
import { requestIdentity, type RequestIdentity } from "@/features/tenant/request";
import { getStoreConfig } from "@/features/storefront/api/config";
import type { StoreConfig } from "@/features/storefront/schemas/config";
import { CURRENCY_COOKIE } from "@/features/storefront/currency";

/**
 * Everything a storefront page needs before its own data: the tenant (from the proxy
 * header — never from the URL), the cached config, and the display currency.
 *
 * Currency precedence (M09 US-09.3.1, FR-09.07): `?currency=` in the URL, then the visitor's
 * display preference cookie, then the store default. The Django session stays the source of
 * truth for the CART; product reads pass the currency explicitly so the cached entries are
 * per currency, never per visitor.
 */
export interface StorefrontContext extends RequestIdentity {
  config: StoreConfig;
  currency: Currency;
}

export function asCurrency(value: unknown): Currency | null {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value) ? (value as Currency) : null;
}

export async function getStorefront(urlCurrency?: string | string[] | null): Promise<StorefrontContext> {
  const [identity, jar] = await Promise.all([requestIdentity(), cookies()]);
  const config = await getStoreConfig(identity.store, identity.storeHost);
  const fromUrl = asCurrency(Array.isArray(urlCurrency) ? urlCurrency[0] : urlCurrency);
  const fromCookie = asCurrency(jar.get(CURRENCY_COOKIE)?.value);
  return { ...identity, config, currency: fromUrl ?? fromCookie ?? config.currency ?? "SAR" };
}
