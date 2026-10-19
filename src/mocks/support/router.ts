import type { MockRouteContext } from "@/lib/bff/mock-route";
import { hasPermission } from "@/lib/access";
import { mockJson } from "@/mocks/runtime";
import { aiFlags } from "@/mocks/apps/state";
import { createRouter, num, send } from "@/mocks/inbox/route-kit";
import {
  assignees,
  createTicket,
  findSession,
  getTicket,
  listSessions,
  listTickets,
  patchTicket,
  resetSupport,
  sessionAction,
  sessionCounters,
  sessionDetail,
  sessionReply,
  simulateSession,
  ticketCountersView,
} from "@/mocks/support/state";

/**
 * The mock SERVER for `/api/v1/support/*` (M31 §7 sessions, M32 §7 tickets — all
 * `[NEEDS BACKEND]`). Reading is open to every authenticated member (FR-32.01); the
 * takeover / release / close / reply rows need `support.takeover_session` (FR-31.05).
 */
const r = createRouter();
const canTakeover = (ctx: MockRouteContext) => hasPermission({ kind: ctx.session.kind, features: ctx.session.features, permissions: ctx.session.staff?.permissions }, "support.takeover_session");
const NO_TAKEOVER = { detail: "ليست لديك صلاحية استلام جلسات الدعم." };

r.on("GET", "sessions", (ctx) => mockJson({ ...listSessions(ctx.store, ctx.url.searchParams, ctx.viewer), ai: aiFlags(ctx.store) }, { delay: 160 }));
r.on("GET", "sessions/counters", (ctx) => mockJson(sessionCounters(ctx.store, ctx.viewer), { delay: 60 }));
r.on("GET", "sessions/:id", (ctx) => {
  const s = findSession(ctx.store, num(ctx.params.id));
  if (!s) return mockJson({ detail: "الجلسة غير موجودة." }, { status: 404 });
  const after = ctx.url.searchParams.get("after");
  return mockJson({ ...sessionDetail(ctx.store, s, ctx.viewer, after && /^\d+$/.test(after) ? Number(after) : null), can_takeover: canTakeover(ctx), ai: aiFlags(ctx.store) }, { delay: after ? 60 : 140 });
});
for (const action of ["takeover", "release", "close"] as const) {
  r.on("POST", `sessions/:id/${action}`, async (ctx) => (canTakeover(ctx) ? send(sessionAction(ctx.store, num(ctx.params.id), action, await ctx.obj(), ctx.viewer), 220) : mockJson(NO_TAKEOVER, { status: 403 })));
}
r.on("POST", "sessions/:id/messages", async (ctx) => (canTakeover(ctx) ? send(sessionReply(ctx.store, num(ctx.params.id), await ctx.obj(), ctx.viewer), 220) : mockJson(NO_TAKEOVER, { status: 403 })));

r.on("GET", "tickets", (ctx) => mockJson(listTickets(ctx.store, ctx.url.searchParams, ctx.viewer), { delay: 160 }));
r.on("GET", "tickets/counters", (ctx) => mockJson(ticketCountersView(ctx.store), { delay: 60 }));
r.on("POST", "tickets", async (ctx) => send(createTicket(ctx.store, await ctx.obj(), ctx.viewer), 220));
r.on("GET", "tickets/:id", (ctx) => {
  const t = getTicket(ctx.store, num(ctx.params.id));
  return t ? mockJson(t, { delay: 120 }) : mockJson({ detail: "التذكرة غير موجودة." }, { status: 404 });
});
r.on("PATCH", "tickets/:id", async (ctx) => send(patchTicket(ctx.store, num(ctx.params.id), await ctx.obj()), 180));
// Mock-only: the assignee list (M18's `GET /api/v1/staff/?is_active=true` in the real
// contract — that row needs `staff.view`, which a ticket author may not hold).
r.on("GET", "assignees", (ctx) => mockJson(assignees(ctx.store), { delay: 80 }));
r.on("POST", "_mock/new-session", (ctx) => mockJson({ id: simulateSession(ctx.store) }));
r.on("POST", "_mock/reset", (ctx) => {
  resetSupport(ctx.store);
  return mockJson({ ok: true });
});

export async function supportMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  return r.dispatch(request, segments, ctx);
}
