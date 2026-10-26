import type { MockResult } from "@/lib/bff/mock-route";
import { int, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, seedOf, storeState } from "@/mocks/store-state";
import { money, nextPlatformId, platformState, type AppRow, type InstallationRowM } from "@/mocks/platform/state";

/**
 * M30 (app store) + M31 (Sharwa AI) store-side mock state. The CATALOGUE and the
 * INSTALLATIONS are the platform console's rows (`platformState()` — M20/M46): one source
 * of truth, so an app the console suspends is suspended here, and an install made here is
 * counted on the console's apps page. What only the store sees (events, WhatsApp usage,
 * templates, the AI settings) lives in this store's own bag.
 */
export const WHATSAPP_APP = "whatsapp_bot";
export const AI_APP = "sharwa_ai";

export const APP_EVENTS = ["installed", "activated", "deactivated", "subscription_renewed", "subscription_expired", "suspended_by_platform", "reactivated_by_platform"] as const;
export type AppEvent = (typeof APP_EVENTS)[number];
export const USAGE_EVENTS = ["order_new", "order_shipping_update", "payment_confirmed", "abandoned_cart_reminder", "otp", "manual"] as const;
export const USAGE_STATUSES = ["queued", "sent", "delivered", "read", "failed", "skipped"] as const;

interface EventRow {
  id: number;
  app_code: string;
  event: AppEvent;
  note: string;
  created_at: string;
}
interface UsageRow {
  id: number;
  event_type: (typeof USAGE_EVENTS)[number];
  recipient_phone: string;
  status: (typeof USAGE_STATUSES)[number];
  order_id: number | null;
  error: string | null;
  created_at: string;
}
interface TemplateRow {
  id: number;
  event_type: (typeof USAGE_EVENTS)[number];
  name: string;
  body: string;
  variables: string[];
  required: string[];
  updated_at: string;
  /** INT-040 (Django `AppTemplate.is_active`): the platform default this template falls back to. */
  default_body?: string;
  is_custom?: boolean;
}

