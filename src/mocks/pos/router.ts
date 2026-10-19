import type { MockResult, MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import {
  actorOf,
  addMovement,
  closeShift,
  createPosOrder,
  currentShift,
  getReceipt,
  listReceipts,
  listRegisters,
  openShift,
  pendingShifts,
  posContext,
  quote,
  refundReceipt,
  requestDiscountApproval,
  resetPosState,
  resolveVariance,
  searchProducts,
} from "@/mocks/pos/state";

/**
 * The mock SERVER for `/api/v1/pos/*` (M16 §7 — every row `[NEEDS BACKEND]`), behind the
 * catch-all `src/app/api/bff/pos/[...path]`. The session gate (401) runs in `mockRoute`
 * first; the POS has no plan feature key, so access is the session + the M22 assignment.
 */
type Body = Record<string, unknown>;
type Actor = ReturnType<typeof actorOf>;
interface Ctx {
  request: Request;
  route: MockRouteContext;
  actor: Actor;
  params: Record<string, string>;
  body: () => Promise<Body>;
  key: string | null;
}
type Handler = (ctx: Ctx) => Promise<Response> | Response;

const routes: Array<{ method: string; pattern: string[]; handle: Handler }> = [];
function on(method: string, path: string, handle: Handler) {
  routes.push({ method, pattern: path.split("/"), handle });
}

function match(pattern: string[], segs: string[]): Record<string, string> | null {
  if (pattern.length !== segs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]!;
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(segs[i]!);
    else if (p !== segs[i]) return null;
  }
  return params;
}

function send<T>(result: MockResult<T>, delay = 140) {
  return result.ok ? mockJson(result.data, { status: result.status ?? 200, delay }) : mockJson(result.body, { status: result.status, delay: 100 });
}

const id = (c: Ctx) => Number(c.params.id);

// Mock-only (no Django row): reset this store's POS fixtures; owner session only.
on("POST", "__reset", (c) => {
  if (c.route.session.kind !== "merchant") return mockJson({ detail: "غير مسموح." }, { status: 403 });
  resetPosState(c.route.store);
  return mockJson(null);
});
on("GET", "context", (c) => mockJson(posContext(c.route.store, c.actor), { delay: 80 }));
on("GET", "registers", (c) => send(listRegisters(c.route.store, c.actor, c.route.url.searchParams)));
on("GET", "shifts/current", (c) => mockJson(currentShift(c.route.store, c.actor), { delay: 100 }));
on("GET", "shifts/pending", (c) => mockJson(pendingShifts(c.route.store, c.actor), { delay: 100 }));
on("POST", "shifts", async (c) => send(openShift(c.route.store, c.actor, await c.body())));
on("POST", "shifts/:id/movements", async (c) => send(addMovement(c.route.store, c.actor, id(c), await c.body(), c.key)));
on("POST", "shifts/:id/close", async (c) => send<unknown>(closeShift(c.route.store, c.actor, id(c), await c.body())));
on("POST", "shifts/:id/resolve-variance", async (c) => send(resolveVariance(c.route.store, c.actor, id(c), await c.body())));
// Search is the hot path (SC-16.1: scan → line ≤ 300ms) — no simulated latency.
on("GET", "products", (c) => mockJson(searchProducts(c.route.store, c.route.url.searchParams)));
on("POST", "quote", async (c) => mockJson(quote(c.route.store, c.actor, await c.body()), { delay: 60 }));
on("POST", "discount-approvals", async (c) => send(requestDiscountApproval(c.route.store, c.actor, await c.body())));
on("GET", "orders", (c) => mockJson(listReceipts(c.route.store, c.actor, c.route.url.searchParams), { delay: 120 }));
on("POST", "orders", async (c) => send(createPosOrder(c.route.store, c.actor, await c.body(), c.key), 220));
on("GET", "orders/:id", (c) => {
  const r = getReceipt(c.route.store, id(c));
  return r ? mockJson(r, { delay: 100 }) : mockJson({ detail: "الإيصال غير موجود." }, { status: 404 });
});
on("POST", "orders/:id/refund", async (c) => send(refundReceipt(c.route.store, c.actor, id(c), await c.body(), c.key)));

export async function posMock(request: Request, path: string[], route: MockRouteContext): Promise<Response> {
  const segs = path.filter(Boolean);
  const actor = actorOf(route.store, route.session);
  let parsed: Body | undefined;
  const body = async () => {
    if (parsed) return parsed;
    try {
      const data: unknown = await request.json();
      parsed = data && typeof data === "object" && !Array.isArray(data) ? (data as Body) : {};
    } catch {
      parsed = {};
    }
    return parsed;
  };
  const headerKey = request.headers.get("idempotency-key");
  for (const r of routes) {
    if (r.method !== request.method) continue;
    const params = match(r.pattern, segs);
    if (!params) continue;
    const ctx: Ctx = { request, route, actor, params, body, key: headerKey };
    if (!headerKey && request.method === "POST") {
      const b = await body();
      ctx.key = typeof b.idempotency_key === "string" && b.idempotency_key ? b.idempotency_key : null;
    }
    return r.handle(ctx);
  }
  return mockJson({ detail: "غير موجود." }, { status: 404 });
}
