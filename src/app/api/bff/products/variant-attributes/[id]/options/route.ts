import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createOption, listAttributes } from "@/mocks/catalog/dictionary";

/** `GET/POST /api/v1/variant-attributes/<id>/options/` — values typed by the attribute's `data_type`. */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/products/variant-attributes/[id]/options">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(listAttributes(store).find((a) => a.id === id)?.options ?? []));
}

export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/variant-attributes/[id]/options">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(createOption(store, id, await readBody(request)));
  });
}
