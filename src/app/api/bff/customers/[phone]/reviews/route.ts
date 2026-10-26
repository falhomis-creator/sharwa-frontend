import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { reviewsTab } from "@/mocks/customers/state";

/** `GET /api/v1/customers/<phone>/reviews/` → the customer's `ProductReview` rows with `admin_reply`. */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/reviews">) {
  const { phone } = await params;
  const p = encodeURIComponent(decodeURIComponent(phone));
  return liveOrMock(request, "customers", `/api/v1/customers/${p}/reviews/`, () =>
    mockRoute(request, ({ store }) => mockJson(reviewsTab(store, decodeURIComponent(phone)), { delay: 150 }), { permission: "customers.view" }),
  );
}
