import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { wishlistTab } from "@/mocks/customers/state";

/** `GET /api/v1/customers/<phone>/wishlist/` → `[{product, added_at, back_in_stock_requested}]` (M42 rows by phone). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/wishlist">) {
  const { phone } = await params;
  const p = encodeURIComponent(decodeURIComponent(phone));
  return liveOrMock(request, "customers", `/api/v1/customers/${p}/wishlist/`, () =>
    mockRoute(request, ({ store }) => mockJson(wishlistTab(store, decodeURIComponent(phone)), { delay: 150 }), { permission: "customers.view" }),
  );
}
