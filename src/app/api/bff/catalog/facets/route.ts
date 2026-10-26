import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { facets } from "@/mocks/storefront/catalog";

/** `GET /api/v1/catalog/facets/?category=` → brands/tags/collections with counts (M09 §7). Django-first since INT-011; fixture only on 404/unreachable. */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/catalog/facets/", ({ store, url }) => mockJson(facets(store, url.searchParams)));
}
