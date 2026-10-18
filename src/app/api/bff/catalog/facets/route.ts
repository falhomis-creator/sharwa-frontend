import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { facets } from "@/mocks/storefront/catalog";

/** `[NEEDS BACKEND]` `GET /api/v1/catalog/facets/?category=` → brands/tags/collections with counts (M09 §7). */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/catalog/facets/", ({ store, url }) => mockJson(facets(store, url.searchParams)));
}
