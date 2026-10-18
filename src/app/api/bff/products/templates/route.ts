import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createTemplate, listTemplates } from "@/mocks/catalog/dictionary";

/** `GET/POST /api/v1/product-templates/` — merchant blueprints (US-04.6). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listTemplates(store), { delay: 150 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(createTemplate(store, await readBody(request)));
  });
}
