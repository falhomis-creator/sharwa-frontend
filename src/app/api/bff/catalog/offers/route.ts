import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { offers } from "@/mocks/storefront/catalog";

/** `GET /api/v1/catalog/offers/` — the `promotional_offers` section (M09 §7). Django-first since INT-011; fixture only on 404/unreachable. */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/catalog/offers/", ({ store }) => mockJson(offers(store)));
}
