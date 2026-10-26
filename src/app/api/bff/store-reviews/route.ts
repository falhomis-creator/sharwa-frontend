import { respondMock, storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { addStoreReview, storeReviewsView } from "@/mocks/engagement/state";

/** Live (INT-029, Django `api/views_engagement.py`): `GET/POST /api/v1/store-reviews/` — `StoreReview` (M42 US-42.6). */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/store-reviews/", ({ store }) => mockJson(storeReviewsView(store), { delay: 100 }));
}

export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/store-reviews/", async ({ store, body }) => {
    const { fields } = await body();
    return respondMock(addStoreReview(store, fields), 200);
  });
}
