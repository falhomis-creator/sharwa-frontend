import { hasPermission, type PermissionKey } from "@/lib/access";
import type { MockResult } from "@/lib/bff/mock-route";
import type { UpstreamContext } from "@/lib/bff/upstream";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import type { Session } from "@/features/dashboard-shell/schemas";
import { registerPassthroughMock } from "@/mocks/passthrough";
import { mockJson } from "@/mocks/runtime";
import { sessionActor } from "@/mocks/staff/state";
import { createDraft, listDrafts, resolveDraft } from "@/mocks/b2b/state";

/**
 * Passthrough fixtures for the READY M36 rows (§7) — they answer only while Django is
 * unreachable or 404s; a real Django answer always wins (`app/api/v1/[...path]/route.ts`).
 * Same gates as the DRF views: session (401) → permission (403); creating needs a STAFF
 * login (the owner without a staff account gets the view's own 403 sentence).
 */
async function gate(req: Request, ctx: UpstreamContext, perms: PermissionKey[]): Promise<Session | Response> {
  const session = await sessionFromRequest(req, { store: ctx.store, storeHost: storeHostFor(ctx.store, ctx.storeHost) });
  if (!session) return mockJson({ detail: "لم تُقدَّم بيانات الاعتماد." }, { status: 401 });
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
  if (!perms.some((p) => hasPermission(subject, p))) return mockJson({ detail: "ليست لديك صلاحية لتنفيذ هذا الإجراء." }, { status: 403 });
  return session;
}

function send<T>(result: MockResult<T>) {
  return result.ok ? mockJson(result.data, { status: result.status ?? 200, delay: 180 }) : mockJson(result.body, { status: result.status, delay: 120 });
}

async function json(req: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await req.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// POST create a draft (orders.create_b2b, staff only)
registerPassthroughMock("orders/b2b-draft/", async (req, ctx) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const s = await gate(req, ctx, ["orders.create_b2b"]);
  if (s instanceof Response) return s;
  if (s.kind !== "staff") return mockJson({ detail: "يتطلب إنشاء طلب الجملة تسجيل دخول موظف." }, { status: 403 });
  return send(createDraft(ctx.store, await json(req), sessionActor(ctx.store, s)));
});

// GET the pending drafts
registerPassthroughMock("orders/b2b-drafts/", async (req, ctx) => {
  if (!ctx.store || req.method !== "GET") return undefined;
  const s = await gate(req, ctx, ["orders.create_b2b", "orders.approve_b2b"]);
  if (s instanceof Response) return s;
  return mockJson(listDrafts(ctx.store), { delay: 160 });
});

// POST resolve {decision, version} (orders.approve_b2b; no self-approval)
registerPassthroughMock(/^orders\/b2b-draft\/\d+\/resolve\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const s = await gate(req, ctx, ["orders.approve_b2b"]);
  if (s instanceof Response) return s;
  const id = Number(url.pathname.split("/").filter(Boolean).at(-2));
  return send(resolveDraft(ctx.store, id, await json(req), sessionActor(ctx.store, s)));
});
