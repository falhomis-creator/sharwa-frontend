import type { MockRouteContext } from "@/lib/bff/mock-route";
import { isStoreOwner } from "@/lib/access";
import { mockJson } from "@/mocks/runtime";
import { createRouter, num, send } from "@/mocks/inbox/route-kit";
import {
  AI_APP,
  WHATSAPP_APP,
  aiSettings,
  aiStatus,
  appCharges,
  appDetail,
  appEvents,
  appsState,
  consoleToken,
  installApp,
  isUsable,
  listApps,
  patchTemplate,
  resetApps,
  saveAiSettings,
  templateView,
  toggleApp,
  usageList,
  usageSummary,
} from "@/mocks/apps/state";

/**
 * The mock SERVER for `/api/v1/apps/*` (M30 §7, M31 §7 — all `[NEEDS BACKEND]`). Gates:
 * the `app_marketplace` feature (FR-30.01) → writes and the AI console are the owner's →
 * the WhatsApp / AI rows need that app installed and active.
 */
const r = createRouter();
const OWNER_ONLY = { detail: "إدارة التطبيقات لمالك المتجر فقط." };
const owner = (ctx: MockRouteContext) => isStoreOwner(ctx.session);
const needs = (ctx: MockRouteContext, code: string) =>
  isUsable(ctx.store, code) ? null : mockJson({ detail: code === AI_APP ? "شروة AI غير مثبَّت أو غير مفعّل." : "تطبيق الواتساب غير مثبَّت أو غير مفعّل." }, { status: 409 });

r.on("GET", "", (ctx) => mockJson(listApps(ctx.store), { delay: 160 }));

// WhatsApp (static paths first — `whatsapp` is not an app code; the app is `whatsapp_bot`)
r.on("GET", "whatsapp/usage", (ctx) => needs(ctx, WHATSAPP_APP) ?? mockJson(usageList(ctx.store, ctx.url.searchParams), { delay: 160 }));
r.on("GET", "whatsapp/summary", (ctx) => needs(ctx, WHATSAPP_APP) ?? mockJson(usageSummary(ctx.store), { delay: 100 }));
r.on("GET", "whatsapp/templates", (ctx) => needs(ctx, WHATSAPP_APP) ?? mockJson(appsState(ctx.store).templates.map(templateView), { delay: 120 }));
r.on("GET", "whatsapp/templates/:id", (ctx) => {
  const t = appsState(ctx.store).templates.find((x) => x.id === num(ctx.params.id));
  return needs(ctx, WHATSAPP_APP) ?? (t ? mockJson(templateView(t), { delay: 100 }) : mockJson({ detail: "القالب غير موجود." }, { status: 404 }));
});
r.on("PATCH", "whatsapp/templates/:id", async (ctx) => {
  if (!owner(ctx)) return mockJson(OWNER_ONLY, { status: 403 });
  return needs(ctx, WHATSAPP_APP) ?? send(patchTemplate(ctx.store, num(ctx.params.id), await ctx.obj()));
});
r.on("GET", "whatsapp/connect-url", (ctx) => needs(ctx, WHATSAPP_APP) ?? mockJson({ url: `https://connect.sharwa.app/s/${ctx.store}?t=${Date.now().toString(36)}`, connected: true }, { delay: 120 }));

// Sharwa AI (M31)
r.on("GET", "sharwa-ai/status", (ctx) => mockJson(aiStatus(ctx.store), { delay: 80 }));
r.on("GET", "sharwa-ai/settings", (ctx) => needs(ctx, AI_APP) ?? mockJson(aiSettings(ctx.store), { delay: 100 }));
r.on("PUT", "sharwa-ai/settings", async (ctx) => {
  if (!owner(ctx)) return mockJson(OWNER_ONLY, { status: 403 });
  return needs(ctx, AI_APP) ?? send(saveAiSettings(ctx.store, await ctx.obj()));
});
r.on("POST", "sharwa-ai/console-token", (ctx) => {
  if (!owner(ctx)) return mockJson(OWNER_ONLY, { status: 403 });
  return needs(ctx, AI_APP) ?? mockJson(consoleToken(), { delay: 200 });
});

// One app
r.on("GET", ":code", (ctx) => {
  const d = appDetail(ctx.store, ctx.params.code ?? "");
  return d ? mockJson(d, { delay: 140 }) : mockJson({ detail: "التطبيق غير موجود." }, { status: 404 });
});
r.on("GET", ":code/events", (ctx) => mockJson(appEvents(ctx.store, ctx.params.code ?? ""), { delay: 100 }));
r.on("GET", ":code/charges", (ctx) => mockJson(appCharges(ctx.store, ctx.params.code ?? ""), { delay: 100 }));
for (const action of ["install", "activate", "deactivate"] as const) {
  r.on("POST", `:code/${action}`, (ctx) => {
    if (!owner(ctx)) return mockJson(OWNER_ONLY, { status: 403 });
    const code = ctx.params.code ?? "";
    return send(action === "install" ? installApp(ctx.store, code) : toggleApp(ctx.store, code, action === "activate"), 300);
  });
}
r.on("POST", "_mock/reset", (ctx) => {
  resetApps(ctx.store);
  return mockJson({ ok: true });
});

export async function appsMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  if (!ctx.session.features.includes("app_marketplace")) return mockJson({ detail: "متجر التطبيقات غير مفعّل في خطتك." }, { status: 403 });
  return r.dispatch(request, segments, ctx);
}
