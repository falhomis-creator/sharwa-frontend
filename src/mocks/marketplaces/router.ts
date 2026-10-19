import type { MockResult, MockRouteContext } from "@/lib/bff/mock-route";
import { bad, createRouter, forbidden, notFound, ok, paginate, type RouteCtx } from "@/mocks/procurement/kit";
import {
  confirmShipment,
  connectAmazon,
  connectNoon,
  disconnect,
  getJob,
  hubView,
  isMarket,
  jobCsv,
  jobView,
  listJobs,
  listListings,
  listMarketOrders,
  patchListing,
  pushListings,
  saveSettings,
  settingsView,
  triggerJob,
  type Market,
} from "@/mocks/marketplaces/state";

/**
 * Mock server for `/api/v1/marketplaces/*` (M28 §7, `[NEEDS BACKEND]`). Gates: the plan
 * feature `marketplaces` (403 «غير مفعّلة») then `channels.marketplaces.manage` (FR-28.01).
 * Amazon OAuth is a server redirect (Ready upstream): `GET …/amazon/oauth/start` answers
 * 302 back to the hub with `?connected=amazon`.
 */
const { on, dispatch } = createRouter();
const send = <T,>(r: MockResult<T>) => (r.ok ? ok(r.data, r.status ?? 200) : bad(r.body, r.status));
const market = (c: RouteCtx): Market | null => (isMarket(c.params.market ?? "") ? (c.params.market as Market) : null);

on("GET", "", (c) => ok(hubView(c.store)));
on("GET", "amazon/oauth/start", (c) => {
  connectAmazon(c.store);
  return new Response(null, { status: 302, headers: { location: "/dashboard/channels/marketplaces?connected=amazon", "x-sharwa-mock": "1" } });
});
on("POST", "noon/connect", async (c) => send(connectNoon(c.store, await c.body())));
on("POST", ":market/disconnect", (c) => {
  const m = market(c);
  return m ? send(disconnect(c.store, m)) : notFound("السوق");
});
on("GET", ":market/settings", (c) => {
  const m = market(c);
  return m ? ok(settingsView(c.store, m)) : notFound("السوق");
});
on("PUT", ":market/settings", async (c) => {
  const m = market(c);
  return m ? send(saveSettings(c.store, m, await c.body())) : notFound("السوق");
});
on("GET", ":market/listings", (c) => {
  const m = market(c);
  return m ? ok(paginate(listListings(c.store, m, c.url.searchParams), c.url, 25)) : notFound("السوق");
});
on("PATCH", ":market/listings/:id", async (c) => {
  const m = market(c);
  return m ? send(patchListing(c.store, m, Number(c.params.id), await c.body())) : notFound("السوق");
});
on("POST", ":market/listings/push", async (c) => {
  const m = market(c);
  return m ? send(pushListings(c.store, m, await c.body(), c.actor)) : notFound("السوق");
});
on("POST", ":market/jobs", async (c) => {
  const m = market(c);
  return m ? send(triggerJob(c.store, m, await c.body(), c.actor)) : notFound("السوق");
});
on("GET", "jobs", (c) => ok(paginate(listJobs(c.store, c.url.searchParams), c.url)));
on("GET", "jobs/:id", (c) => {
  const j = getJob(c.store, Number(c.params.id));
  return j ? ok(jobView(j), 200, 80) : notFound("المهمة");
});
on("GET", "jobs/:id/errors.csv", (c) => {
  const j = getJob(c.store, Number(c.params.id));
  if (!j || !j.error_count) return notFound("ملف الأخطاء");
  if (j.csv_expired) return bad({ detail: "انتهت صلاحية ملف الأخطاء." }, 410);
  return new Response(`﻿${jobCsv(j)}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="marketplace-job-${j.id}-errors.csv"`, "x-sharwa-mock": "1" },
  });
});
on("GET", "orders", (c) => ok(paginate(listMarketOrders(c.store, c.url.searchParams), c.url)));
on("POST", "orders/:id/confirm-shipment", (c) => send(confirmShipment(c.store, Number(c.params.id), c.actor)));

export function marketplacesMock(request: Request, segments: string[], ctx: MockRouteContext) {
  if (!ctx.session.features.includes("marketplaces")) return bad({ detail: "ميزة الأسواق الإلكترونية غير مفعّلة في خطتك." }, 403);
  const subject = { kind: ctx.session.kind, permissions: ctx.session.staff?.permissions ?? [] };
  if (subject.kind !== "merchant" && !subject.permissions.includes("channels.marketplaces.manage")) return forbidden();
  return dispatch(request, segments, ctx);
}
