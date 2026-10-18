import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { publicOrder } from "@/mocks/storefront/checkout";

/** `[NEEDS BACKEND]` `GET /api/v1/orders/public/<public_uuid>/` — success page and gateway return (M12 §7). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/orders/public/[uuid]">) {
  const { uuid } = await params;
  return storefrontAdapter(request, `/api/v1/orders/public/${encodeURIComponent(uuid)}/`, ({ store }) => {
    const data = publicOrder(store, uuid);
    return data ? mockJson(data, { delay: 120 }) : mockJson({ detail: "لم نجد هذا الطلب." }, { status: 404 });
  });
}
