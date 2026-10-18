import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { offers } from "@/mocks/storefront/catalog";

/** `[NEEDS BACKEND]` `GET /api/v1/catalog/offers/` — the `promotional_offers` section (M09 §7). */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/catalog/offers/", ({ store }) => mockJson(offers(store)));
}
