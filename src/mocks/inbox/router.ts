import type { MockRouteContext } from "@/lib/bff/mock-route";
import { hasPermission, isStoreOwner } from "@/lib/access";
import { mockJson } from "@/mocks/runtime";
import { createRouter, num, send } from "@/mocks/inbox/route-kit";
import {
  TIKTOK_CATEGORIES,
  accessView,
  channelsView,
  completeOAuth,
  connectTelegram,
  conversationDetail,
  convertToOrder,
  disconnect,
  findConversation,
  inboxState,
  inboxUnread,
  keywordView,
  listConversations,
  listMessages,
  mappingView,
  patchConversation,
  pickProducts,
  resetInbox,
  resyncProduct,
  runSync,
  saveAccess,
  saveKeyword,
  saveMapping,
  saveSync,
  saveTemplate,
  sendMessage,
  simulateInbound,
  syncProducts,
  syncView,
  canView,
  connectionOf,
} from "@/mocks/inbox/state";

/**
 * The mock SERVER for `/api/v1/inbox/*` and `/api/v1/channels/*` (M27 §7, all
 * `[NEEDS BACKEND]`). Gates: the `social_channels` feature (FR-27.01) → the inbox needs
 * `channels.inbox.access`; channel settings are the owner's (FR-27.01) except the template
 * list, which every inbox member reads for the `/` picker.
 */
const FEATURE_OFF = { detail: "ميزة قنوات التواصل غير مفعّلة في خطتك." };
const FORBIDDEN = { detail: "ليست لديك صلاحية لهذا الإجراء." };
const OWNER_ONLY = { detail: "إعدادات القنوات لمالك المتجر فقط." };

const inbox = createRouter();
const channels = createRouter();

const inboxAllowed = (ctx: MockRouteContext) => hasPermission({ kind: ctx.session.kind, features: ctx.session.features, permissions: ctx.session.staff?.permissions }, "channels.inbox.access");

// ── inbox ────────────────────────────────────────────────────────────────────────────
inbox.on("GET", "counters", (ctx) => mockJson({ unread: inboxUnread(ctx.store, ctx.viewer) }, { delay: 80 }));
inbox.on("GET", "conversations", (ctx) => mockJson(listConversations(ctx.store, ctx.url.searchParams, ctx.viewer), { delay: 180 }));
inbox.on("GET", "conversations/:id", (ctx) => {
  const c = findConversation(ctx.store, num(ctx.params.id));
  if (!c || !canView(ctx.store, ctx.viewer, connectionOf(c.channel_code))) return mockJson({ detail: "المحادثة غير موجودة." }, { status: 404 });
  return mockJson(conversationDetail(ctx.store, c, ctx.viewer), { delay: 140 });
});
inbox.on("PATCH", "conversations/:id", async (ctx) => send(patchConversation(ctx.store, num(ctx.params.id), await ctx.obj(), ctx.viewer)));
inbox.on("GET", "conversations/:id/messages", (ctx) => {
  const c = findConversation(ctx.store, num(ctx.params.id));
  if (!c || !canView(ctx.store, ctx.viewer, connectionOf(c.channel_code))) return mockJson({ detail: "المحادثة غير موجودة." }, { status: 404 });
  const after = ctx.url.searchParams.get("after");
  return mockJson(listMessages(ctx.store, c.id, after && /^\d+$/.test(after) ? Number(after) : null), { delay: after ? 60 : 160 });
});
inbox.on("POST", "conversations/:id/messages", async (ctx) => send(sendMessage(ctx.store, num(ctx.params.id), await ctx.obj(), ctx.viewer), 260));
inbox.on("POST", "conversations/:id/convert-to-order", async (ctx) => send(convertToOrder(ctx.store, num(ctx.params.id), await ctx.obj(), ctx.viewer), 300));
// Mock-only helpers: the product picker, a simulated inbound webhook, and the check reset.
inbox.on("GET", "products", (ctx) => mockJson(pickProducts(ctx.store, ctx.url.searchParams.get("q") ?? ""), { delay: 120 }));
inbox.on("POST", "_mock/inbound", async (ctx) => {
  const b = await ctx.obj();
  return send(simulateInbound(ctx.store, Number(b.conversation_id), String(b.text ?? "")), 40);
});
inbox.on("POST", "_mock/reset", (ctx) => {
  resetInbox(ctx.store);
  return mockJson({ ok: true });
});

export async function inboxMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  if (!ctx.session.features.includes("social_channels")) return mockJson(FEATURE_OFF, { status: 403 });
  if (!inboxAllowed(ctx)) return mockJson(FORBIDDEN, { status: 403 });
  return inbox.dispatch(request, segments, ctx);
}

// ── channels ─────────────────────────────────────────────────────────────────────────
const SYNC = new Set(["meta", "tiktok"]);
const syncCode = (s: string | undefined) => (SYNC.has(s ?? "") ? (s as "meta" | "tiktok") : null);

