import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { trackOrder } from "@/mocks/storefront/tracking";

/**
 * `GET /api/v1/orders/track/<public_uuid>/` (M41 §7) — served by Django since INT-015
 * (`api/views_tracking.py` over `products/services/order_tracking_service.py`). No
 * authentication, the UUID is the only key. Unknown or other-store UUIDs get the same 404
 * (US-41.5). The fixture answers only while Django is down (storefront `target → mock`).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/orders/track/[uuid]">) {
  const { uuid } = await params;
  return storefrontAdapter(request, `/api/v1/orders/track/${encodeURIComponent(uuid)}/`, ({ store }) => {
    const data = trackOrder(store, uuid);
    return data ? mockJson(data, { delay: 120 }) : mockJson({ detail: "لم نجد هذا الطلب." }, { status: 404 });
  });
}
