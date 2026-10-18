import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { storeTag } from "@/lib/cache";
import { isMocksOn } from "@/mocks/runtime";
import { storefrontConfig } from "@/mocks/storefront/config";
import { StoreConfigSchema, type StoreConfig } from "@/features/storefront/schemas/config";
import { StorefrontUnavailableError, getPublicJson } from "@/features/storefront/api/upstream";

/**
 * `GET /api/v1/config/` for rendering (ready-api-v1 #1). Cached per store in minutes and
 * tagged `store:<store>` (research R-02): `store` is an explicit argument so two tenants can
 * never share an entry (constitution VIII). The M47 guard in the group layout still probes
 * uncached for the real 404/403/503 status; this read is the content.
 *
 * Failures THROW (an error is never cached), so a brief Django outage cannot pin an empty
 * store for minutes; the group's `error.tsx` offers a retry.
 */
export async function getStoreConfig(store: string, storeHost: string): Promise<StoreConfig> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeTag(store));

  const res = await getPublicJson("/api/v1/config/", storeHost);
  if (res && res.status === 200) {
    const parsed = StoreConfigSchema.safeParse(res.data);
    if (parsed.success) return parsed.data;
    console.error(`[storefront] /config/ payload for ${storeHost} did not match the contract`);
    throw new StorefrontUnavailableError("/api/v1/config/", 502);
  }
  if ((!res || res.isMockable) && isMocksOn()) {
    const fixture = storefrontConfig(store, storeHost);
    if (fixture) return StoreConfigSchema.parse(fixture);
  }
  throw new StorefrontUnavailableError("/api/v1/config/", res?.status ?? 502);
}