interface AppsState {
  events: EventRow[];
  usage: UsageRow[];
  templates: TemplateRow[];
  ai: { ai_enabled: boolean; max_consecutive_bot_replies_override: number | null; status_polls: number; connected_at: string | null; reconnected?: boolean };
  ids: { event: number };
  /** Platform installation rows of this store as first seen (the mock reset restores them). */
  snapshot: InstallationRowM[] | null;
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
const SAMPLE: Record<string, string> = {
  customer_name: "ريم الأحمد",
  order_number: "1042",
  order_total: "185.00 ر.س",
  tracking_url: "https://noor.sharwa.app/t/AB12CD",
  store_name: "متجر نور",
  cart_url: "https://noor.sharwa.app/cart",
  otp_code: "482915",
  payment_amount: "185.00 ر.س",
};

function seed(store: string | null): AppsState {
  const rnd = seeded(seedOf(store) + 30);
  const empty = isEmptyStore(store);
  const st: AppsState = {
    events: [],
    usage: [],
    templates: [
      { id: 1, event_type: "order_new", name: "طلب جديد", body: "مرحباً {{customer_name}}، استلمنا طلبك رقم {{order_number}} بقيمة {{order_total}}. شكراً لتسوقك من {{store_name}}.", variables: ["customer_name", "order_number", "order_total", "store_name"], required: ["order_number"], updated_at: at(24 * 20) },
      { id: 2, event_type: "order_shipping_update", name: "تحديث الشحن", body: "طلبك رقم {{order_number}} في الطريق إليك. تتبّعه من: {{tracking_url}}", variables: ["customer_name", "order_number", "tracking_url", "store_name"], required: ["order_number", "tracking_url"], updated_at: at(24 * 12) },
      { id: 3, event_type: "payment_confirmed", name: "تأكيد الدفع", body: "تم تأكيد دفع {{payment_amount}} للطلب {{order_number}}.", variables: ["customer_name", "order_number", "payment_amount", "store_name"], required: ["order_number"], updated_at: at(24 * 40) },
      { id: 4, event_type: "abandoned_cart_reminder", name: "تذكير السلة", body: "{{customer_name}}، ما زالت منتجاتك في السلة: {{cart_url}}", variables: ["customer_name", "cart_url", "store_name"], required: ["cart_url"], updated_at: at(24 * 7) },
      { id: 5, event_type: "otp", name: "رمز التحقق", body: "رمز التحقق الخاص بك: {{otp_code}} — لا تشاركه مع أحد.", variables: ["otp_code", "store_name"], required: ["otp_code"], updated_at: at(24 * 60) },
    ],
    ai: { ai_enabled: true, max_consecutive_bot_replies_override: null, status_polls: 0, connected_at: null },
    ids: { event: 1 },
    snapshot: null,
  };
  if (empty) return st;
  const ps = platformState();
  for (const inst of ps.installations.filter((i) => i.schema_name === store)) {
    st.events.push({ id: st.ids.event++, app_code: inst.app_code, event: "installed", note: "", created_at: inst.installed_at });
    if (inst.suspended_by_platform) st.events.push({ id: st.ids.event++, app_code: inst.app_code, event: "suspended_by_platform", note: "رسوم غير مسددة", created_at: at(24 * 3) });
    else st.events.push({ id: st.ids.event++, app_code: inst.app_code, event: "subscription_renewed", note: "", created_at: at(24 * 10) });
  }
  if (ps.installations.some((i) => i.schema_name === store && i.app_code === WHATSAPP_APP)) {
    for (let i = 0; i < 120; i++) {
      const status = i % 23 === 4 ? "failed" : i % 17 === 3 ? "skipped" : i < 3 ? "queued" : pick(rnd, ["sent", "delivered", "delivered", "read", "read"] as const);
      const ev = pick(rnd, USAGE_EVENTS);
      st.usage.push({
        id: 5000 + i,
        event_type: ev,
        recipient_phone: `9677${int(rnd, 10000000, 79999999)}`,
        status,
        order_id: ev.startsWith("order") || ev === "payment_confirmed" ? int(rnd, 1001, 1060) : null,
        error: status === "failed" ? pick(rnd, ["الرقم غير مسجّل في واتساب.", "انتهت جلسة SharwaConnect — أعد ربط الجهاز."] as const) : status === "skipped" ? "العميل ألغى الاشتراك في الرسائل." : null,
        created_at: at(i * 3 + int(rnd, 0, 2)),
      });
    }
  }
  return st;
}

export function appsState(store: string | null): AppsState {
  const st = storeState(store, "apps", () => seed(store));
  if (!st.snapshot) st.snapshot = platformState().installations.filter((i) => i.schema_name === store).map((i) => ({ ...i }));
  return st;
}

/** Mock-only: undo this store's installs and toggles (checks restore what they change). */
export function resetApps(store: string | null) {
  const st = appsState(store);
  const ps = platformState();
  const snap = st.snapshot ?? [];
  ps.installations = ps.installations.filter((i) => i.schema_name !== store || snap.some((s) => s.id === i.id));
  for (const s of snap) {
    const row = ps.installations.find((i) => i.id === s.id);
    if (row) Object.assign(row, s);
  }
  Object.assign(st, seed(store), { snapshot: snap });
}

// ── catalogue + installation ──────────────────────────────────────────────────────────

function installationOf(store: string | null, code: string) {
  return platformState().installations.find((i) => i.schema_name === store && i.app_code === code) ?? null;
}

const INTERVAL_LABEL = { monthly: "شهرياً", yearly: "سنوياً" } as const;

function installationView(i: InstallationRowM | null) {
  return i ? { is_active: i.is_active, suspended_by_platform: i.suspended_by_platform, subscription_expires_at: i.subscription_expires_at, installed_at: i.installed_at } : null;
}

export function appView(store: string | null, a: AppRow) {
  return {
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
    is_free: a.is_free,
    display_price: a.is_free ? null : money(Number(a.price), a.currency),
    billing_interval: a.billing_interval,
    billing_enabled: a.billing_enabled,
    is_listed: a.is_listed,
    installation: installationView(installationOf(store, a.code)),
  };
}

/** Listed apps + installed ones the platform delisted since (they stay visible, flagged — §8; = Django). */
export function listApps(store: string | null) {
  return platformState()
    .apps.filter((a) => a.is_listed || installationOf(store, a.code))
    .map((a) => appView(store, a));
}

export function appDetail(store: string | null, code: string) {
  const a = platformState().apps.find((x) => x.code === code && (x.is_listed || installationOf(store, x.code)));
  if (!a) return null;
  const inst = installationOf(store, code);
  return {
    ...appView(store, a),
    // The fee preview of US-30.1 acceptance 2 — the server's words, shown before confirming.
    install_preview:
      !a.is_free && a.billing_enabled && !inst
        ? { display_price: money(Number(a.price), a.currency), interval_label: INTERVAL_LABEL[a.billing_interval], note: `تُضاف الرسوم ${INTERVAL_LABEL[a.billing_interval]} إلى مستحقات المنصة وتُحصَّل منها؛ لا دفع من هذه الصفحة.` }
        : null,
    suspension_reason: inst?.suspended_by_platform ? (appsState(store).events.filter((e) => e.app_code === code && e.event === "suspended_by_platform").at(-1)?.note ?? null) : null,
  };
}

function logEvent(store: string | null, code: string, event: AppEvent, note = "") {
  const st = appsState(store);
  st.events.push({ id: st.ids.event++, app_code: code, event, note, created_at: new Date().toISOString() });
}

export function installApp(store: string | null, code: string): MockResult<{ installation: ReturnType<typeof installationView> }> {
  const ps = platformState();
  const a = ps.apps.find((x) => x.code === code && x.is_listed);
  if (!a) return { ok: false, status: 404, body: { detail: "التطبيق غير موجود في الكتالوج." } };
  if (installationOf(store, code)) return { ok: false, status: 409, body: { detail: "التطبيق مثبَّت مسبقاً." } };
  const days = a.is_free ? null : a.billing_interval === "yearly" ? 365 : 30;
  const row: InstallationRowM = {
    id: nextPlatformId(ps, "install"),
    schema_name: store ?? "",
    app_code: code,
    is_active: true,
    suspended_by_platform: false,
    subscription_expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    installed_at: new Date().toISOString(),
  };
  ps.installations.push(row);
  logEvent(store, code, "installed");
  if (code === AI_APP) appsState(store).ai.status_polls = 0;
  return { ok: true, status: 201, data: { installation: installationView(row) } };
}

export function toggleApp(store: string | null, code: string, active: boolean): MockResult<{ installation: ReturnType<typeof installationView> }> {
  const inst = installationOf(store, code);
  if (!inst) return { ok: false, status: 404, body: { detail: "التطبيق غير مثبَّت." } };
  if (inst.suspended_by_platform) return { ok: false, status: 403, body: { detail: "التطبيق معلَّق من المنصة — تواصل مع الدعم." } };
  if (inst.is_active === active) return { ok: false, status: 409, body: { detail: active ? "التطبيق مفعّل مسبقاً." : "التطبيق معطّل مسبقاً." } };
  inst.is_active = active;
  logEvent(store, code, active ? "activated" : "deactivated");
  return { ok: true, data: { installation: installationView(inst) } };
}

export function appEvents(store: string | null, code: string) {
  return appsState(store)
    .events.filter((e) => e.app_code === code)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => ({ event: e.event, created_at: e.created_at, note: e.note }));
}

