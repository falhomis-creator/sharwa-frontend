import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney, int, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { seedOf, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { createOrder, getOrder } from "@/mocks/orders/state";
import { staffState } from "@/mocks/staff/state";

/**
 * M27 mock server state — channel connections, the unified inbox, keyword triggers,
 * reply templates, catalog sync, TikTok category mapping and per-staff channel access
 * (§7, every row `[NEEDS BACKEND]`). One bag per store (constitution VIII).
 *
 * Times are seeded relative to the moment the bag is created (the inbox is a live
 * surface: «منذ 3 دقائق» must read as recent in a screenshot taken today).
 */
export const CONNECTIONS = ["meta", "tiktok", "telegram"] as const;
export type ConnectionCode = (typeof CONNECTIONS)[number];
export const CONVERSATION_CHANNELS = ["facebook", "instagram", "tiktok", "telegram"] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export type ConversationStatus = "open" | "pending" | "resolved";
export type SyncStatus = "pending" | "synced" | "error" | "hidden_out_of_stock";

export function connectionOf(channel: ConversationChannel): ConnectionCode {
  return channel === "facebook" || channel === "instagram" ? "meta" : channel;
}

export interface MockConnection {
  channel_code: ConnectionCode;
  connected: boolean;
  account_name: string | null;
  error: string | null;
  connected_at: string | null;
  bot_username: string | null;
}

export interface MockMessage {
  id: number;
  conversation_id: number;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "staff" | "bot";
  sender_name: string | null;
  text: string;
  media: Array<{ url: string; type: "image" | "file" }>;
  status: "sent" | "delivered" | "read" | "failed" | null;
  error: string | null;
  product: { id: number; name: string; display_price: string } | null;
  client_id: string | null;
  created_at: string;
}

export interface MockConversation {
  id: number;
  channel_code: ConversationChannel;
  contact_name: string;
  external_contact_id: string;
  phone: string | null;
  city: string | null;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  status: ConversationStatus;
  assigned_staff: { id: number; name: string } | null;
  order_id: number | null;
  /** Meta's 24h window: the last inbound is older than 24h → outbound text fails. */
  window_closed: boolean;
}

export interface MockKeyword {
  id: number;
  keyword: string;
  match_type: "contains" | "exact";
  reply_type: "text" | "product_card" | "catalog_link";
  reply_text: string;
  product_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface MockTemplate {
  id: number;
  title: string;
  body: string;
  updated_at: string;
}

export interface MockCatalogSync {
  channel_code: "meta" | "tiktok";
  scope: "all" | "selected_categories";
  category_ids: number[];
  price_adjustment_percent: string;
  stock_shield_enabled: boolean;
  last_run_at: string | null;
}

export interface MockProductLink {
  product_id: number;
  sync_status: SyncStatus;
  error: string | null;
  synced_at: string | null;
}

export interface MockAccess {
  staff_id: number;
  channel_code: ConnectionCode;
  can_view: boolean;
  can_reply: boolean;
}

export interface InboxState {
  connections: MockConnection[];
  conversations: MockConversation[];
  messages: Map<number, MockMessage[]>;
  keywords: MockKeyword[];
  templates: MockTemplate[];
  sync: MockCatalogSync[];
  links: Record<"meta" | "tiktok", MockProductLink[]>;
  mapping: Array<{ category_id: number; external_category_id: string | null }>;
  access: MockAccess[];
  ids: { message: number; conversation: number; keyword: number; template: number };
  seededAt: number;
}

export const TIKTOK_CATEGORIES = [
  { id: "601226", name: "Womenswear & Underwear" },
  { id: "601303", name: "Menswear & Underwear" },
  { id: "602118", name: "Fashion Accessories" },
  { id: "604206", name: "Beauty & Personal Care · Fragrance" },
  { id: "601739", name: "Phones & Electronics" },
  { id: "600001", name: "Home Supplies" },
  { id: "700437", name: "Food & Beverages" },
  { id: "605248", name: "Sports & Outdoor" },
] as const;

const NAMES = ["ريم الأحمد", "عبدالله الشمري", "نوف العتيبي", "محمد باعلوي", "هيفاء السقاف", "يوسف الحداد", "أمل الكثيري", "سالم بن طالب", "لمى الزهراني", "فهد الدوسري", "رنا الصبري", "ماجد الأهدل", "دانة القرشي", "علي المقطري", "منيرة الحارثي"];
const INBOUND = [
  "السلام عليكم، هل المنتج متوفر بمقاس كبير؟",
  "كم سعر التوصيل إلى صنعاء؟",
  "أبغى أطلب نفس العطر اللي في الإعلان",
  "متى يوصل طلبي؟",
  "هل يوجد دفع عند الاستلام؟",
  "ممكن صور أكثر للمنتج؟",
  "الطلب وصلني ناقص قطعة",
  "عندكم خصم للكميات؟",
  "شكراً، وصل الطلب",
  "الأسعار",
  "أريد تغيير العنوان",
  "هل المنتج أصلي؟",
];
const OUTBOUND = [
  "وعليكم السلام، نعم متوفر بكل المقاسات.",
  "التوصيل داخل المدينة خلال 24 ساعة.",
  "تم، أرسلنا لك رابط المنتج.",
  "نعم، الدفع عند الاستلام متاح.",
  "نعتذر، سنرسل القطعة الناقصة اليوم.",
  "أهلاً بك، كيف نخدمك؟",
];
const BOT = ["مرحباً بك في المتجر! اكتب «الأسعار» لعرض الكتالوج.", "هذا رابط الكتالوج: https://noor.sharwa.app/products"];
const META_WINDOW = "لا يمكن الإرسال: انقضت نافذة الـ 24 ساعة في Meta منذ آخر رسالة من العميل — استخدم قالباً معتمداً من Meta.";

function iso(base: number, minutesAgo: number): string {
  return new Date(base - minutesAgo * 60_000).toISOString();
}

function activeStaff(store: string | null) {
  return staffState(store).staff.filter((s) => s.is_active && !s.terminated_at);
}

function seed(store: string | null): InboxState {
  const now = Date.now();
  const empty = isEmptyStore(store);
  const rnd = seeded(seedOf(store) + 27);
  const state: InboxState = {
    connections: [
      { channel_code: "meta", connected: !empty, account_name: empty ? null : "نور للعطور · Instagram + Facebook", error: null, connected_at: empty ? null : iso(now, 60 * 24 * 90), bot_username: null },
      { channel_code: "tiktok", connected: !empty, account_name: empty ? null : "noor.perfumes", error: empty ? null : "انتهت صلاحية رمز الوصول من TikTok Shop — أعد الربط لمتابعة مزامنة الكتالوج.", connected_at: empty ? null : iso(now, 60 * 24 * 40), bot_username: null },
      { channel_code: "telegram", connected: false, account_name: null, error: null, connected_at: null, bot_username: null },
    ],
    conversations: [],
    messages: new Map(),
    keywords: [],
    templates: [],
    sync: [
      { channel_code: "meta", scope: "all", category_ids: [], price_adjustment_percent: "0", stock_shield_enabled: true, last_run_at: empty ? null : iso(now, 60 * 6) },
      { channel_code: "tiktok", scope: "selected_categories", category_ids: empty ? [] : [5, 6], price_adjustment_percent: "5", stock_shield_enabled: false, last_run_at: empty ? null : iso(now, 60 * 30) },
    ],
    links: { meta: [], tiktok: [] },
    mapping: [],
    access: [],
    ids: { message: 1, conversation: 1, keyword: 1, template: 1 },
    seededAt: now,
  };
  if (empty) return state;

  const staff = activeStaff(store);
  // 100 conversations (US-27.2 acceptance 1). The first four are scripted fixtures.
  for (let i = 0; i < 100; i++) {
    const id = state.ids.conversation++;
    const channel: ConversationChannel = i === 0 || i === 2 ? "instagram" : i === 1 ? "facebook" : i === 3 ? "tiktok" : i % 17 === 5 ? "telegram" : pick(rnd, ["facebook", "instagram", "instagram", "tiktok"] as const);
    const name = i === 0 ? "ريم الأحمد" : NAMES[(i * 7) % NAMES.length]!;
    const minutesAgo = i === 0 ? 3 : i === 2 ? 60 * 30 : Math.round(i * 37 + int(rnd, 0, 30));
    const status: ConversationStatus = i === 0 || i === 1 || i === 2 || i === 3 ? "open" : i % 5 === 0 ? "resolved" : i % 7 === 0 ? "pending" : "open";
    const assignee = i === 1 ? staff.find((s) => s.id === 3) : i % 4 === 0 && i > 3 ? pick(rnd, staff) : undefined;
    const conv: MockConversation = {
      id,
      channel_code: channel,
      contact_name: name,
      external_contact_id: channel === "telegram" ? `tg:${int(rnd, 100000000, 999999999)}` : channel === "tiktok" ? `tt:${int(rnd, 70000000, 79999999)}` : channel === "facebook" ? `fb:${int(rnd, 1000000, 9999999)}` : `ig:${name === "ريم الأحمد" ? "reem.alahmad" : `user_${int(rnd, 1000, 9999)}`}`,
      phone: i === 0 ? "967771234567" : i % 3 === 0 ? `9677${int(rnd, 10000000, 79999999)}` : null,
      city: i % 3 === 0 ? pick(rnd, ["صنعاء", "عدن", "الرياض", "جدة"] as const) : null,
      last_message_preview: "",
      last_message_at: iso(now, minutesAgo),
      unread_count: i === 0 ? 3 : status === "resolved" ? 0 : i % 3 === 1 ? int(rnd, 1, 4) : 0,
      status,
      assigned_staff: assignee ? { id: assignee.id, name: assignee.full_name } : null,
      order_id: null,
      window_closed: i === 2,
    };
    state.conversations.push(conv);
    // messages, oldest first
    const msgs: MockMessage[] = [];
    const count = i === 0 ? 6 : int(rnd, 3, 9);
    for (let m = 0; m < count; m++) {
      const at = iso(now, minutesAgo + (count - m - 1) * int(rnd, 2, 25));
      const fromCustomer = m === count - 1 ? true : m % 2 === 0;
      const isBot = !fromCustomer && m === 1;
      msgs.push({
        id: state.ids.message++,
        conversation_id: id,
        direction: fromCustomer ? "inbound" : "outbound",
        sender_type: fromCustomer ? "customer" : isBot ? "bot" : "staff",
        sender_name: fromCustomer ? name : isBot ? "الرد الآلي" : (assignee?.full_name ?? "فارس العمري"),
        text: fromCustomer ? INBOUND[(i + m) % INBOUND.length]! : isBot ? BOT[m % BOT.length]! : OUTBOUND[(i + m) % OUTBOUND.length]!,
        media: fromCustomer && m === 2 && i % 6 === 0 ? [{ url: "/images/placeholder-product.svg", type: "image" }] : [],
        status: fromCustomer ? null : m < count - 2 ? "read" : "delivered",
        error: null,
        product: null,
        client_id: null,
        created_at: at,
      });
    }
    conv.last_message_preview = msgs.at(-1)!.text;
    conv.last_message_at = msgs.at(-1)!.created_at;
    state.messages.set(id, msgs);
  }
  // conversation #2 already became an order (ChannelOrderLink) — the context column shows it.
  const linked = createOrder(store, { customer_name: "عبدالله الشمري", customer_phone: "967772223344", items: [{ product_id: catalog(store).products[0]?.id ?? 1, quantity: 1 }], delivery: "delivery", address: "صنعاء — شارع حدة" }, "فارس العمري", false);
  if (linked.ok) {
    state.conversations[1]!.order_id = linked.data.id;
    state.conversations[1]!.phone = "967772223344";
  }

  state.keywords = [
    { id: state.ids.keyword++, keyword: "الأسعار", match_type: "exact", reply_type: "catalog_link", reply_text: "", product_id: null, is_active: true, created_at: iso(now, 60 * 24 * 30) },
    { id: state.ids.keyword++, keyword: "توصيل", match_type: "contains", reply_type: "text", reply_text: "التوصيل داخل المدينة خلال 24 ساعة، وخارجها 2–4 أيام.", product_id: null, is_active: true, created_at: iso(now, 60 * 24 * 20) },
    { id: state.ids.keyword++, keyword: "العرض", match_type: "contains", reply_type: "product_card", reply_text: "", product_id: catalog(store).products[1]?.id ?? null, is_active: false, created_at: iso(now, 60 * 24 * 8) },
  ];
  state.templates = [
    { id: state.ids.template++, title: "ترحيب", body: "أهلاً بك في متجر نور! كيف نقدر نخدمك اليوم؟", updated_at: iso(now, 60 * 24 * 15) },
    { id: state.ids.template++, title: "مدة التوصيل", body: "يصلك الطلب خلال 24 ساعة داخل المدينة و2–4 أيام لباقي المدن.", updated_at: iso(now, 60 * 24 * 9) },
    { id: state.ids.template++, title: "الدفع عند الاستلام", body: "نعم، الدفع عند الاستلام متاح لكل الطلبات.", updated_at: iso(now, 60 * 24 * 3) },
    { id: state.ids.template++, title: "متابعة الطلب", body: "يمكنك متابعة طلبك من الرابط المرسل في رسالة التأكيد، أو أرسل لنا رقم الطلب.", updated_at: iso(now, 60 * 5) },
  ];

  const products = catalog(store).products.filter((p) => !p.archived_at);
  for (const code of ["meta", "tiktok"] as const) state.links[code] = computeLinks(store, state, code, products.map((p) => p.id), iso(now, 60));
  const cats = catalog(store).categories;
  state.mapping = cats.map((c, idx) => ({ category_id: c.id, external_category_id: idx === 0 ? "601226" : c.name.includes("عطور") ? "604206" : c.name.includes("إلكترونيات") ? "601739" : null }));
  for (const s of staff) {
    for (const code of CONNECTIONS) {
      // منى (id 4) may read TikTok but not reply there — the read-only reply box fixture.
      state.access.push({ staff_id: s.id, channel_code: code, can_view: !(s.id === 6 && code === "telegram"), can_reply: !(s.id === 4 && code === "tiktok") && !(s.id === 6 && code === "telegram") });
    }
  }
  return state;
}

export function inboxState(store: string | null): InboxState {
  return storeState(store, "inbox", () => seed(store));
}

/** Mock-only: forget this store's inbox (the check scripts restore what they changed). */
export function resetInbox(store: string | null) {
  const fresh = seed(store);
  Object.assign(inboxState(store), fresh);
}

// ── who is asking ─────────────────────────────────────────────────────────────────────

export interface Viewer {
  owner: boolean;
  staffId: number | null;
  name: string;
}

export function canView(store: string | null, v: Viewer, code: ConnectionCode): boolean {
  if (v.owner) return true;
  const row = inboxState(store).access.find((a) => a.staff_id === v.staffId && a.channel_code === code);
  return row ? row.can_view : true;
}

export function canReply(store: string | null, v: Viewer, code: ConnectionCode): boolean {
  if (v.owner) return true;
  const row = inboxState(store).access.find((a) => a.staff_id === v.staffId && a.channel_code === code);
  return row ? row.can_reply : true;
}

/** FR-27.10 — the sidebar badge: Σ unread over the channels this member may view. */
export function inboxUnread(store: string | null, v?: Viewer): number {
  const viewer = v ?? { owner: true, staffId: null, name: "" };
  return inboxState(store)
    .conversations.filter((c) => canView(store, viewer, connectionOf(c.channel_code)))
    .reduce((n, c) => n + c.unread_count, 0);
}

// ── conversations ─────────────────────────────────────────────────────────────────────

function connected(store: string | null, code: ConnectionCode) {
  return inboxState(store).connections.find((c) => c.channel_code === code)!;
}

export function conversationView(store: string | null, c: MockConversation, v: Viewer) {
  const conn = connected(store, connectionOf(c.channel_code));
  return {
    id: c.id,
    channel_code: c.channel_code,
    contact_name: c.contact_name,
    external_contact_id: c.external_contact_id,
    last_message_preview: c.last_message_preview,
    last_message_at: c.last_message_at,
    unread_count: c.unread_count,
    status: c.status,
    assigned_staff: c.assigned_staff,
    order_id: c.order_id,
    channel_connected: conn.connected,
    can_reply: canReply(store, v, connectionOf(c.channel_code)),
  };
}

export function listConversations(store: string | null, params: URLSearchParams, v: Viewer) {
  const st = inboxState(store);
  const status = params.get("status");
  const channel = params.get("channel");
  const assigned = params.get("assigned");
  const unread = params.get("unread");
  const q = (params.get("q") ?? "").trim();
  let rows = st.conversations.filter((c) => canView(store, v, connectionOf(c.channel_code)));
  if (status) rows = rows.filter((c) => c.status === status);
  if (channel) rows = rows.filter((c) => c.channel_code === channel);
  if (assigned === "me") rows = rows.filter((c) => (v.owner ? c.assigned_staff === null : c.assigned_staff?.id === v.staffId));
  else if (assigned === "none") rows = rows.filter((c) => c.assigned_staff === null);
  else if (assigned && /^\d+$/.test(assigned)) rows = rows.filter((c) => c.assigned_staff?.id === Number(assigned));
  if (unread === "1" || unread === "true") rows = rows.filter((c) => c.unread_count > 0);
  if (q) rows = rows.filter((c) => c.contact_name.includes(q) || c.external_contact_id.includes(q) || (c.phone ?? "").includes(q.replace(/\D/g, "") || "\u0000"));
  rows = [...rows].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((c) => conversationView(store, c, v)),
  };
}

export function findConversation(store: string | null, id: number) {
  return inboxState(store).conversations.find((c) => c.id === id) ?? null;
}

/** Detail = the list row + the context column (customer + linked order). */
export function conversationDetail(store: string | null, c: MockConversation, v: Viewer) {
  const order = c.order_id ? getOrder(store, c.order_id) : null;
  return {
    ...conversationView(store, c, v),
    contact: { name: c.contact_name, phone: c.phone, city: c.city, external_contact_id: c.external_contact_id },
    order: order
      ? { id: order.id, status: order.status, status_label: order.fulfillment_status?.name ?? null, display_total: order.invoice.display_total, created_at: order.created_at }
      : c.order_id
        ? { id: c.order_id, status: "unknown", status_label: null, display_total: null, created_at: null }
        : null,
    staff: activeStaff(store).map((s) => ({ id: s.id, name: s.full_name })),
  };
}

export function messageView(m: MockMessage) {
  return { id: m.id, direction: m.direction, sender_type: m.sender_type, sender_name: m.sender_name, text: m.text, media: m.media, status: m.status, error: m.error, product: m.product, client_id: m.client_id, created_at: m.created_at };
}

export function listMessages(store: string | null, id: number, after: number | null) {
  const msgs = inboxState(store).messages.get(id) ?? [];
  return (after ? msgs.filter((m) => m.id > after) : msgs).map(messageView);
}

export function patchConversation(store: string | null, id: number, body: Record<string, unknown>, v: Viewer): MockResult<ReturnType<typeof conversationView>> {
  const c = findConversation(store, id);
  if (!c) return { ok: false, status: 404, body: { detail: "المحادثة غير موجودة." } };
  if (!canView(store, v, connectionOf(c.channel_code))) return { ok: false, status: 403, body: { detail: "لا تملك صلاحية عرض هذه القناة." } };
  if (body.status !== undefined) {
    if (!["open", "pending", "resolved"].includes(String(body.status))) return { ok: false, status: 400, body: { status: ["حالة غير صحيحة."] } };
    c.status = body.status as ConversationStatus;
  }
  if (body.assigned_staff_id !== undefined) {
    if (body.assigned_staff_id === null || body.assigned_staff_id === "") c.assigned_staff = null;
    else {
      const s = activeStaff(store).find((x) => x.id === Number(body.assigned_staff_id));
      if (!s) return { ok: false, status: 400, body: { assigned_staff_id: ["الموظف غير موجود أو غير نشط."] } };
      c.assigned_staff = { id: s.id, name: s.full_name };
    }
  }
  if (body.mark_read) c.unread_count = 0;
  return { ok: true, data: conversationView(store, c, v) };
}

export function sendMessage(store: string | null, id: number, body: Record<string, unknown>, v: Viewer): MockResult<ReturnType<typeof messageView>> {
  const st = inboxState(store);
  const c = findConversation(store, id);
  if (!c) return { ok: false, status: 404, body: { detail: "المحادثة غير موجودة." } };
  const code = connectionOf(c.channel_code);
  if (!connected(store, code).connected) return { ok: false, status: 409, body: { detail: "القناة غير مربوطة — لا يمكن الردّ." } };
  if (!canReply(store, v, code)) return { ok: false, status: 403, body: { detail: "لا تملك صلاحية الردّ على هذه القناة." } };
  const clientId = typeof body.client_id === "string" ? body.client_id : null;
  const msgs = st.messages.get(id) ?? [];
  const dup = clientId ? msgs.find((m) => m.client_id === clientId) : undefined;
  if (dup) return { ok: true, status: 200, data: messageView(dup) };
  let text = typeof body.text === "string" ? body.text.trim() : "";
  let product: MockMessage["product"] = null;
  if (body.template_id) {
    const t = st.templates.find((x) => x.id === Number(body.template_id));
    if (!t) return { ok: false, status: 400, body: { template_id: ["القالب غير موجود."] } };
    if (!text) text = t.body;
  }
  if (body.product_id) {
    const p = catalog(store).products.find((x) => x.id === Number(body.product_id));
    if (!p) return { ok: false, status: 400, body: { product_id: ["المنتج غير موجود."] } };
    product = { id: p.id, name: p.name, display_price: displayMoney(Number(p.price), p.currency) };
  }
  if (!text && !product) return { ok: false, status: 400, body: { text: ["اكتب رداً أو اختر منتجاً."] } };
  if (text.length > 2000) return { ok: false, status: 400, body: { text: ["الرسالة أطول من 2000 حرف."] } };
  const failed = c.window_closed && !body.template_id;
  const msg: MockMessage = {
    id: st.ids.message++,
    conversation_id: id,
    direction: "outbound",
    sender_type: "staff",
    sender_name: v.name,
    text,
    media: [],
    status: failed ? "failed" : "sent",
    error: failed ? META_WINDOW : null,
    product,
    client_id: clientId,
    created_at: new Date().toISOString(),
  };
  msgs.push(msg);
  st.messages.set(id, msgs);
  c.last_message_preview = product && !text ? `منتج: ${product.name}` : text;
  c.last_message_at = msg.created_at;
  c.unread_count = 0;
  // A delivered receipt arrives a moment later (the poll picks it up).
  if (!failed) setTimeout(() => (msg.status = "delivered"), 2500).unref?.();
  return { ok: true, status: 201, data: messageView(msg) };
}

/** Mock-only: a customer writes in (the webhook the real backend receives). */
export function simulateInbound(store: string | null, id: number, text: string): MockResult<ReturnType<typeof messageView>> {
  const st = inboxState(store);
  const c = findConversation(store, id);
  if (!c) return { ok: false, status: 404, body: { detail: "المحادثة غير موجودة." } };
  const msg: MockMessage = { id: st.ids.message++, conversation_id: id, direction: "inbound", sender_type: "customer", sender_name: c.contact_name, text: text || "مرحباً، هل ما زال العرض قائماً؟", media: [], status: null, error: null, product: null, client_id: null, created_at: new Date().toISOString() };
  const msgs = st.messages.get(id) ?? [];
  msgs.push(msg);
  st.messages.set(id, msgs);
  c.last_message_preview = msg.text;
  c.last_message_at = msg.created_at;
  c.unread_count += 1;
  c.window_closed = false;
  // US-27.3 acceptance 2: a new message reopens a resolved conversation (server rule).
  if (c.status === "resolved") c.status = "open";
  return { ok: true, status: 201, data: messageView(msg) };
}

export function convertToOrder(store: string | null, id: number, body: Record<string, unknown>, v: Viewer): MockResult<{ order_id: number }> {
  const c = findConversation(store, id);
  if (!c) return { ok: false, status: 404, body: { detail: "المحادثة غير موجودة." } };
  if (c.order_id) return { ok: false, status: 409, body: { detail: `المحادثة مرتبطة بالطلب #${c.order_id} مسبقاً.` } };
  const res = createOrder(store, { ...body, sales_channel: "phone" }, v.name, false);
  if (!res.ok) return res;
  c.order_id = res.data.id;
  const phone = String(body.customer_phone ?? "").replace(/\D/g, "");
  if (!c.phone && phone) c.phone = phone;
  return { ok: true, status: 201, data: { order_id: res.data.id } };
}

/** The product picker of the reply box (product cards) and of the convert dialog. */
export function pickProducts(store: string | null, q: string) {
  const term = q.trim();
  return catalog(store)
    .products.filter((p) => !p.archived_at && (!term || p.name.includes(term) || p.sku.toLowerCase().includes(term.toLowerCase())))
    .slice(0, 12)
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku, display_price: displayMoney(Number(p.price), p.currency) }));
}

