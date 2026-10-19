import { canManageCatalog, forbidden, readBody, respond, type MockRouteContext } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { mockJson } from "@/mocks/runtime";
import {
  addComponent,
  addField,
  addRule,
  addSerials,
  addTier,
  bundleView,
  deleteComponent,
  deleteField,
  deleteRule,
  deleteTier,
  listFields,
  listSerials,
  listTiers,
  merchantAuction,
  merchantBids,
  patchComponent,
  patchField,
  putAuction,
  reorderFields,
  rulesView,
} from "@/mocks/product-extras/state";
import { catalog } from "@/mocks/catalog/state";

/**
 * The mock server behind `/api/bff/products/<id>/extras/*` → `/api/v1/products/<id>/*`
 * (M37 §7 + M36 tier prices, all `[NEEDS BACKEND]`). The segment after `extras/` is the
 * upstream sub-resource verbatim (`bundle-components`, `compatibility-rules`,
 * `personalization-fields`, `auction`, `serials`, `tier-prices`). Reads need
 * `inventory.view` (like the product itself); writes are the catalogue managers' (M04 §2).
 */
const isId = (s: string | undefined) => s !== undefined && /^\d+$/.test(s);

export async function productExtrasMock(request: Request, productId: number, path: string[], ctx: MockRouteContext): Promise<Response> {
  const { store, session } = ctx;
  const segs = path.filter(Boolean);
  const method = request.method;
  const write = method !== "GET";
  if (write && !canManageCatalog(session)) return forbidden();
  const p = catalog(store).products.find((x) => x.id === productId);
  if (!p) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
  const actor = actorName(session);
  const [res, sub, extra] = segs;
  const body = write && method !== "DELETE" ? await readBody(request) : {};

  switch (res) {
    case "tier-prices":
      if (!sub && method === "GET") return respond(listTiers(store, productId));
      if (!sub && method === "POST") return respond(addTier(store, productId, body, actor));
      if (isId(sub) && method === "DELETE") return respond(deleteTier(store, productId, Number(sub), actor));
      break;
    case "bundle-components":
      if (!sub && method === "GET") return respond({ ok: true, data: bundleView(store, p) });
      if (!sub && method === "POST") return respond(addComponent(store, productId, body, actor));
      if (isId(sub) && method === "PATCH") return respond(patchComponent(store, productId, Number(sub), body));
      if (isId(sub) && method === "DELETE") return respond(deleteComponent(store, productId, Number(sub), actor));
      break;
    case "compatibility-rules":
      if (!sub && method === "GET") return respond({ ok: true, data: rulesView(store, p) });
      if (!sub && method === "POST") return respond(addRule(store, productId, body, actor));
      if (isId(sub) && method === "DELETE") return respond(deleteRule(store, productId, Number(sub)));
      break;
    case "personalization-fields":
      if (!sub && method === "GET") return respond(listFields(store, productId));
      if (!sub && method === "POST") return respond(addField(store, productId, body, actor));
      if (sub === "reorder" && method === "POST") return respond(reorderFields(store, productId, body));
      if (isId(sub) && method === "PATCH") return respond(patchField(store, productId, Number(sub), body));
      if (isId(sub) && method === "DELETE") return respond(deleteField(store, productId, Number(sub), actor));
      break;
    case "auction":
      if (!sub && method === "GET") return respond(merchantAuction(store, productId));
      if (!sub && method === "PUT") return respond(putAuction(store, productId, body, actor));
      if (sub === "bids" && !extra && method === "GET") return respond(merchantBids(store, productId));
      break;
    case "serials":
      if (!sub && method === "GET") return respond(listSerials(store, productId));
      if (!sub && method === "POST") return respond(addSerials(store, productId, body, actor));
      break;
  }
  return mockJson({ detail: "غير موجود." }, { status: 404 });
}
