import "server-only";
import { connection } from "next/server";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { isMocksOn } from "@/mocks/runtime";
import { trackOrder } from "@/mocks/storefront/tracking";
import { TrackingSchema, type Tracking } from "@/features/tracking/schemas";

/**
 * First render of the tracking page. NOT cached (an order changes; the page then polls the
 * BFF row every 60 s while a shipment moves). Django first (INT-015); the fixture answers
 * only when the route is missing or Django is unreachable.
 */
export async function getTracking(store: string, storeHost: string, uuid: string): Promise<Tracking | null> {
  await connection();
  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/orders/track/${encodeURIComponent(uuid)}/`, {
      headers: { accept: "application/json", "x-store-domain": storeHost },
      cache: "no-store",
    });
    if (res.ok) {
      const parsed = TrackingSchema.safeParse(await res.json());
      return parsed.success ? parsed.data : null;
    }
    if (res.status !== 404 && res.status !== 405 && res.status !== 501) return null;
  } catch {
    // unreachable → fixture below
  }
  if (!isMocksOn()) return null;
  const data = trackOrder(store, uuid);
  return data ? TrackingSchema.parse(data) : null;
}