channels.on("GET", "", (ctx) => mockJson(channelsView(ctx.store), { delay: 140 }));
channels.on("GET", ":code/oauth/start", (ctx) => {
  const code = ctx.params.code;
  if (code !== "meta" && code !== "tiktok") return mockJson({ detail: "هذه القناة لا تُربط عبر OAuth." }, { status: 404 });
  // The real row is Django's OAuth start → provider → callback → 302 back to the page.
  completeOAuth(ctx.store, code);
  return new Response(null, { status: 302, headers: { location: `/dashboard/channels/social?connected=${code}`, "x-sharwa-mock": "1" } });
});
channels.on("POST", "telegram/connect", async (ctx) => send(connectTelegram(ctx.store, await ctx.obj()), 400));
channels.on("POST", ":code/disconnect", (ctx) => send(disconnect(ctx.store, ctx.params.code ?? "")));
channels.on("GET", "keywords", (ctx) => mockJson(inboxState(ctx.store).keywords.map((k) => keywordView(ctx.store, k)), { delay: 120 }));
channels.on("POST", "keywords", async (ctx) => send(saveKeyword(ctx.store, null, await ctx.obj())));
channels.on("PATCH", "keywords/:id", async (ctx) => send(saveKeyword(ctx.store, num(ctx.params.id), await ctx.obj())));
channels.on("DELETE", "keywords/:id", (ctx) => {
  const st = inboxState(ctx.store);
  const before = st.keywords.length;
  st.keywords = st.keywords.filter((k) => k.id !== num(ctx.params.id));
  return before === st.keywords.length ? mockJson({ detail: "المحفّز غير موجود." }, { status: 404 }) : mockJson(null, { status: 204 });
});
channels.on("GET", "templates", (ctx) => mockJson(inboxState(ctx.store).templates, { delay: 100 }));
channels.on("POST", "templates", async (ctx) => send(saveTemplate(ctx.store, null, await ctx.obj())));
channels.on("PATCH", "templates/:id", async (ctx) => send(saveTemplate(ctx.store, num(ctx.params.id), await ctx.obj())));
channels.on("DELETE", "templates/:id", (ctx) => {
  const st = inboxState(ctx.store);
  const before = st.templates.length;
  st.templates = st.templates.filter((t) => t.id !== num(ctx.params.id));
  return before === st.templates.length ? mockJson({ detail: "القالب غير موجود." }, { status: 404 }) : mockJson(null, { status: 204 });
});
channels.on("GET", ":code/catalog-sync", (ctx) => {
  const code = syncCode(ctx.params.code);
  return code ? mockJson(syncView(ctx.store, code), { delay: 140 }) : mockJson({ detail: "لا مزامنة كتالوج لهذه القناة." }, { status: 404 });
});
channels.on("PUT", ":code/catalog-sync", async (ctx) => {
  const code = syncCode(ctx.params.code);
  return code ? send(saveSync(ctx.store, code, await ctx.obj())) : mockJson({ detail: "لا مزامنة كتالوج لهذه القناة." }, { status: 404 });
});
channels.on("POST", ":code/catalog-sync/run", (ctx) => {
  const code = syncCode(ctx.params.code);
  return code ? send(runSync(ctx.store, code), 700) : mockJson({ detail: "لا مزامنة كتالوج لهذه القناة." }, { status: 404 });
});
channels.on("GET", ":code/products", (ctx) => {
  const code = syncCode(ctx.params.code);
  return code ? mockJson(syncProducts(ctx.store, code, ctx.url.searchParams), { delay: 160 }) : mockJson({ detail: "غير موجود." }, { status: 404 });
});
channels.on("POST", ":code/products/:id/resync", (ctx) => {
  const code = syncCode(ctx.params.code);
  return code ? send(resyncProduct(ctx.store, code, num(ctx.params.id))) : mockJson({ detail: "غير موجود." }, { status: 404 });
});
channels.on("GET", "tiktok/categories", () => mockJson(TIKTOK_CATEGORIES, { delay: 80 }));
channels.on("GET", "tiktok/category-mapping", (ctx) => mockJson(mappingView(ctx.store), { delay: 120 }));
channels.on("PUT", "tiktok/category-mapping", async (ctx) => send(saveMapping(ctx.store, await ctx.body())));
channels.on("GET", "staff-access", (ctx) => mockJson(accessView(ctx.store), { delay: 120 }));
channels.on("PUT", "staff-access", async (ctx) => send(saveAccess(ctx.store, await ctx.body()), 120));

export async function channelsMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  if (!ctx.session.features.includes("social_channels")) return mockJson(FEATURE_OFF, { status: 403 });
  const segs = segments.filter(Boolean);
  // The `/` template picker is read by every inbox member; the rest is the owner's.
  const templateRead = request.method === "GET" && segs.length === 1 && segs[0] === "templates";
  if (templateRead ? !inboxAllowed(ctx) && !isStoreOwner(ctx.session) : !isStoreOwner(ctx.session)) return mockJson(OWNER_ONLY, { status: 403 });
  return channels.dispatch(request, segs, ctx);
}