// ── channels ──────────────────────────────────────────────────────────────────────────

export function channelsView(store: string | null) {
  const st = inboxState(store);
  return st.connections.map((c) => ({
    channel_code: c.channel_code,
    connected: c.connected,
    account_name: c.account_name,
    bot_username: c.bot_username,
    error: c.error,
    connected_at: c.connected_at,
    open_conversations: st.conversations.filter((x) => connectionOf(x.channel_code) === c.channel_code && x.status !== "resolved").length,
  }));
}

/** OAuth (Meta / TikTok) is a server redirect: the mock completes it instantly. */
export function completeOAuth(store: string | null, code: "meta" | "tiktok") {
  const c = connected(store, code);
  c.connected = true;
  c.error = null;
  c.account_name = code === "meta" ? "نور للعطور · Instagram + Facebook" : "noor.perfumes";
  c.connected_at = new Date().toISOString();
}

export function connectTelegram(store: string | null, body: Record<string, unknown>): MockResult<{ bot_username: string }> {
  const token = String(body.bot_token ?? "").trim();
  if (!/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) return { ok: false, status: 400, body: { bot_token: ["رمز البوت غير صحيح — انسخه كما يعطيه @BotFather."] } };
  const c = connected(store, "telegram");
  c.connected = true;
  c.error = null;
  c.bot_username = `${store ?? "store"}_shop_bot`;
  c.account_name = c.bot_username;
  c.connected_at = new Date().toISOString();
  return { ok: true, data: { bot_username: c.bot_username } };
}

