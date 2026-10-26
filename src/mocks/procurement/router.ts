import type { MockRouteContext } from "@/lib/bff/mock-route";
import type { MockResult } from "@/lib/bff/mock-route";
import { createRouter, bad, forbidden, notFound, ok, paginate, type RouteCtx } from "@/mocks/procurement/kit";
import {
  cancelPo,
  createPo,
  createSupplier,
  deleteSupplier,
  formOptions,
  getPo,
  listPurchaseOrders,
  listSuppliers,
  poDetail,
  procurementState,
  receivePo,
  resolvePo,
  searchLineProducts,
  submitPo,
  supplierView,
  updatePo,
  updateSupplier,
} from "@/mocks/procurement/state";

/**
 * Mock server for `/api/v1/suppliers/*` and `/api/v1/purchase-orders/*` (M23 §7; live provider
 * Django `api/views_procurement.py`, INT-035). Two catch-all BFF routes feed it the path AFTER `/api/bff/`, so
 * the first segment is the resource. Gates: read needs `suppliers.manage` OR
 * `suppliers.approve` (FR-23.01); writes need `suppliers.manage`; a decision needs
 * `suppliers.approve`.
 */
const { on, dispatch } = createRouter();

function send<T>(r: MockResult<T>) {
  return r.ok ? ok(r.data, r.status ?? 200) : bad(r.body, r.status);
}

const canRead = (c: RouteCtx) => c.can("suppliers.manage") || c.can("suppliers.approve");
const id = (c: RouteCtx) => Number(c.params.id);
const requester = (c: RouteCtx) => ({ id: c.session.kind === "merchant" ? null : 2, name: c.actor });

// ── suppliers ─────────────────────────────────────────────────────────────────────
on("GET", "suppliers", (c) => {
  if (!canRead(c)) return forbidden();
  return ok(paginate(listSuppliers(c.store, c.url.searchParams), c.url));
});
on("POST", "suppliers", async (c) => (c.can("suppliers.manage") ? send(createSupplier(c.store, await c.body())) : forbidden()));
on("GET", "suppliers/:id", (c) => {
  if (!canRead(c)) return forbidden();
  const s = procurementState(c.store).suppliers.find((x) => x.id === id(c));
  return s ? ok(supplierView(c.store, s)) : notFound("المورد");
});
on("PATCH", "suppliers/:id", async (c) => (c.can("suppliers.manage") ? send(updateSupplier(c.store, id(c), await c.body())) : forbidden()));
on("DELETE", "suppliers/:id", (c) => (c.can("suppliers.manage") ? send(deleteSupplier(c.store, id(c))) : forbidden()));

// ── purchase orders ──────────────────────────────────────────────────────────────
on("GET", "purchase-orders", (c) => {
  if (!canRead(c)) return forbidden();
  return ok(paginate(listPurchaseOrders(c.store, c.url.searchParams), c.url, Number(c.url.searchParams.get("page_size") ?? 20) || 20));
});
on("GET", "purchase-orders/form-options", (c) => (canRead(c) ? ok(formOptions(c.store), 200, 80) : forbidden()));
on("GET", "purchase-orders/products", (c) => (canRead(c) ? ok(searchLineProducts(c.store, c.url.searchParams.get("q") ?? ""), 200, 120) : forbidden()));
on("POST", "purchase-orders", async (c) => (c.can("suppliers.manage") ? send(createPo(c.store, await c.body(), c.actor)) : forbidden()));
on("GET", "purchase-orders/:id", (c) => {
  if (!canRead(c)) return forbidden();
  const o = getPo(c.store, id(c));
  return o ? ok(poDetail(c.store, o)) : notFound("أمر الشراء");
});
on("PATCH", "purchase-orders/:id", async (c) => (c.can("suppliers.manage") ? send(updatePo(c.store, id(c), await c.body(), c.actor)) : forbidden()));
on("POST", "purchase-orders/:id/submit", async (c) => (c.can("suppliers.manage") ? send(submitPo(c.store, id(c), await c.body(), requester(c))) : forbidden()));
on("POST", "purchase-orders/:id/resolve", async (c) =>
  c.can("suppliers.approve") ? send(resolvePo(c.store, id(c), await c.body(), c.actor)) : forbidden("الاعتماد لمن يحمل صلاحية اعتماد المشتريات."),
);
on("POST", "purchase-orders/:id/receive", async (c) => (c.can("suppliers.manage") ? send(receivePo(c.store, id(c), await c.body(), c.actor)) : forbidden()));
on("POST", "purchase-orders/:id/cancel", async (c) => (c.can("suppliers.manage") ? send(cancelPo(c.store, id(c), await c.body(), c.actor)) : forbidden()));

export function procurementMock(request: Request, segments: string[], ctx: MockRouteContext) {
  return dispatch(request, segments, ctx);
}
