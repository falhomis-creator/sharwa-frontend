import { hasPermission, type PermissionKey } from "@/lib/access";
import type { MockResult } from "@/lib/bff/mock-route";
import type { UpstreamContext } from "@/lib/bff/upstream";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import type { Session } from "@/features/dashboard-shell/schemas";
import { registerPassthroughMock } from "@/mocks/passthrough";
import { mockJson } from "@/mocks/runtime";
import { createReturn, createRma, decideReturn, getReturn, listReturns, qaDecision, returnableItems, returnDetail, scanRma, simulateConcurrentEdit } from "@/mocks/returns/state";

/**
 * Passthrough fixtures for the READY M24 rows (§7): `/api/v1/returns/*` and
 * `/api/v1/warehouse/returns/*`. They answer only while Django is unreachable or 404s —
 * a real Django answer always wins (`app/api/v1/[...path]/route.ts`). Same gates as the
 * DRF views: the merchant session (401), then `orders.process_returns` (403); the two
 * warehouse rows also accept `inventory.adjust` (أمين المخزن).
 */
/** Mock-only marker: this browser already met the contended fixture's concurrent edit. */
const CONTENDED_COOKIE = "sharwa_mock_contended";

async function gate(req: Request, ctx: UpstreamContext, perms: PermissionKey[]): Promise<Session | Response> {
  const session = await sessionFromRequest(req, { store: ctx.store, storeHost: storeHostFor(ctx.store, ctx.storeHost) });
  if (!session) return mockJson({ detail: "لم تُقدَّم بيانات الاعتماد." }, { status: 401 });
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
  if (!session.features.includes("refunds")) return mockJson({ detail: "ميزة المرتجعات غير مفعّلة في خطتك." }, { status: 403 });
  if (!perms.some((p) => hasPermission(subject, p))) return mockJson({ detail: "ليست لديك صلاحية لتنفيذ هذا الإجراء." }, { status: 403 });
  return session;
}

const actorOf = (s: Session) => (s.kind === "merchant" ? "مالك المتجر" : (s.staff?.full_name ?? "موظف"));

function send<T>(result: MockResult<T>) {
  return result.ok ? mockJson(result.data, { status: result.status ?? 200, delay: 160 }) : mockJson(result.body, { status: result.status, delay: 120 });
}

async function json(req: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await req.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const idAt = (url: URL, fromEnd: number) => Number(url.pathname.split("/").filter(Boolean).at(-fromEnd));

// GET list (?status&q&page, DRF 20) · POST create
registerPassthroughMock("returns/", async (req, ctx, url) => {
  if (!ctx.store) return undefined;
  const s = await gate(req, ctx, ["orders.process_returns"]);
  if (s instanceof Response) return s;
  if (req.method === "GET") return send(listReturns(ctx.store, url.searchParams));
  if (req.method === "POST") return send(createReturn(ctx.store, await json(req), actorOf(s)));
  return mockJson({ detail: `الطريقة «${req.method}» غير مسموحة.` }, { status: 405 });
});

// GET detail
registerPassthroughMock(/^returns\/\d+\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "GET") return undefined;
  const s = await gate(req, ctx, ["orders.process_returns"]);
  if (s instanceof Response) return s;
  const r = getReturn(ctx.store, idAt(url, 1));
  return r ? mockJson(returnDetail(ctx.store, r), { delay: 140 }) : mockJson({ detail: "طلب الإرجاع غير موجود." }, { status: 404 });
});

// GET returnable items of an order
registerPassthroughMock(/^returns\/order\/\d+\/items\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "GET") return undefined;
  const s = await gate(req, ctx, ["orders.process_returns"]);
  if (s instanceof Response) return s;
  return send(returnableItems(ctx.store, idAt(url, 2)));
});

// POST approve / reject
registerPassthroughMock(/^returns\/\d+\/approve\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const s = await gate(req, ctx, ["orders.process_returns"]);
  if (s instanceof Response) return s;
  const id = idAt(url, 2);
  const body = await json(req);
  // Fixture concurrency (see state.ts): a browser not yet marked meets a concurrent edit once.
  const marked = (req.headers.get("cookie") ?? "").split(";").some((c) => c.trim() === `${CONTENDED_COOKIE}=${id}`);
  const contended = !marked && simulateConcurrentEdit(ctx.store, id, Number(body.version));
  const result = decideReturn(ctx.store, id, body, actorOf(s));
  if (contended && !result.ok) {
    return mockJson(result.body, { status: result.status, delay: 120, headers: { "set-cookie": `${CONTENDED_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600` } });
  }
  return send(result);
});

// POST RMA create
registerPassthroughMock("returns/rma/create/", async (req, ctx) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const s = await gate(req, ctx, ["orders.process_returns"]);
  if (s instanceof Response) return s;
  return send(createRma(ctx.store, await json(req), actorOf(s)));
});

// POST warehouse scan
registerPassthroughMock("warehouse/returns/scan/", async (req, ctx) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const s = await gate(req, ctx, ["orders.process_returns", "inventory.adjust"]);
  if (s instanceof Response) return s;
  return send(scanRma(ctx.store, await json(req), actorOf(s)));
});

// POST QA decision
registerPassthroughMock(/^warehouse\/returns\/\d+\/qa-decision\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const s = await gate(req, ctx, ["orders.process_returns", "inventory.adjust"]);
  if (s instanceof Response) return s;
  return send(qaDecision(ctx.store, idAt(url, 2), await json(req), actorOf(s)));
});
