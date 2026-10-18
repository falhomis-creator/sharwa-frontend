import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { auctionView, findVisible } from "@/mocks/storefront/catalog";
import { parseCurrency, storeDefaultCurrency } from "@/mocks/storefront/money";

/** `[NEEDS BACKEND]` `GET /api/v1/catalog/products/<id>/auction/` (M10 US-10.4). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/auction">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/auction/`, ({ store, url }) => {
    const p = findVisible(store, Number(id));
    const currency = parseCurrency(url.searchParams.get("currency"), storeDefaultCurrency(store));
    const view = p ? auctionView(store, p, currency) : null;
    return view ? mockJson(view) : mockJson({ detail: "لا يوجد مزاد على هذا المنتج." }, { status: 404 });
  });
}