export function disconnect(store: string | null, code: string): MockResult<{ ok: true }> {
  const c = inboxState(store).connections.find((x) => x.channel_code === code);
  if (!c) return { ok: false, status: 404, body: { detail: "قناة غير معروفة." } };
  c.connected = false;
  c.error = null;
  c.account_name = null;
  c.bot_username = null;
  c.connected_at = null;
  return { ok: true, data: { ok: true } };
}

// keywords / templates -----------------------------------------------------------------

export function keywordView(store: string | null, k: MockKeyword) {
  const p = k.product_id ? catalog(store).products.find((x) => x.id === k.product_id) : null;
  return { ...k, product_name: p?.name ?? null };
}

export function saveKeyword(store: string | null, id: number | null, body: Record<string, unknown>): MockResult<ReturnType<typeof keywordView>> {
  const st = inboxState(store);
  const existing = id ? st.keywords.find((k) => k.id === id) : undefined;
  if (id && !existing) return { ok: false, status: 404, body: { detail: "المحفّز غير موجود." } };
  const merged = { ...(existing ?? {}), ...body } as Record<string, unknown>;
  const e: Record<string, string[]> = {};
  const keyword = String(merged.keyword ?? "").trim();
  if (!keyword) e.keyword = ["أدخل الكلمة المفتاحية."];
  if (keyword.length > 60) e.keyword = ["60 حرفاً كحد أقصى."];
  const match = String(merged.match_type ?? "contains");
  const reply = String(merged.reply_type ?? "text");
  if (!["contains", "exact"].includes(match)) e.match_type = ["نوع مطابقة غير صحيح."];
  if (!["text", "product_card", "catalog_link"].includes(reply)) e.reply_type = ["نوع ردّ غير صحيح."];
  if (reply === "text" && !String(merged.reply_text ?? "").trim()) e.reply_text = ["اكتب نص الردّ."];
  if (reply === "product_card" && !catalog(store).products.some((p) => p.id === Number(merged.product_id))) e.product_id = ["اختر المنتج."];
  if (st.keywords.some((k) => k.id !== id && k.keyword === keyword && k.match_type === match)) e.keyword = ["يوجد محفّز بنفس الكلمة ونوع المطابقة."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const row: MockKeyword = {
    id: existing?.id ?? st.ids.keyword++,
    keyword,
    match_type: match as MockKeyword["match_type"],
    reply_type: reply as MockKeyword["reply_type"],
    reply_text: reply === "text" ? String(merged.reply_text).trim() : "",
    product_id: reply === "product_card" ? Number(merged.product_id) : null,
    is_active: merged.is_active === undefined ? true : Boolean(merged.is_active),
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
  if (existing) Object.assign(existing, row);
  else st.keywords.unshift(row);
  return { ok: true, status: existing ? 200 : 201, data: keywordView(store, row) };
}

export function saveTemplate(store: string | null, id: number | null, body: Record<string, unknown>): MockResult<MockTemplate> {
  const st = inboxState(store);
  const existing = id ? st.templates.find((t) => t.id === id) : undefined;
  if (id && !existing) return { ok: false, status: 404, body: { detail: "القالب غير موجود." } };
  const title = String(body.title ?? existing?.title ?? "").trim();
  const text = String(body.body ?? existing?.body ?? "").trim();
  const e: Record<string, string[]> = {};
  if (!title) e.title = ["أدخل عنوان القالب."];
  if (title.length > 60) e.title = ["60 حرفاً كحد أقصى."];
  if (!text) e.body = ["اكتب نص القالب."];
  if (text.length > 1000) e.body = ["1000 حرف كحد أقصى."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const row: MockTemplate = { id: existing?.id ?? st.ids.template++, title, body: text, updated_at: new Date().toISOString() };
  if (existing) Object.assign(existing, row);
  else st.templates.unshift(row);
  return { ok: true, status: existing ? 200 : 201, data: row };
}

// catalog sync -------------------------------------------------------------------------

function computeLinks(store: string | null, st: InboxState, code: "meta" | "tiktok", productIds: number[], at: string): MockProductLink[] {
  const cfg = st.sync.find((s) => s.channel_code === code)!;
  const products = catalog(store).products;
  return productIds.map((pid) => {
    const p = products.find((x) => x.id === pid);
    const outOfStock = p ? Number(p.stock) <= 0 || pid % 9 === 0 : false;
    if (cfg.stock_shield_enabled && outOfStock) return { product_id: pid, sync_status: "hidden_out_of_stock" as const, error: null, synced_at: at };
    if (code === "tiktok" && pid % 7 === 3) return { product_id: pid, sync_status: "error" as const, error: "ينقص المنتج صورة بمقاس 600×600 على الأقل (TikTok Shop).", synced_at: at };
    if (code === "meta" && pid % 11 === 4) return { product_id: pid, sync_status: "error" as const, error: "رفضت Meta وصف المنتج: يحتوي رابطاً خارجياً.", synced_at: at };
    if (pid % 13 === 6) return { product_id: pid, sync_status: "pending" as const, error: null, synced_at: null };
    return { product_id: pid, sync_status: "synced" as const, error: null, synced_at: at };
  });
}

function inScope(store: string | null, cfg: MockCatalogSync) {
  return catalog(store)
    .products.filter((p) => !p.archived_at && (cfg.scope === "all" || (p.category_id !== null && cfg.category_ids.includes(p.category_id))))
    .map((p) => p.id);
}

export function syncView(store: string | null, code: "meta" | "tiktok") {
  const st = inboxState(store);
  const cfg = st.sync.find((s) => s.channel_code === code)!;
  const counts = { pending: 0, synced: 0, error: 0, hidden_out_of_stock: 0 };
  for (const l of st.links[code]) counts[l.sync_status]++;
  return {
    ...cfg,
    included_products_count: inScope(store, cfg).length,
    report: cfg.last_run_at ? counts : null,
    categories: catalog(store).categories.map((c) => ({ id: c.id, name: c.name })),
  };
}

export function saveSync(store: string | null, code: "meta" | "tiktok", body: Record<string, unknown>): MockResult<ReturnType<typeof syncView>> {
  const cfg = inboxState(store).sync.find((s) => s.channel_code === code)!;
  const e: Record<string, string[]> = {};
  const scope = String(body.scope ?? cfg.scope);
  if (!["all", "selected_categories"].includes(scope)) e.scope = ["نطاق غير صحيح."];
  const ids = Array.isArray(body.category_ids) ? body.category_ids.map(Number).filter((n) => Number.isInteger(n)) : cfg.category_ids;
  if (scope === "selected_categories" && ids.length === 0) e.category_ids = ["اختر فئة واحدة على الأقل."];
  const known = new Set(catalog(store).categories.map((c) => c.id));
  if (ids.some((i) => !known.has(i))) e.category_ids = ["فئة غير موجودة."];
  const pct = String(body.price_adjustment_percent ?? cfg.price_adjustment_percent).trim();
  if (!/^-?\d{1,2}(\.\d{1,2})?$/.test(pct) || Math.abs(Number(pct)) > 50) e.price_adjustment_percent = ["نسبة بين −50 و50."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  cfg.scope = scope as MockCatalogSync["scope"];
  cfg.category_ids = scope === "all" ? [] : ids;
  cfg.price_adjustment_percent = pct;
  if (body.stock_shield_enabled !== undefined) cfg.stock_shield_enabled = Boolean(body.stock_shield_enabled);
  return { ok: true, data: syncView(store, code) };
}

export function runSync(store: string | null, code: "meta" | "tiktok"): MockResult<ReturnType<typeof syncView>> {
  const st = inboxState(store);
  const conn = connected(store, code);
  if (!conn.connected) return { ok: false, status: 409, body: { detail: "القناة غير مربوطة." } };
  if (conn.error) return { ok: false, status: 409, body: { detail: conn.error } };
  const cfg = st.sync.find((s) => s.channel_code === code)!;
  const at = new Date().toISOString();
  cfg.last_run_at = at;
  st.links[code] = computeLinks(store, st, code, inScope(store, cfg), at);
  return { ok: true, data: syncView(store, code) };
}

export function syncProducts(store: string | null, code: "meta" | "tiktok", params: URLSearchParams) {
  const products = catalog(store).products;
  const status = params.get("sync_status");
  let rows = inboxState(store).links[code];
  if (status) rows = rows.filter((r) => r.sync_status === status);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 20) || 20));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((r) => {
      const p = products.find((x) => x.id === r.product_id);
      return { ...r, name: p?.name ?? `منتج #${r.product_id}`, sku: p?.sku ?? "" };
    }),
  };
}

