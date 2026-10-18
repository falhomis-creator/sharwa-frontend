import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createAttribute, listAttributes } from "@/mocks/catalog/dictionary";

/** `GET/POST /api/v1/variant-attributes/` — the store's attribute dictionary (`variant_hub`). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listAttributes(store), { delay: 150 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(createAttribute(store, await readBody(request)));
  });
}
