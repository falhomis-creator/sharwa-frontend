import type { MockResult, MockRouteContext } from "@/lib/bff/mock-route";
import { bad, createRouter, forbidden, notFound, ok, paginate, type RouteCtx } from "@/mocks/procurement/kit";
import {
  FEED_EXTENSIONS,
  FEED_FIELDS,
  applyRuleNow,
  approveFeed,
  attentionTotal,
  categoriesOf,
  connect,
  connectionView,
  createFeed,
  createRule,
  deleteRule,
  disconnect,
  dropState,
  feedErrorsCsv,
  feedView,
  getFeed,
  getJob,
  importProducts,
  isCode,
  jobCsv,
  jobView,
  listCatalog,
  listConnections,
  listJobs,
  listOrders,
  listRules,
  patchFeed,
  patchRule,
  previewFeed,
  resubmitOrder,
  retryJob,
  rotateWebhook,
  runFeed,
  saveMapping,
  saveSettings,
  simulateRule,
  syncInventory,
  type SupplierCode,
} from "@/mocks/dropshipping/state";

/**
 * Mock server for `/api/v1/dropshipping/*` (M29 §7, `[NEEDS BACKEND]`; jobs partly Ready
 * upstream as JSON views). Gates: plan feature `dropshipping`, then
 * `channels.dropshipping.manage` (FR-29.01).
 */
const { on, dispatch } = createRouter();
const send = <T,>(r: MockResult<T>) => (r.ok ? ok(r.data, r.status ?? 200) : bad(r.body, r.status));
const code = (c: RouteCtx): SupplierCode | null => (isCode(c.params.code ?? "") ? (c.params.code as SupplierCode) : null);
const withCode = (fn: (c: RouteCtx, code: SupplierCode) => Promise<Response> | Response) => (c: RouteCtx) => {
  const k = code(c);
  return k ? fn(c, k) : notFound("المورد");
};
const csv = (name: string, text: string) =>
  new Response(`﻿${text}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "x-sharwa-mock": "1" } });

on("GET", "meta", () => ok({ feed_fields: FEED_FIELDS.map(({ key, required }) => ({ key, required })), feed_extensions: FEED_EXTENSIONS }, 200, 40));
on("GET", "suppliers", (c) => ok({ results: listConnections(c.store), attention_total: attentionTotal(c.store) }));
on("GET", "suppliers/:code", withCode((c, k) => ok({ ...connectionView(c.store, dropState(c.store).conns[k]), categories: categoriesOf(c.store, k) })));
on("POST", "suppliers/:code/connect", withCode(async (c, k) => send(connect(c.store, k, await c.body()))));
on("POST", "suppliers/:code/disconnect", withCode((c, k) => ok(disconnect(c.store, k))));
on("GET", "suppliers/:code/settings", withCode((c, k) => ok(dropState(c.store).conns[k].settings)));
on("PUT", "suppliers/:code/settings", withCode(async (c, k) => send(saveSettings(c.store, k, await c.body()))));
on("POST", "suppliers/:code/sync-inventory", withCode((c, k) => send(syncInventory(c.store, k))));
on("POST", "suppliers/:code/webhook/rotate", withCode((c, k) => send(rotateWebhook(c.store, k, c.url.host))));
on("GET", "suppliers/:code/catalog", withCode((c, k) => ok(paginate(listCatalog(c.store, k, c.url.searchParams), c.url, 24))));
on("POST", "suppliers/:code/import", withCode(async (c, k) => send(importProducts(c.store, k, await c.body()))));

on("GET", "pricing-rules", (c) => ok(listRules(c.store)));
on("POST", "pricing-rules", async (c) => send(createRule(c.store, await c.body())));
on("POST", "pricing-rules/simulate", async (c) => send(simulateRule(c.store, await c.body())));
on("PATCH", "pricing-rules/:id", async (c) => send(patchRule(c.store, Number(c.params.id), await c.body())));
on("DELETE", "pricing-rules/:id", (c) => send(deleteRule(c.store, Number(c.params.id))));
on("POST", "pricing-rules/:id/apply", (c) => send(applyRuleNow(c.store, Number(c.params.id))));

on("GET", "feeds", (c) => ok(dropState(c.store).feeds.map((f) => feedView(c.store, f))));
on("POST", "feeds", async (c) => send(await createFeed(c.store, c.request)));
on("GET", "feeds/:id", (c) => {
  const f = getFeed(c.store, Number(c.params.id));
  return f ? ok(feedView(c.store, f)) : notFound("الملف");
});
on("PATCH", "feeds/:id", async (c) => send(patchFeed(c.store, Number(c.params.id), await c.body())));
on("PUT", "feeds/:id/mapping", async (c) => send(saveMapping(c.store, Number(c.params.id), await c.body())));
on("GET", "feeds/:id/preview", (c) => send(previewFeed(c.store, Number(c.params.id))));
on("POST", "feeds/:id/approve", (c) => send(approveFeed(c.store, Number(c.params.id))));
on("POST", "feeds/:id/run", (c) => send(runFeed(c.store, Number(c.params.id))));
on("GET", "feeds/:id/errors.csv", (c) => {
  const text = feedErrorsCsv(c.store, Number(c.params.id));
  return text ? csv(`feed-${c.params.id}-errors.csv`, text) : notFound("ملف الأخطاء");
});

on("GET", "orders", (c) => ok(paginate(listOrders(c.store, c.url.searchParams), c.url, Number(c.url.searchParams.get("page_size") ?? 20) || 20)));
on("POST", "orders/:id/resubmit", (c) => send(resubmitOrder(c.store, Number(c.params.id))));

on("GET", "jobs", (c) => ok(paginate(listJobs(c.store, c.url.searchParams), c.url)));
on("GET", "jobs/:id", (c) => {
  const j = getJob(c.store, Number(c.params.id));
  return j ? ok(jobView(j), 200, 60) : notFound("المهمة");
});
on("POST", "jobs/:id/retry", (c) => send(retryJob(c.store, Number(c.params.id))));
on("GET", "jobs/:id/errors.csv", (c) => {
  const j = getJob(c.store, Number(c.params.id));
  return j && j.errors.length ? csv(`dropship-job-${j.id}-errors.csv`, jobCsv(j)) : notFound("ملف الأخطاء");
});

export function dropshippingMock(request: Request, segments: string[], ctx: MockRouteContext) {
  if (!ctx.session.features.includes("dropshipping")) return bad({ detail: "ميزة الدروبشيبينغ غير مفعّلة في خطتك." }, 403);
  if (ctx.session.kind !== "merchant" && !(ctx.session.staff?.permissions ?? []).includes("channels.dropshipping.manage")) return forbidden();
  return dispatch(request, segments, ctx);
}