export function appCharges(store: string | null, code: string) {
  return platformState()
    .charges.filter((c) => c.schema_name === store && c.app_code === code)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({ id: c.id, period_label: c.period_label, display_amount: money(c.price, c.currency), status: c.status, created_at: c.created_at }));
}

export function isUsable(store: string | null, code: string): boolean {
  const i = installationOf(store, code);
  return Boolean(i && i.is_active && !i.suspended_by_platform);
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────────────

export function usageList(store: string | null, p: URLSearchParams) {
  let rows = appsState(store).usage;
  const status = p.get("status");
  const ev = p.get("event_type");
  const from = p.get("from");
  const to = p.get("to");
  if (status) rows = rows.filter((r) => r.status === status);
  if (ev) rows = rows.filter((r) => r.event_type === ev);
  if (from) rows = rows.filter((r) => r.created_at.slice(0, 10) >= from);
  if (to) rows = rows.filter((r) => r.created_at.slice(0, 10) <= to);
  const pageSize = Math.min(100, Math.max(1, Number(p.get("page_size") ?? 20) || 20));
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  return { count: rows.length, next: page * pageSize < rows.length ? `?page=${page + 1}` : null, previous: page > 1 ? `?page=${page - 1}` : null, results: rows.slice((page - 1) * pageSize, page * pageSize) };
}

export function usageSummary(store: string | null) {
  const since = new Date(FIXTURE_NOW - 7 * 86_400_000).toISOString();
  const rows = appsState(store).usage.filter((r) => r.created_at >= since);
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  return { last_7_days: rows.length, delivered: by("delivered") + by("read"), failed: by("failed"), queued: by("queued") };
}

function preview(body: string) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => SAMPLE[k] ?? `{{${k}}}`);
}

export function templateView(t: TemplateRow) {
  const { default_body: _default, ...rest } = t;
  void _default;
  return { ...rest, key: t.event_type, is_custom: t.is_custom ?? false, preview: preview(t.body) };
}

export function patchTemplate(store: string | null, id: number, body: Record<string, unknown>): MockResult<ReturnType<typeof templateView>> {
  const t = appsState(store).templates.find((x) => x.id === id);
  if (!t) return { ok: false, status: 404, body: { detail: "القالب غير موجود." } };
  const text = String(body.body ?? "").trim();
  // Django (INT-040): an empty body drops the merchant's text and restores the platform default.
  if (!text) {
    if (t.default_body !== undefined) t.body = t.default_body;
    t.is_custom = false;
    t.updated_at = new Date().toISOString();
    return { ok: true, data: templateView(t) };
  }
  if (text.length > 1024) return { ok: false, status: 400, body: { body: ["1024 حرفاً كحد أقصى (حد واتساب)."] } };
  const used = [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!);
  const unknown = used.filter((v) => !t.variables.includes(v));
  if (unknown.length) return { ok: false, status: 400, body: { body: [`متغير غير معروف: {{${unknown[0]}}}.`] } };
  const missing = t.required.filter((v) => !used.includes(v));
  if (missing.length) return { ok: false, status: 400, body: { body: [`المتغير {{${missing[0]}}} إلزامي في هذا القالب.`] } };
  t.default_body ??= t.body;
  t.body = text;
  t.is_custom = true;
  t.updated_at = new Date().toISOString();
  return { ok: true, data: templateView(t) };
}

