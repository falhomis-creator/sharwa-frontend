import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { trackOrder } from "@/mocks/storefront/tracking";

/**
 * `[NEEDS BACKEND]` `GET /api/v1/orders/track/<public_uuid>/` (M41 §7) — no authentication,
 * the UUID is the only key. Unknown or other-store UUIDs get the same 404 (US-41.5).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/orders/track/[uuid]">) {
  const { uuid } = await params;
  return storefrontAdapter(request, `/api/v1/orders/track/${encodeURIComponent(uuid)}/`, ({ store }) => {
    const data = trackOrder(store, uuid);
    return data ? mockJson(data, { delay: 120 }) : mockJson({ detail: "لم نجد هذا الطلب." }, { status: 404 });
  });
}