export function resyncProduct(store: string | null, code: "meta" | "tiktok", productId: number): MockResult<{ product_id: number; sync_status: SyncStatus }> {
  const link = inboxState(store).links[code].find((l) => l.product_id === productId);
  if (!link) return { ok: false, status: 404, body: { detail: "المنتج غير مشمول في المزامنة." } };
  link.sync_status = "pending";
  link.error = null;
  return { ok: true, data: { product_id: productId, sync_status: "pending" } };
}

// tiktok mapping / staff access --------------------------------------------------------

export function mappingView(store: string | null) {
  const cats = catalog(store).categories;
  return inboxState(store).mapping.map((m) => ({ ...m, category_name: cats.find((c) => c.id === m.category_id)?.name ?? `#${m.category_id}` }));
}

export function saveMapping(store: string | null, body: unknown): MockResult<ReturnType<typeof mappingView>> {
  if (!Array.isArray(body)) return { ok: false, status: 400, body: { detail: "صيغة غير صحيحة." } };
  const st = inboxState(store);
  const valid = new Set<string>(TIKTOK_CATEGORIES.map((c) => c.id));
  for (const row of body as Array<Record<string, unknown>>) {
    const m = st.mapping.find((x) => x.category_id === Number(row.category_id));
    if (!m) return { ok: false, status: 400, body: { detail: `فئة المتجر #${String(row.category_id)} غير موجودة.` } };
    const ext = row.external_category_id === null || row.external_category_id === "" ? null : String(row.external_category_id);
    if (ext && !valid.has(ext)) return { ok: false, status: 400, body: { detail: `فئة تيك توك ${ext} غير موجودة.` } };
    m.external_category_id = ext;
  }
  return { ok: true, data: mappingView(store) };
}

export function accessView(store: string | null) {
  const staff = activeStaff(store);
  return {
    staff: staff.map((s) => ({ id: s.id, name: s.full_name })),
    rows: inboxState(store).access.filter((a) => staff.some((s) => s.id === a.staff_id)),
  };
}

export function saveAccess(store: string | null, body: unknown): MockResult<ReturnType<typeof accessView>> {
  if (!Array.isArray(body)) return { ok: false, status: 400, body: { detail: "صيغة غير صحيحة." } };
  const st = inboxState(store);
  for (const row of body as Array<Record<string, unknown>>) {
    const code = String(row.channel_code) as ConnectionCode;
    if (!CONNECTIONS.includes(code)) return { ok: false, status: 400, body: { detail: "قناة غير معروفة." } };
    const a = st.access.find((x) => x.staff_id === Number(row.staff_id) && x.channel_code === code);
    if (!a) return { ok: false, status: 400, body: { detail: "الموظف غير موجود." } };
    a.can_view = Boolean(row.can_view);
    // replying without viewing is meaningless — the server folds it.
    a.can_reply = a.can_view && Boolean(row.can_reply);
  }
  return { ok: true, data: accessView(store) };
}