// ── Sharwa AI (M31) ───────────────────────────────────────────────────────────────────

export const AI_CONSOLE_URL = "https://ai.sharwa.app/console";
/** = Django's `SHARWA_AI_MAX_CONSECUTIVE_BOT_REPLIES` default (.env.example). */
export const PLATFORM_DEFAULT_MAX_REPLIES = 4;
const MOCK_PHONE = "967771234567";

/** A stand-in pairing QR (Django sends the gateway's PNG as a `data:image/…` URL). */
const MOCK_QR = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/>${Array.from({ length: 21 * 21 }, (_, i) => {
    const x = i % 21;
    const y = Math.floor(i / 21);
    const finder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7 && (x === cx || x === cx + 6 || y === cy || y === cy + 6 || (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4));
    const dark = finder(0, 0) || finder(14, 0) || finder(0, 14) || (!(x < 8 && y < 8) && !(x > 12 && y < 8) && !(x < 8 && y > 12) && (x * 7 + y * 13 + x * y) % 3 === 0);
    return dark ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "";
  }).join("")}</svg>`,
)}`;

type AiStatusView = { connected: boolean; connecting: boolean; error: string | null; connected_at: string | null; connected_phone_number: string | null; qr_image: string | null };

/** «جارٍ الربط» (with the QR to scan) for the first two polls after the install or a reconnect, then connected (US-31.1). */
export function aiStatus(store: string | null): AiStatusView {
  const st = appsState(store);
  const inst = installationOf(store, AI_APP);
  st.ai.status_polls++;
  const connectedNow = st.ai.status_polls > 2 || (!st.ai.reconnected && Date.now() - Date.parse(inst?.installed_at ?? new Date().toISOString()) > 60_000);
  if (connectedNow && !st.ai.connected_at) st.ai.connected_at = new Date().toISOString();
  return connectedNow
    ? { connected: true, connecting: false, error: null, connected_at: st.ai.connected_at, connected_phone_number: MOCK_PHONE, qr_image: null }
    : { connected: false, connecting: true, error: null, connected_at: null, connected_phone_number: null, qr_image: MOCK_QR };
}

/** `POST sharwa-ai/reconnect/` — a fresh pairing; refused while connected (= Django). */
export function reconnectAi(store: string | null): MockResult<AiStatusView> {
  const st = appsState(store);
  if (st.ai.connected_at && st.ai.status_polls > 2) return { ok: false, status: 409, body: { detail: "واتساب مربوط فعلاً." } };
  st.ai.status_polls = 0;
  st.ai.connected_at = null;
  st.ai.reconnected = true;
  return { ok: true, data: aiStatus(store) };
}

export function aiSettings(store: string | null) {
  const { ai_enabled, max_consecutive_bot_replies_override } = appsState(store).ai;
  return { ai_enabled, max_consecutive_bot_replies_override, platform_default_max_replies: PLATFORM_DEFAULT_MAX_REPLIES };
}

/** PUT — all or nothing, like Django: `ai_enabled` must be a boolean, the override 1–50 or empty. */
export function saveAiSettings(store: string | null, body: Record<string, unknown>): MockResult<ReturnType<typeof aiSettings>> {
  const st = appsState(store);
  const raw = body.max_consecutive_bot_replies_override;
  const errors: Record<string, string[]> = {};
  if (typeof body.ai_enabled !== "boolean") errors.ai_enabled = ["قيمة منطقية (true/false)."];
  if (raw !== null && raw !== undefined && raw !== "" && (typeof raw === "boolean" || !(Number.isInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 50))) {
    errors.max_consecutive_bot_replies_override = ["عدد صحيح من 1 إلى 50، أو اتركه فارغاً لافتراضي المنصة."];
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  st.ai.ai_enabled = body.ai_enabled as boolean;
  st.ai.max_consecutive_bot_replies_override = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  return { ok: true, data: aiSettings(store) };
}

export function aiFlags(store: string | null) {
  return { installed: isUsable(store, AI_APP), enabled: appsState(store).ai.ai_enabled };
}

export function consoleToken(): { console_url: string; token: string; expires_in: number } {
  const token = Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
  return { console_url: AI_CONSOLE_URL, token, expires_in: 900 };
}
