import { canWrite, type AdminArea, type AdminRole } from "@/features/platform-admin/schemas/auth";
import { CURRENCIES, type Currency } from "@/lib/schemas/money";
import { mockJson } from "@/mocks/runtime";
import { FIXTURE_NOW } from "@/mocks/store-state";
import { adminCookie, adminLoginMock, adminSessionFor, clearedAdminCookie } from "@/mocks/platform/auth";
import {
  cellKey,
  currentSubscription,
  findClient,
  isStalled,
  logAction,
  money,
  nextPlatformId,
  planById,
  platformState,
  resolveFeature,
  tickJobs,
  walletOf,
  type AppRow,
  type ClientRow,
  type InstallationRowM,
  type PlatformState,
} from "@/mocks/platform/state";
import {
  chargeView,
  commissionView,
  orderBy,
  paginate,
  planView,
  snapshotView,
  storeFeatures,
  storeRow,
  subscriptionView,
  topupView,
  totalsFor,
  walletBalances,
  withdrawalView,
} from "@/mocks/platform/views";

/**
 * The mock SERVER for `/api/v1/platform/*` (M20 §7, M45 §7, M46 §7 — all `[NEEDS BACKEND]`).
 * One dispatcher behind the catch-all BFF route `src/app/api/bff/platform/[...path]`: the
 * day Django ships the rows, that route becomes a passthrough and this file is deleted.
 *
 * Gates, in order: 401 without a console session → 403 when the role may not write the
 * area (FR-20.09: `operator` writes dues and Sharwa Pay only) → the row's own rules
 * (400 field errors, 409 «تم التعامل معه مسبقاً», …).
 */
type Body = Record<string, unknown>;
interface Ctx {
  request: Request;
  url: URL;
  params: Record<string, string>;
  role: AdminRole;
  actor: { username: string; role: AdminRole };
  body: () => Promise<Body>;
}
type Handler = (ctx: Ctx) => Promise<Response> | Response;
interface Route {
  method: string;
  pattern: string[];
  area: AdminArea | null;
  handle: Handler;
}

const routes: Route[] = [];
function on(method: string, path: string, area: AdminArea | null, handle: Handler) {
  routes.push({ method, pattern: path.split("/"), area, handle });
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

const ok = (data: unknown, delay = 160, status = 200) => mockJson(data, { delay, status });
const bad = (body: Body, status = 400) => mockJson(body, { status, delay: 120 });
const handled = (what = "السجل") => bad({ detail: `${what} غير موجود أو تم التعامل معه مسبقاً.` }, 409);
const notFound = (what: string) => bad({ detail: `${what} غير موجود.` }, 404);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim());
const bool = (v: unknown) => v === true || v === "true";
const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const decimal = (v: unknown) => /^\d+(\.\d{1,2})?$/.test(str(v));

export async function platformMock(request: Request, segments: string[], role: AdminRole | null): Promise<Response> {
  const method = request.method.toUpperCase();
  const segs = segments.filter(Boolean);
  const url = new URL(request.url);
  let parsed: Body | null = null;
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

  // Auth rows are reachable without a session.
  const path = segs.join("/");
  if (path === "auth/login" && method === "POST") {
    const b = await body();
    const r = adminLoginMock(b.username, b.password);
    if (!r.ok) return bad(r.body, r.status);
    return mockJson(adminSessionFor(r.role), { delay: 180, headers: { "set-cookie": adminCookie(r.role) } });
  }
  if (path === "auth/logout" && method === "POST") return mockJson(null, { status: 204, headers: { "set-cookie": clearedAdminCookie() } });
  if (!role) return bad({ detail: "انتهت جلسة لوحة المنصة، سجّل الدخول مجدداً." }, 401);
  if (path === "auth/me" && method === "GET") return ok(adminSessionFor(role), 40);

  let methodMismatch = false;
  for (const r of routes) {
    const params = match(r.pattern, segs);
    if (!params) continue;
    if (r.method !== method) {
      methodMismatch = true;
      continue;
    }
    if (method !== "GET" && r.area && !canWrite(role, r.area)) {
      return bad({ detail: "هذا الإجراء لمالك المنصة فقط." }, 403);
    }
    const s = adminSessionFor(role);
    return r.handle({ request, url, params, role, actor: { username: s.username, role }, body });
  }
  return methodMismatch ? bad({ detail: "الطريقة غير مسموحة." }, 405) : notFound("المسار");
}

const st = () => platformState();
const clientOr404 = (schema: string): ClientRow | null => findClient(schema) ?? null;

// ── M20: overview + stores ─────────────────────────────────────────────────────────────
on("GET", "overview", null, () => {
  const s = st();
  s.clients.forEach(tickJobs);
  const ready = s.clients.filter((c) => c.snapshot);
  const recent = [...s.clients].sort((a, b) => b.created_on.localeCompare(a.created_on)).slice(0, 50);
  return ok({
    total_stores: s.clients.length,
    display_total_sales: money(
      ready.reduce((n, c) => n + c.snapshot!.revenue_sar, 0),
      "SAR",
    ),
    total_orders: ready.reduce((n, c) => n + c.snapshot!.orders_count, 0),
    failed_stores: s.clients.filter((c) => c.provisioning_status === "failed").length,
    stalled_stores: s.clients.filter(isStalled).length,
    pending_topups: s.topups.filter((t) => t.status === "pending").length,
    pending_withdrawals: s.withdrawals.filter((t) => t.status === "pending").length,
    pending_webhook_events: s.webhookEvents.filter((e) => e.status === "pending").length,
    snapshot_date: ready[0]?.snapshot?.date ?? null,
    recent_stores: recent.map(storeRow),
  }, 260);
});

on("GET", "stores", null, ({ url }) => {
  const s = st();
  s.clients.forEach(tickJobs);
  const p = url.searchParams;
  const q = str(p.get("q")).toLowerCase();
  const status = p.get("status");
  const plan = p.get("plan");
  const active = p.get("is_active");
  let rows = s.clients.filter((c) => {
    if (status === "stalled" ? !isStalled(c) : status && c.provisioning_status !== status) return false;
    if (plan) {
      const sub = currentSubscription(c.schema_name);
      const code = sub ? planById(sub.plan_id)?.code : "none";
      if ((code ?? "none") !== plan) return false;
    }
    if (active === "true" && !c.is_active) return false;
    if (active === "false" && c.is_active) return false;
    if (q && ![c.name, c.schema_name, c.merchant_phone ?? "", ...c.domains.map((d) => d.domain)].some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  });
  rows = [...rows].sort((a, b) => b.created_on.localeCompare(a.created_on));
  rows = orderBy(rows, p.get("ordering"), { name: (c) => c.name, created_on: (c) => c.created_on, schema_name: (c) => c.schema_name });
  return ok(paginate(rows.map(storeRow), p), 200);
});

on("GET", "clients", null, ({ url }) => {
  const q = str(url.searchParams.get("q")).toLowerCase();
  const rows = st()
    .clients.filter((c) => !q || [c.name, c.schema_name, c.merchant_phone ?? "", ...c.domains.map((d) => d.domain)].some((v) => v.toLowerCase().includes(q)))
    .slice(0, 20)
    .map((c) => {
      const sub = currentSubscription(c.schema_name);
      return { schema_name: c.schema_name, name: c.name, merchant_phone: c.merchant_phone, primary_domain: c.primary_domain, current_plan: sub ? (planById(sub.plan_id)?.name ?? null) : null };
    });
  return ok(rows, 90);
});

on("POST", "stores/reprovision", "stores", async ({ body, actor }) => {
  const b = await body();
  const schemas = Array.isArray(b.schemas) ? b.schemas.map(String) : [];
  if (!schemas.length) return bad({ schemas: ["اختر متجراً واحداً على الأقل."] });
  const results = schemas.map((schema) => {
    const c = findClient(schema);
    if (!c) return { schema_name: schema, queued: false, reason: "متجر غير معروف." };
    if (c.pending_job?.kind === "reprovision") return { schema_name: schema, queued: false, reason: "إعادة تجهيز قيد التنفيذ بالفعل." };
    if (c.provisioning_status !== "failed" && !isStalled(c)) return { schema_name: schema, queued: false, reason: "المتجر ليس فاشلاً ولا متعثّراً." };
    c.provisioning_status = "provisioning";
    c.provisioning_started_at = new Date(FIXTURE_NOW).toISOString();
    c.pending_job = { kind: "reprovision", reads_left: 3 };
    logAction(schema, actor, "stores.reprovision", "أُرسلت مهمة إعادة التجهيز (provision_tenant_schema).");
    return { schema_name: schema, queued: true, reason: null };
  });
  const queued = results.filter((r) => r.queued).length;
  return ok({ detail: `أُرسلت ${queued} من ${results.length} مهمة إعادة تجهيز.`, results }, 260);
});

on("GET", "stores/:schema", null, ({ params }) => {
  const c = clientOr404(params.schema!);
  if (!c) return notFound("المتجر");
  tickJobs(c);
  const s = st();
  const sub = currentSubscription(c.schema_name);
  const apps = s.apps;
  return ok({
    ...storeRow(c),
    provisioning_error: c.provisioning_error,
    provisioned_at: c.provisioned_at,
    interested_categories: c.interested_categories.map((id) => s.categories.find((x) => x.id === id)?.name ?? String(id)),
    terms_accepted_at: c.terms_accepted_at,
    domains: c.domains,
    subscription: sub ? subscriptionView(sub) : null,
    subscription_history: s.subscriptions.filter((x) => x.schema_name === c.schema_name).sort((a, b) => b.started_at.localeCompare(a.started_at)).map(subscriptionView),
    installations: s.installations
      .filter((i) => i.schema_name === c.schema_name)
      .map((i) => ({ id: i.id, app_code: i.app_code, app_name: apps.find((a) => a.code === i.app_code)?.name ?? i.app_code, is_active: i.is_active, suspended_by_platform: i.suspended_by_platform, subscription_expires_at: i.subscription_expires_at, installed_at: i.installed_at })),
    override_count: s.overrides.filter((o) => o.schema_name === c.schema_name).length,
    recent_actions: s.actions.filter((a) => a.schema_name === c.schema_name).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20).map(({ id, at, actor, action, detail }) => ({ id, at, actor, action, detail })),
  });
});

on("POST", "stores/:schema/sharwa-ship", "stores", async ({ params, body, actor }) => {
  const c = clientOr404(params.schema!);
  if (!c) return notFound("المتجر");
  if (c.provisioning_status !== "ready") return bad({ detail: "المتجر غير جاهز بعد." });
  if (c.pending_job) return bad({ detail: "مهمة أخرى قيد المعالجة على هذا المتجر." }, 409);
  const active = bool((await body()).active);
  if ((c.sharwa_ship === "active") === active) return bad({ detail: active ? "شروة شيب مفعّلة بالفعل." : "شروة شيب غير مفعّلة أصلاً." }, 409);
  c.pending_job = { kind: "sharwa_ship", reads_left: 2, target: active };
  logAction(c.schema_name, actor, active ? "sharwa_ship.activate" : "sharwa_ship.deactivate", active ? "أُرسلت مهمة activate_sharwa_ship_task." : "أُرسلت مهمة إلغاء شروة شيب.");
  return ok({ detail: active ? "قيد تفعيل شروة شيب — يتحدّث تلقائياً." : "قيد إلغاء شروة شيب.", store: storeRow(c) }, 220);
});

on("GET", "stores/:schema/features", null, ({ params }) => (findClient(params.schema!) ? ok(storeFeatures(params.schema!)) : notFound("المتجر")));

on("PUT", "stores/:schema/features", "billing", async ({ params, body, actor }) => {
  const c = clientOr404(params.schema!);
  if (!c) return notFound("المتجر");
  const b = await body();
  const list = Array.isArray(b.overrides) ? (b.overrides as Body[]) : [];
  const s = st();
  const errors: Record<string, string[]> = {};
  for (const o of list) if (!s.features.some((f) => f.code === str(o.code))) errors[`overrides.${str(o.code)}`] = ["ميزة غير معروفة."];
  if (Object.keys(errors).length) return bad(errors);
  let changed = 0;
  for (const o of list) {
    const code = str(o.code);
    const idx = s.overrides.findIndex((x) => x.feature_code === code && x.schema_name === c.schema_name);
    if (o.is_enabled === null || o.is_enabled === undefined) {
      if (idx >= 0) {
        s.overrides.splice(idx, 1);
        changed += 1;
      }
      continue;
    }
    const row = idx >= 0 ? s.overrides[idx]! : null;
    if (row) Object.assign(row, { is_enabled: bool(o.is_enabled), notes: str(o.notes), updated_at: new Date().toISOString() });
    else s.overrides.push({ id: nextPlatformId(s, "override"), feature_code: code, schema_name: c.schema_name, is_enabled: bool(o.is_enabled), notes: str(o.notes), updated_at: new Date().toISOString() });
    changed += 1;
  }
  if (changed) logAction(c.schema_name, actor, "feature_override.update", `حُدِّث ${changed} استثناء ميزة.`);
  return ok(storeFeatures(c.schema_name), 200);
});

on("POST", "stores/:schema/domains", "stores", async ({ params, body, actor }) => {
  const c = clientOr404(params.schema!);
  if (!c) return notFound("المتجر");
  const domain = str((await body()).domain).toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return bad({ domain: ["صيغة النطاق غير صحيحة (مثل example.com)."] });
  if (st().clients.some((x) => x.domains.some((d) => d.domain === domain))) return bad({ domain: ["هذا النطاق مرتبط بمتجر بالفعل."] });
  c.domains.push({ id: nextPlatformId(st(), "domain"), domain, is_primary: false });
  logAction(c.schema_name, actor, "domain.add", `أُضيف النطاق ${domain}.`);
  return ok({ domains: c.domains }, 180, 201);
});

on("POST", "stores/:schema/domains/:id", "stores", ({ params, actor }) => {
  const c = clientOr404(params.schema!);
  if (!c) return notFound("المتجر");
  const d = c.domains.find((x) => x.id === Number(params.id));
  if (!d) return notFound("النطاق");
  for (const x of c.domains) x.is_primary = x.id === d.id;
  c.primary_domain = d.domain;
  logAction(c.schema_name, actor, "domain.primary", `أصبح ${d.domain} النطاق الأساسي.`);
  return ok({ domains: c.domains });
});

function custodySettled(schema: string): { settled: boolean; reason: string | null } {
  const s = st();
  const c = findClient(schema);
  const pending = s.commissions.some((r) => r.schema_name === schema && r.status === "pending") || s.charges.some((r) => r.schema_name === schema && r.status === "pending");
  if (pending) return { settled: false, reason: "مستحقات معلّقة على المتجر — حصّلها أو أعفِها أولاً." };
  const w = walletOf(c?.merchant_phone ?? null);
  if (w && Object.values(w.balances).some((v) => (v ?? 0) > 0)) return { settled: false, reason: "رصيد محفظة شروة باي للتاجر لم يُصرف — العهدة غير مسوّاة." };
  return { settled: true, reason: null };
}

function deactivationState(schema: string) {
  const s = st();
  const rows = s.deactivations.filter((d) => d.schema_name === schema).sort((a, b) => b.created_at.localeCompare(a.created_at));
  // «إعادة التفعيل» removes the open record, so the newest row is the live one.
  const live = rows[0] ?? null;
  const status = live?.status ?? null;
  const custody = custodySettled(schema);
  const opt = (action: "suspend" | "deactivate" | "close" | "reinstate", allowed: boolean, reason: string | null) => ({ action, allowed, reason: allowed ? null : reason });
  const view = (d: (typeof rows)[number]) => ({ ...d, settled_custody: d.status === "closed" ? d.settled_custody : custody.settled });
  return {
    current: live ? view(live) : null,
    history: rows.map(view),
    options: [
      opt("suspend", status === null, status ? `المتجر ${status === "closed" ? "مغلق" : "معلّق أو معطّل"} بالفعل.` : null),
      opt("deactivate", status === "suspended", "يُعطَّل المتجر المعلّق فقط."),
      opt("close", status === "deactivated" && custody.settled, status !== "deactivated" ? "يُغلق المتجر المعطّل فقط." : custody.reason),
      opt("reinstate", status === "suspended" || status === "deactivated", status === "closed" ? "الإغلاق نهائي." : "المتجر نشط."),
    ],
  };
}

on("GET", "stores/:schema/deactivation", null, ({ params }) => (findClient(params.schema!) ? ok(deactivationState(params.schema!)) : notFound("المتجر")));

on("POST", "stores/:schema/deactivation", "stores", async ({ params, body, actor }) => {
  const c = clientOr404(params.schema!);
  if (!c) return notFound("المتجر");
  const b = await body();
  const action = str(b.action);
  const state = deactivationState(c.schema_name);
  const option = state.options.find((o) => o.action === action);
  if (!option) return bad({ action: ["إجراء غير معروف."] });
  if (!option.allowed) return bad({ detail: option.reason ?? "انتقال غير مسموح." }, 409);
  const s = st();
  const now = new Date().toISOString();
  const reason = str(b.reason);
  if (action === "suspend") {
    const grace = str(b.grace_period_ends_at);
    const errors: Record<string, string[]> = {};
    if (!reason) errors.reason = ["اذكر سبب التعليق — يراه فريق الدعم."];
    if (!/^\d{4}-\d{2}-\d{2}/.test(grace) || Date.parse(grace) <= FIXTURE_NOW) errors.grace_period_ends_at = ["اختر تاريخ نهاية مهلة في المستقبل."];
    if (Object.keys(errors).length) return bad(errors);
    s.deactivations.push({ id: nextPlatformId(s, "deactivation"), schema_name: c.schema_name, status: "suspended", reason, grace_period_ends_at: new Date(grace).toISOString(), settled_custody: false, created_at: now, updated_at: now, by: actor.username });
    c.is_active = false;
  } else if (action === "reinstate") {
    s.deactivations = s.deactivations.filter((d) => !(d.schema_name === c.schema_name && d.id === state.current!.id));
    c.is_active = true;
  } else {
    const cur = s.deactivations.find((d) => d.id === state.current!.id)!;
    cur.status = action === "deactivate" ? "deactivated" : "closed";
    cur.updated_at = now;
    if (action === "close") cur.settled_custody = true;
    if (reason) cur.reason = reason;
  }
  const label = { suspend: "عُلِّق", deactivate: "عُطِّل", close: "أُغلق", reinstate: "أُعيد تفعيل" }[action as "suspend"];
  logAction(c.schema_name, actor, `deactivation.${action}`, `${label} المتجر${reason ? `: ${reason}` : ""}.`);
  return ok(deactivationState(c.schema_name), 220);
});

// ── M46: plans, matrix, features, overrides, subscriptions, switches ───────────────────
on("GET", "plans", null, () => ok([...st().plans].sort((a, b) => a.display_order - b.display_order).map(planView)));

function validatePlan(b: Body, s: PlatformState, selfId: number | null): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  const code = str(b.code);
  if (!/^[a-z0-9_]{2,30}$/.test(code)) e.code = ["حروف لاتينية صغيرة وأرقام و_ (2–30)."];
  else if (s.plans.some((p) => p.code === code && p.id !== selfId)) e.code = ["الكود مستخدم لباقة أخرى."];
  if (!str(b.name)) e.name = ["أدخل اسم الباقة."];
  if (!decimal(b.price)) e.price = ["أدخل سعراً صحيحاً."];
  if (!(CURRENCIES as readonly string[]).includes(str(b.currency))) e.currency = ["عملة غير معروفة."];
  if (!["monthly", "yearly", "lifetime"].includes(str(b.billing_interval))) e.billing_interval = ["فترة غير معروفة."];
  if (!["none", "percentage", "fixed"].includes(str(b.commission_type))) e.commission_type = ["نوع عمولة غير معروف."];
  if (!decimal(b.commission_value)) e.commission_value = ["أدخل قيمة صحيحة."];
  if (bool(b.is_default_free) && !bool(b.is_free)) e.is_default_free = ["الباقة الافتراضية يجب أن تكون مجانية."];
  if (bool(b.is_free) && Number(str(b.price)) > 0) e.price = ["الباقة المجانية سعرها 0."];
  return e;
}

function planFields(b: Body) {
  const lim = (v: unknown) => (str(v) === "" ? null : Number(str(v)));
  return {
    code: str(b.code),
    name: str(b.name),
    description: str(b.description),
    is_free: bool(b.is_free),
    price: Number(str(b.price)).toFixed(2),
    currency: str(b.currency) as Currency,
    billing_interval: str(b.billing_interval) as "monthly",
    commission_type: str(b.commission_type) as "none",
    commission_value: Number(str(b.commission_value)).toFixed(2),
    max_products: lim(b.max_products),
    max_orders_per_month: lim(b.max_orders_per_month),
    is_active: bool(b.is_active),
    is_default_free: bool(b.is_default_free),
    display_order: Number(b.display_order ?? 0) || 0,
  };
}

on("POST", "plans", "billing", async ({ body, actor }) => {
  const b = await body();
  const s = st();
  const e = validatePlan(b, s, null);
  if (Object.keys(e).length) return bad(e);
  const row = { id: nextPlatformId(s, "plan"), ...planFields(b) };
  if (row.is_default_free) for (const p of s.plans) p.is_default_free = false;
  s.plans.push(row);
  logAction(null, actor, "plan.create", `أُنشئت الباقة «${row.name}».`);
  return ok(planView(row), 200, 201);
});

on("PATCH", "plans/:id", "billing", async ({ params, body, actor }) => {
  const s = st();
  const p = s.plans.find((x) => x.id === Number(params.id));
  if (!p) return notFound("الباقة");
  const b = { ...p, ...(await body()) } as Body;
  const e = validatePlan(b, s, p.id);
  if (Object.keys(e).length) return bad(e);
  Object.assign(p, planFields(b));
  if (p.is_default_free) for (const x of s.plans) if (x.id !== p.id) x.is_default_free = false;
  logAction(null, actor, "plan.update", `عُدِّلت الباقة «${p.name}».`);
  return ok(planView(p));
});

on("DELETE", "plans/:id", "billing", ({ params, actor }) => {
  const s = st();
  const p = s.plans.find((x) => x.id === Number(params.id));
  if (!p) return notFound("الباقة");
  const subs = s.subscriptions.filter((x) => x.plan_id === p.id && x.is_current).length;
  if (subs) return bad({ detail: `لا يمكن حذف باقة عليها ${subs} اشتراكاً حالياً — انقلها إلى باقة أخرى أولاً.`, current_subscriptions: subs }, 409);
  s.plans = s.plans.filter((x) => x.id !== p.id);
  for (const k of [...s.planFeatures.keys()]) if (k.startsWith(`${p.id}:`)) s.planFeatures.delete(k);
  logAction(null, actor, "plan.delete", `حُذفت الباقة «${p.name}».`);
  return mockJson(null, { status: 204, delay: 160 });
});

on("GET", "plan-features", null, () => {
  const out: Array<{ plan_id: number; feature_code: string; is_enabled: boolean }> = [];
  for (const [k, v] of st().planFeatures) {
    const [plan, code] = k.split(":");
    out.push({ plan_id: Number(plan), feature_code: code!, is_enabled: v });
  }
  return ok(out, 140);
});

on("PUT", "plan-features", "billing", async ({ body }) => {
  const b = await body();
  const s = st();
  const plan = s.plans.find((p) => p.id === Number(b.plan_id));
  const f = s.features.find((x) => x.code === str(b.feature_code));
  if (!plan || !f) return bad({ detail: "باقة أو ميزة غير معروفة." });
  s.planFeatures.set(cellKey(plan.id, f.code), bool(b.is_enabled));
  return ok({ plan_id: plan.id, feature_code: f.code, is_enabled: bool(b.is_enabled) }, 120);
});

function featureView(code: string) {
  const s = st();
  const f = s.features.find((x) => x.code === code)!;
  const ovs = s.overrides.filter((o) => o.feature_code === code);
  return {
    ...f,
    override_count: ovs.length,
    enabled_override_schemas: ovs.filter((o) => o.is_enabled).map((o) => o.schema_name),
    plans_enabled: s.plans.filter((p) => s.planFeatures.get(cellKey(p.id, code))).length,
  };
}

on("GET", "features", null, () => ok(st().features.map((f) => featureView(f.code))));

on("PATCH", "features/:code", "billing", async ({ params, body, actor }) => {
  const s = st();
  const f = s.features.find((x) => x.code === params.code);
  if (!f) return notFound("الميزة");
  const b = await body();
  if (has(b, "is_active_globally")) f.is_active_globally = bool(b.is_active_globally);
  if (has(b, "requires_plan")) f.requires_plan = bool(b.requires_plan);
  if (has(b, "name") && str(b.name)) f.name = str(b.name);
  if (has(b, "description")) f.description = str(b.description);
  logAction(null, actor, "feature.update", `«${f.name}»: ${f.is_active_globally ? "مفعّلة عالمياً" : "موقوفة عالمياً"}، ${f.requires_plan ? "تتطلب باقة" : "لكل الباقات"}.`);
  return ok(featureView(f.code), 140);
});

on("GET", "features/:code/resolve", null, ({ params, url }) => {
  const schema = str(url.searchParams.get("schema"));
  if (!st().features.some((f) => f.code === params.code)) return notFound("الميزة");
  if (!findClient(schema)) return bad({ schema: ["متجر غير معروف."] });
  const r = resolveFeature(params.code!, schema);
  return ok({ feature_code: params.code, schema_name: schema, ...r }, 120);
});

function overrideView(o: PlatformState["overrides"][number]) {
  return { ...o, store_name: findClient(o.schema_name)?.name ?? o.schema_name };
}

on("GET", "feature-overrides", null, ({ url }) => {
  const p = url.searchParams;
  const feature = p.get("feature");
  const schema = p.get("schema");
  const rows = st()
    .overrides.filter((o) => (!feature || o.feature_code === feature) && (!schema || o.schema_name === schema))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(overrideView);
  return ok(paginate(rows, p));
});

on("POST", "feature-overrides/bulk", "billing", async ({ body, actor }) => {
  const b = await body();
  const s = st();
  const code = str(b.feature_code);
  const schemas = Array.isArray(b.schema_names) ? b.schema_names.map(String) : [];
  const e: Record<string, string[]> = {};
  if (!s.features.some((f) => f.code === code)) e.feature_code = ["اختر ميزة."];
  if (!schemas.length) e.schema_names = ["اختر متجراً واحداً على الأقل."];
  const unknown = schemas.filter((x) => !findClient(x));
  if (unknown.length) e.schema_names = [`متاجر غير معروفة: ${unknown.join("، ")}`];
  if (Object.keys(e).length) return bad(e);
  const remove = b.is_enabled === null || b.is_enabled === undefined;
  let created = 0;
  let updated = 0;
  let removed = 0;
  for (const schema of schemas) {
    const idx = s.overrides.findIndex((o) => o.feature_code === code && o.schema_name === schema);
    if (remove) {
      if (idx >= 0) {
        s.overrides.splice(idx, 1);
        removed += 1;
      }
      continue;
    }
    if (idx >= 0) {
      Object.assign(s.overrides[idx]!, { is_enabled: bool(b.is_enabled), notes: str(b.notes), updated_at: new Date().toISOString() });
      updated += 1;
    } else {
      s.overrides.push({ id: nextPlatformId(s, "override"), feature_code: code, schema_name: schema, is_enabled: bool(b.is_enabled), notes: str(b.notes), updated_at: new Date().toISOString() });
      created += 1;
    }
    logAction(schema, actor, "feature_override.bulk", remove ? `أُزيل استثناء «${code}».` : `استثناء «${code}» = ${bool(b.is_enabled) ? "مفعّل" : "معطّل"}.`);
  }
  const detail = remove ? `أُزيل ${removed} استثناء.` : `${created + updated} استثناءات (${created} جديد، ${updated} محدَّث).`;
  return ok({ detail, created, updated, removed }, 220);
});

on("DELETE", "feature-overrides/:id", "billing", ({ params, actor }) => {
  const s = st();
  const o = s.overrides.find((x) => x.id === Number(params.id));
  if (!o) return handled("الاستثناء");
  s.overrides = s.overrides.filter((x) => x.id !== o.id);
  logAction(o.schema_name, actor, "feature_override.delete", `أُزيل استثناء «${o.feature_code}».`);
  return mockJson(null, { status: 204, delay: 120 });
});

on("GET", "subscriptions", null, ({ url }) => {
  const p = url.searchParams;
  const schema = p.get("schema");
  const status = p.get("status");
  const current = p.get("current");
  const q = str(p.get("q")).toLowerCase();
  const rows = st()
    .subscriptions.filter((x) => (!schema || x.schema_name === schema) && (!status || x.status === status) && (current !== "true" || x.is_current) && (!p.get("plan") || planById(x.plan_id)?.code === p.get("plan")))
    .map(subscriptionView)
    .filter((x) => !q || x.store_name.toLowerCase().includes(q) || x.schema_name.includes(q))
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
  return ok(paginate(rows, p));
});

on("POST", "subscriptions/assign", "billing", async ({ body, actor }) => {
  const b = await body();
  const s = st();
  const c = findClient(str(b.schema_name));
  const plan = s.plans.find((p) => p.id === Number(b.plan_id));
  const e: Record<string, string[]> = {};
  if (!c) e.schema_name = ["اختر متجراً."];
  if (!plan) e.plan_id = ["اختر باقة."];
  else if (!plan.is_active) e.plan_id = ["الباقة غير نشطة."];
  if (Object.keys(e).length) return bad(e);
  const now = new Date().toISOString();
  for (const x of s.subscriptions) if (x.schema_name === c!.schema_name && x.is_current) Object.assign(x, { is_current: false, status: "cancelled", cancelled_at: now });
  const status = ["active", "cancelled", "expired"].includes(str(b.status)) ? (str(b.status) as "active") : "active";
  const row = { id: nextPlatformId(s, "sub"), schema_name: c!.schema_name, plan_id: plan!.id, status, is_current: true, started_at: now, current_period_end: str(b.current_period_end) || null, cancelled_at: null, notes: str(b.notes) };
  s.subscriptions.push(row);
  logAction(c!.schema_name, actor, "subscription.assign", `أُسندت الباقة «${plan!.name}» (assign_plan).`);
  return ok(subscriptionView(row), 200, 201);
});

function billingView() {
  const s = st();
  const ready = s.clients.filter((c) => c.provisioning_status === "ready");
  return {
    ...s.billing,
    stores_without_subscription: ready.filter((c) => !currentSubscription(c.schema_name)).length,
    default_free_plan: s.plans.find((p) => p.is_default_free)?.name ?? null,
  };
}

on("GET", "billing-settings", null, () => ok(billingView(), 100));

on("PATCH", "billing-settings", "billing", async ({ body, actor }) => {
  const b = await body();
  const s = st();
  if (has(b, "subscriptions_enabled")) {
    const next = bool(b.subscriptions_enabled);
    if (next && !s.billing.subscriptions_enabled) {
      const free = s.plans.find((p) => p.is_default_free);
      if (!free) return bad({ detail: "لا باقة مجانية افتراضية — أنشئها أولاً." });
      for (const c of s.clients.filter((x) => x.provisioning_status === "ready" && !currentSubscription(x.schema_name))) {
        s.subscriptions.push({ id: nextPlatformId(s, "sub"), schema_name: c.schema_name, plan_id: free.id, status: "active", is_current: true, started_at: new Date().toISOString(), current_period_end: null, cancelled_at: null, notes: "إسناد تلقائي عند تفعيل الباقات" });
      }
    }
    s.billing.subscriptions_enabled = next;
  }
  if (has(b, "commission_enabled")) s.billing.commission_enabled = bool(b.commission_enabled);
  s.billing.updated_at = new Date().toISOString();
  logAction(null, actor, "billing_settings.update", `الباقات: ${s.billing.subscriptions_enabled ? "مفعّلة" : "متوقفة"} · العمولة: ${s.billing.commission_enabled ? "مفعّلة" : "متوقفة"}.`);
  return ok(billingView(), 160);
});

// ── M46: apps + billing overrides ──────────────────────────────────────────────────────
function appView(a: AppRow) {
  return { ...a, display_price: a.is_free ? "مجاني" : money(Number(a.price), a.currency), installations: st().installations.filter((i) => i.app_code === a.code).length };
}

function validateApp(b: Body, selfCode: string | null): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  const code = str(b.code);
  if (!/^[a-z0-9_]{2,40}$/.test(code)) e.code = ["حروف لاتينية صغيرة وأرقام و_ (2–40)."];
  else if (st().apps.some((a) => a.code === code && a.code !== selfCode)) e.code = ["الكود مستخدم."];
  if (!str(b.name)) e.name = ["أدخل اسم التطبيق."];
  if (!decimal(b.price)) e.price = ["أدخل سعراً صحيحاً."];
  if (!(CURRENCIES as readonly string[]).includes(str(b.currency))) e.currency = ["عملة غير معروفة."];
  if (!["monthly", "yearly"].includes(str(b.billing_interval))) e.billing_interval = ["فترة غير معروفة."];
  return e;
}

function appFields(b: Body): AppRow {
  return {
    code: str(b.code),
    name: str(b.name),
    description: str(b.description),
    icon: str(b.icon),
    is_listed: bool(b.is_listed),
    is_free: bool(b.is_free),
    price: Number(str(b.price)).toFixed(2),
    currency: str(b.currency) as Currency,
    billing_interval: str(b.billing_interval) as "monthly",
    billing_enabled: bool(b.billing_enabled),
  };
}

on("GET", "apps", null, () => ok(st().apps.map(appView)));
on("POST", "apps", "apps", async ({ body, actor }) => {
  const b = await body();
  const e = validateApp(b, null);
  if (Object.keys(e).length) return bad(e);
  const row = appFields(b);
  st().apps.push(row);
  logAction(null, actor, "app.create", `أُضيف التطبيق «${row.name}».`);
  return ok(appView(row), 200, 201);
});
on("PATCH", "apps/:code", "apps", async ({ params, body, actor }) => {
  const a = st().apps.find((x) => x.code === params.code);
  if (!a) return notFound("التطبيق");
  const b = { ...a, ...(await body()), code: a.code } as Body;
  const e = validateApp(b, a.code);
  if (Object.keys(e).length) return bad(e);
  Object.assign(a, appFields(b));
  logAction(null, actor, "app.update", `عُدِّل التطبيق «${a.name}».`);
  return ok(appView(a));
});

on("GET", "app-billing-overrides", null, ({ url }) => {
  const app = url.searchParams.get("app");
  const s = st();
  return ok(
    s.appOverrides
      .filter((o) => !app || o.app_code === app)
      .map((o) => ({ ...o, app_name: s.apps.find((a) => a.code === o.app_code)?.name ?? o.app_code, store_name: findClient(o.schema_name)?.name ?? o.schema_name })),
  );
});
on("POST", "app-billing-overrides", "apps", async ({ body, actor }) => {
  const b = await body();
  const s = st();
  const e: Record<string, string[]> = {};
  const app = s.apps.find((a) => a.code === str(b.app_code));
  const c = findClient(str(b.schema_name));
  if (!app) e.app_code = ["اختر تطبيقاً."];
  if (!c) e.schema_name = ["اختر متجراً."];
  if (app && c && s.appOverrides.some((o) => o.app_code === app.code && o.schema_name === c.schema_name)) e.schema_name = ["لهذا المتجر استثناء على هذا التطبيق — عدّل القائم."];
  if (Object.keys(e).length) return bad(e);
  const row = { id: nextPlatformId(s, "app_override"), app_code: app!.code, schema_name: c!.schema_name, is_billed: bool(b.is_billed), notes: str(b.notes) };
  s.appOverrides.push(row);
  logAction(c!.schema_name, actor, "app_override.create", `استثناء فوترة «${app!.name}»: ${row.is_billed ? "يُفوتر" : "بلا فوترة"}.`);
  return ok({ ...row, app_name: app!.name, store_name: c!.name }, 180, 201);
});
on("DELETE", "app-billing-overrides/:id", "apps", ({ params }) => {
  const s = st();
  if (!s.appOverrides.some((o) => o.id === Number(params.id))) return handled("الاستثناء");
  s.appOverrides = s.appOverrides.filter((o) => o.id !== Number(params.id));
  return mockJson(null, { status: 204, delay: 120 });
});

// ── M20: market categories ─────────────────────────────────────────────────────────────
function categoriesView() {
  const s = st();
  return [...s.categories].sort((a, b) => a.display_order - b.display_order).map((c) => ({ ...c, stores_count: s.clients.filter((x) => x.interested_categories.includes(c.id)).length }));
}
on("GET", "market-categories", null, () => ok(categoriesView()));
on("POST", "market-categories", "catalog", async ({ body }) => {
  const b = await body();
  const name = str(b.name);
  const s = st();
  if (!name) return bad({ name: ["أدخل اسم الفئة."] });
  if (s.categories.some((c) => c.name === name)) return bad({ name: ["الفئة موجودة."] });
  s.categories.push({ id: nextPlatformId(s, "category"), name, display_order: s.categories.length + 1, is_active: has(b, "is_active") ? bool(b.is_active) : true });
  return ok(categoriesView(), 160, 201);
});
on("POST", "market-categories/reorder", "catalog", async ({ body }) => {
  const ids = (await body()).ids;
  const s = st();
  if (!Array.isArray(ids) || ids.length !== s.categories.length || !s.categories.every((c) => ids.map(Number).includes(c.id))) return bad({ ids: ["أرسل كل الفئات بترتيبها الجديد."] });
  ids.map(Number).forEach((id, i) => {
    s.categories.find((c) => c.id === id)!.display_order = i + 1;
  });
  return ok(categoriesView(), 140);
});
on("PATCH", "market-categories/:id", "catalog", async ({ params, body }) => {
  const c = st().categories.find((x) => x.id === Number(params.id));
  if (!c) return notFound("الفئة");
  const b = await body();
  if (has(b, "name")) {
    if (!str(b.name)) return bad({ name: ["أدخل اسم الفئة."] });
    c.name = str(b.name);
  }
  if (has(b, "is_active")) c.is_active = bool(b.is_active);
  return ok(categoriesView());
});
on("DELETE", "market-categories/:id", "catalog", ({ params }) => {
  const s = st();
  const c = s.categories.find((x) => x.id === Number(params.id));
  if (!c) return handled("الفئة");
  const used = s.clients.filter((x) => x.interested_categories.includes(c.id)).length;
  if (used) return bad({ detail: `الفئة مختارة لدى ${used} متجراً — عطّلها بدل الحذف.` }, 409);
  s.categories = s.categories.filter((x) => x.id !== c.id);
  return mockJson(null, { status: 204, delay: 120 });
});

// ── M20: Sharwa Ship zones ─────────────────────────────────────────────────────────────
function zoneView(z: PlatformState["zones"][number]) {
  return { ...z, display_price: money(Number(z.price), z.currency) };
}
function validateZone(b: Body, selfId: number | null) {
  const e: Record<string, string[]> = {};
  const code = str(b.code).toUpperCase();
  if (!/^[A-Z]{3}-\d{2}$/.test(code)) e.code = ["مثل SAN-01."];
  else if (st().zones.some((z) => z.code === code && z.id !== selfId)) e.code = ["الكود مستخدم لمنطقة أخرى."];
  if (!str(b.name)) e.name = ["أدخل اسم المنطقة."];
  if (!decimal(b.price)) e.price = ["أدخل سعراً صحيحاً."];
  if (!(CURRENCIES as readonly string[]).includes(str(b.currency))) e.currency = ["عملة غير معروفة."];
  const div = Number(b.volumetric_divisor);
  if (!Number.isInteger(div) || div < 1000 || div > 10000) e.volumetric_divisor = ["بين 1000 و10000 (الافتراضي 5000)."];
  const lat = Number(str(b.center_latitude));
  const lng = Number(str(b.center_longitude));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.center_latitude = ["خط عرض صحيح."];
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.center_longitude = ["خط طول صحيح."];
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(str(b.radius_km)) || Number(str(b.radius_km)) <= 0) e.radius_km = ["نصف قطر صحيح بالكيلومتر."];
  return e;
}
const zoneFields = (b: Body) => ({
  code: str(b.code).toUpperCase(),
  name: str(b.name),
  price: Number(str(b.price)).toFixed(2),
  currency: str(b.currency) as Currency,
  volumetric_divisor: Number(b.volumetric_divisor),
  center_latitude: str(b.center_latitude),
  center_longitude: str(b.center_longitude),
  radius_km: str(b.radius_km),
  is_active: bool(b.is_active),
  sort_order: Number(b.sort_order ?? 0) || 0,
});
on("GET", "sharwa-ship/zones", null, () => ok([...st().zones].sort((a, b) => a.sort_order - b.sort_order).map(zoneView)));
on("POST", "sharwa-ship/zones", "zones", async ({ body, actor }) => {
  const b = await body();
  const e = validateZone(b, null);
  if (Object.keys(e).length) return bad(e);
  const s = st();
  const row = { id: nextPlatformId(s, "zone"), ...zoneFields(b) };
  s.zones.push(row);
  logAction(null, actor, "zone.create", `أُضيفت منطقة ${row.code}.`);
  return ok(zoneView(row), 180, 201);
});
on("PATCH", "sharwa-ship/zones/:id", "zones", async ({ params, body }) => {
  const z = st().zones.find((x) => x.id === Number(params.id));
  if (!z) return notFound("المنطقة");
  const b = { ...z, ...(await body()) } as Body;
  const e = validateZone(b, z.id);
  if (Object.keys(e).length) return bad(e);
  Object.assign(z, zoneFields(b));
  return ok(zoneView(z));
});
on("DELETE", "sharwa-ship/zones/:id", "zones", ({ params }) => {
  const s = st();
  if (!s.zones.some((z) => z.id === Number(params.id))) return handled("المنطقة");
  s.zones = s.zones.filter((z) => z.id !== Number(params.id));
  return mockJson(null, { status: 204, delay: 120 });
});

// ── M20: pending webhook events ────────────────────────────────────────────────────────
function eventView(e: PlatformState["webhookEvents"][number]) {
  const c = e.schema_name ? findClient(e.schema_name) : undefined;
  return { ...e, payload: JSON.stringify(e.payload, null, 2), store_name: c?.name ?? null, store_missing: Boolean(e.schema_name && !c) };
}
on("GET", "webhook-events", null, ({ url }) => {
  const p = url.searchParams;
  const status = p.get("status");
  const source = p.get("source");
  const rows = st()
    .webhookEvents.filter((e) => (!status || e.status === status) && (!source || e.source === source))
    .sort((a, b) => b.received_at.localeCompare(a.received_at))
    .map(eventView);
  return ok(paginate(rows, p));
});
on("POST", "webhook-events/:id/:action", "webhooks", ({ params, actor }) => {
  const e = st().webhookEvents.find((x) => x.id === Number(params.id));
  if (!e || e.status !== "pending") return handled("الحدث");
  const view = eventView(e);
  if (params.action === "retry") {
    if (view.store_missing) return bad({ detail: "المتجر لم يعد موجوداً — التجاهل فقط." }, 400);
    e.attempts += 1;
    e.status = "resolved";
  } else if (params.action === "discard") {
    e.status = "discarded";
  } else return notFound("الإجراء");
  e.resolved_at = new Date().toISOString();
  logAction(e.schema_name, actor, `webhook_event.${params.action}`, `${params.action === "retry" ? "أُعيدت معالجة" : "تُجوهل"} حدث ${e.source} · ${e.event_type}.`);
  return ok({ detail: params.action === "retry" ? "أُعيدت معالجة الحدث بنجاح." : "تم تجاهل الحدث.", level: "success", event: eventView(e) }, 200);
});

// ── M45: dues ──────────────────────────────────────────────────────────────────────────
const PERIOD_FACTOR: Record<string, number> = { today: 1 / 30, "7d": 7 / 30, "30d": 1 };
const MONTH = new Date(FIXTURE_NOW).toISOString().slice(0, 7);
const YEAR = MONTH.slice(0, 4);

function periodLabel(app: AppRow): string {
  return app.billing_interval === "yearly" ? YEAR : MONTH;
}

function billable(i: InstallationRowM): { app: AppRow; expired: boolean } | null {
  const s = st();
  const app = s.apps.find((a) => a.code === i.app_code);
  if (!app || app.is_free || !app.billing_enabled) return null;
  const ov = s.appOverrides.find((o) => o.app_code === app.code && o.schema_name === i.schema_name);
  if (ov && !ov.is_billed) return null;
  const expired = Boolean(i.subscription_expires_at && Date.parse(i.subscription_expires_at) < FIXTURE_NOW);
  return { app, expired };
}

on("GET", "dues/overview", null, ({ url }) => {
  const s = st();
  const q = str(url.searchParams.get("q")).toLowerCase();
  const period = PERIOD_FACTOR[url.searchParams.get("period") ?? ""] !== undefined ? url.searchParams.get("period")! : "30d";
  const f = PERIOD_FACTOR[period]!;
  const rows = s.clients
    .filter((c) => c.provisioning_status === "ready" && c.is_active)
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.schema_name.includes(q))
    .map((c) => {
      const snap = c.snapshot ? { date: c.snapshot.date, orders_count: Math.round(c.snapshot.orders_count * f), revenue: Math.round(c.snapshot.revenue_sar * f * 100) / 100 } : null;
      return {
        sort: snap?.revenue ?? -1,
        row: {
          schema_name: c.schema_name,
          name: c.name,
          merchant_phone: c.merchant_phone,
          snapshot: snap ? { date: snap.date, orders_count: snap.orders_count, display_revenue_sar: money(snap.revenue, "SAR") } : null,
          wallet: walletBalances(c.merchant_phone),
          pending_count: s.commissions.filter((r) => r.schema_name === c.schema_name && r.status === "pending").length + s.charges.filter((r) => r.schema_name === c.schema_name && r.status === "pending").length,
        },
      };
    })
    .sort((a, b) => b.sort - a.sort)
    .map((x) => x.row);
  return ok({ period, results: rows }, 220);
});

function duesDetail(c: ClientRow) {
  const s = st();
  const pc = s.commissions.filter((r) => r.schema_name === c.schema_name && r.status === "pending").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pa = s.charges.filter((r) => r.schema_name === c.schema_name && r.status === "pending");
  const waived = s.charges.filter((r) => r.schema_name === c.schema_name && r.status === "waived");
  const installs = s.installations.filter((i) => i.schema_name === c.schema_name);
  const uninvoiced = installs
    .filter((i) => i.is_active || i.suspended_by_platform)
    .map((i) => ({ i, b: billable(i) }))
    .filter((x): x is { i: InstallationRowM; b: { app: AppRow; expired: boolean } } => Boolean(x.b) && !x.b!.expired)
    .map(({ i, b }) => ({
      installation_id: i.id,
      app_code: b.app.code,
      app_name: b.app.name,
      period_label: periodLabel(b.app),
      already_generated: s.charges.some((ch) => ch.installation_id === i.id && ch.period_label === periodLabel(b.app)),
    }));
  return {
    schema_name: c.schema_name,
    name: c.name,
    merchant_phone: c.merchant_phone,
    pending_commissions: pc.map(commissionView),
    pending_charges: pa.map(chargeView),
    uninvoiced,
    waived_charges: waived.map(chargeView),
    installations: installs.map((i) => ({
      installation_id: i.id,
      app_code: i.app_code,
      app_name: s.apps.find((a) => a.code === i.app_code)?.name ?? i.app_code,
      suspended_by_platform: i.suspended_by_platform,
      subscription_expires_at: i.subscription_expires_at,
      expired: Boolean(i.subscription_expires_at && Date.parse(i.subscription_expires_at) < FIXTURE_NOW),
    })),
    totals: totalsFor(pc, pa),
    wallet: walletBalances(c.merchant_phone),
    snapshot: snapshotView(c),
    has_dues: pc.length + pa.length > 0,
  };
}

function readyClient(schema: string): ClientRow | null {
  const c = findClient(schema);
  return c && c.provisioning_status === "ready" ? c : null;
}

on("GET", "dues/:schema", null, ({ params }) => {
  const c = readyClient(params.schema!);
  if (!c) return bad({ detail: "متجر غير معروف أو غير جاهز." }, 404);
  return ok(duesDetail(c), 220);
});

on("POST", "dues/:schema/actions", "dues", async ({ params, body, actor }) => {
  const c = readyClient(params.schema!);
  if (!c) return bad({ detail: "متجر غير معروف أو غير جاهز." }, 404);
  const b = await body();
  const action = str(b.action);
  const s = st();
  const id = Number(b.record_id);
  const done = (detail: string, level: "success" | "warning" = "success") => {
    logAction(c.schema_name, actor, `dues.${action}`, detail);
    return ok({ detail, level, entry: duesDetail(c) }, 220);
  };
  const fail = (detail: string) => mockJson({ detail, level: "error" }, { status: 400, delay: 160 });

  switch (action) {
    case "collect_commission":
    case "waive_commission": {
      const r = s.commissions.find((x) => x.id === id && x.schema_name === c.schema_name);
      if (!r || r.status !== "pending") return handled("سجل العمولة");
      if (action === "waive_commission") {
        r.status = "waived";
        return done(`تم إعفاء عمولة الطلب #${r.order_id} بلا أي خصم.`);
      }
      if (r.amount <= 0 || r.commission_type === "none") return fail("لا مبلغ للتحصيل في هذا السجل — استخدم «إعفاء».");
      const w = walletOf(c.merchant_phone);
      if (!w) return fail("تعذّر التحصيل: لا محفظة شروة باي للتاجر.");
      const bal = w.balances[r.currency] ?? 0;
      if (bal < r.amount) return fail(`تعذّر التحصيل: رصيد ${r.currency} في محفظة التاجر (${money(bal, r.currency)}) أقل من ${money(r.amount, r.currency)}.`);
      w.balances[r.currency] = Math.round((bal - r.amount) * 100) / 100;
      w.transactions.unshift({ id: nextPlatformId(s, "wtx"), reason: "platform_fee", amount: r.amount, currency: r.currency, direction: "debit", reference: `COMM-${r.order_id}`, created_at: new Date().toISOString() });
      r.status = "collected";
      r.collected_at = new Date().toISOString();
      return done(`تم تحصيل عمولة الطلب #${r.order_id} من محفظة شروة باي للتاجر.`);
    }
    case "collect_charge":
    case "waive_charge":
    case "unwaive_charge": {
      const r = s.charges.find((x) => x.id === id && x.schema_name === c.schema_name);
      const want = action === "unwaive_charge" ? "waived" : "pending";
      if (!r || r.status !== want) return handled("فاتورة التطبيق");
      if (action === "waive_charge") {
        r.status = "waived";
        return done(`تم إعفاء فاتورة «${r.app_name_snapshot}» للفترة ${r.period_label} بلا أي خصم.`);
      }
      if (action === "unwaive_charge") {
        r.status = "pending";
        return done(`أُلغي إعفاء فاتورة «${r.app_name_snapshot}» للفترة ${r.period_label} — عادت مستحقة.`, "warning");
      }
      const w = walletOf(c.merchant_phone);
      if (!w) return fail("تعذّر التحصيل: لا محفظة شروة باي للتاجر.");
      const bal = w.balances[r.currency] ?? 0;
      if (bal < r.price) return fail(`تعذّر التحصيل: رصيد ${r.currency} في محفظة التاجر (${money(bal, r.currency)}) أقل من ${money(r.price, r.currency)}.`);
      w.balances[r.currency] = Math.round((bal - r.price) * 100) / 100;
      w.transactions.unshift({ id: nextPlatformId(s, "wtx"), reason: "platform_fee", amount: r.price, currency: r.currency, direction: "debit", reference: `APP-${r.app_code}-${r.period_label}`, created_at: new Date().toISOString() });
      r.status = "collected";
      r.collected_at = new Date().toISOString();
      return done(`تم تحصيل فاتورة «${r.app_name_snapshot}» للفترة ${r.period_label} من محفظة شروة باي للتاجر.`);
    }
    case "generate_charge": {
      const inst = s.installations.find((i) => i.id === Number(b.installation_id) && i.schema_name === c.schema_name);
      if (!inst) return handled("التثبيت");
      const bill = billable(inst);
      if (!bill) return fail("هذا التطبيق لا يُفوتر لهذا المتجر.");
      if (bill.expired) return fail("انتهى اشتراك التطبيق — لا فاتورة للدورة.");
      const label = periodLabel(bill.app);
      if (s.charges.some((ch) => ch.installation_id === inst.id && ch.period_label === label)) return bad({ detail: `فاتورة ${label} مولَّدة بالفعل لهذا التثبيت.`, level: "error" }, 409);
      s.charges.push({ id: nextPlatformId(s, "charge"), schema_name: c.schema_name, installation_id: inst.id, app_code: bill.app.code, app_name_snapshot: bill.app.name, period_label: label, price: Number(bill.app.price), currency: bill.app.currency, status: "pending", created_at: new Date().toISOString(), collected_at: null });
      return done(`وُلِّدت فاتورة «${bill.app.name}» للفترة ${label}.`);
    }
    case "suspend_app":
    case "reactivate_app": {
      const inst = s.installations.find((i) => i.id === Number(b.installation_id) && i.schema_name === c.schema_name);
      if (!inst) return handled("التثبيت");
      const app = s.apps.find((a) => a.code === inst.app_code);
      if (action === "suspend_app") {
        if (inst.suspended_by_platform) return bad({ detail: "التطبيق معلَّق بالفعل.", level: "error" }, 409);
        inst.suspended_by_platform = true;
        inst.is_active = false;
        return done(`عُلِّق «${app?.name ?? inst.app_code}» لدى ${c.name} حتى السداد.`, "warning");
      }
      if (!inst.suspended_by_platform) return bad({ detail: "التطبيق غير معلَّق.", level: "error" }, 409);
      inst.suspended_by_platform = false;
      inst.is_active = true;
      return done(`أُعيد تفعيل «${app?.name ?? inst.app_code}» لدى ${c.name}.`);
    }
    default:
      return bad({ action: ["إجراء غير معروف."] });
  }
});

// ── M20: Sharwa Pay approvals ──────────────────────────────────────────────────────────
on("GET", "sharwa-pay/topups", null, ({ url }) => {
  const p = url.searchParams;
  const status = p.get("status");
  const q = str(p.get("q"));
  const rows = st()
    .topups.filter((t) => (!status || t.status === status) && (!q || t.customer_phone.includes(q) || t.bank_transaction_id.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || b.created_at.localeCompare(a.created_at))
    .map(topupView);
  return ok(paginate(rows, p));
});

on("POST", "sharwa-pay/topups/:id/:action", "sharwa_pay", async ({ params, body, actor }) => {
  const s = st();
  const t = s.topups.find((x) => x.id === Number(params.id));
  if (!t || t.status !== "pending") return handled("طلب الشحن");
  const note = str((await body()).note);
  const now = new Date().toISOString();
  if (params.action === "approve") {
    const dup = s.topups.find((x) => x.id !== t.id && x.status === "approved" && x.bank_transaction_id === t.bank_transaction_id);
    if (dup) return bad({ detail: `رقم الحوالة ${t.bank_transaction_id} مستخدم في طلب مقبول سابق (#${dup.id}).`, duplicate_of: dup.id }, 400);
    t.status = "approved";
    let w = s.wallets.get(t.customer_phone);
    if (!w) {
      w = { customer_phone: t.customer_phone, customer_name: null, balances: {}, transactions: [] };
      s.wallets.set(t.customer_phone, w);
    }
    w.balances[t.currency] = Math.round(((w.balances[t.currency] ?? 0) + t.amount) * 100) / 100;
    w.transactions.unshift({ id: nextPlatformId(s, "wtx"), reason: "topup_manual", amount: t.amount, currency: t.currency, direction: "credit", reference: `TOP-${t.id}`, created_at: now });
  } else if (params.action === "reject") {
    if (!note) return bad({ note: ["اذكر سبب الرفض — يصل للعميل."] });
    t.status = "rejected";
  } else return notFound("الإجراء");
  Object.assign(t, { note: note || t.note, decided_at: now, decided_by: actor.username });
  logAction(null, actor, `sharwa_pay.topup.${params.action}`, `${params.action === "approve" ? "قُبل" : "رُفض"} طلب الشحن #${t.id} (${money(t.amount, t.currency)}).`);
  return ok({ detail: params.action === "approve" ? `قُبل الشحن وأُضيف ${money(t.amount, t.currency)} إلى محفظة العميل.` : "رُفض طلب الشحن.", level: "success", topup: topupView(t) }, 220);
});

on("GET", "sharwa-pay/withdrawals", null, ({ url }) => {
  const p = url.searchParams;
  const status = p.get("status");
  const rows = st()
    .withdrawals.filter((w) => !status || w.status === status)
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || b.created_at.localeCompare(a.created_at))
    .map(withdrawalView);
  return ok(paginate(rows, p));
});

on("POST", "sharwa-pay/withdrawals/:id/:action", "sharwa_pay", async ({ params, body, actor }) => {
  const s = st();
  const w = s.withdrawals.find((x) => x.id === Number(params.id));
  if (!w || w.status !== "pending") return handled("طلب السحب");
  const note = str((await body()).note);
  const now = new Date().toISOString();
  if (params.action === "confirm") w.status = "approved";
  else if (params.action === "reject") {
    if (!note) return bad({ note: ["اذكر سبب الرفض."] });
    w.status = "rejected";
    const wallet = s.wallets.get(w.customer_phone);
    if (wallet) {
      wallet.balances[w.currency] = Math.round(((wallet.balances[w.currency] ?? 0) + w.amount) * 100) / 100;
      wallet.transactions.unshift({ id: nextPlatformId(s, "wtx"), reason: "withdrawal_reversal", amount: w.amount, currency: w.currency, direction: "credit", reference: `WD-${w.id}`, created_at: now });
    }
  } else return notFound("الإجراء");
  Object.assign(w, { note: note || w.note, decided_at: now, decided_by: actor.username });
  logAction(null, actor, `sharwa_pay.withdrawal.${params.action}`, `${params.action === "confirm" ? "نُفِّذ" : "رُفض"} طلب السحب #${w.id}.`);
  return ok({ detail: params.action === "confirm" ? "سُجِّل تنفيذ التحويل." : `رُفض السحب وأُعيد ${money(w.amount, w.currency)} إلى المحفظة.`, level: "success", withdrawal: withdrawalView(w) }, 220);
});

on("GET", "sharwa-pay/wallets/:phone", null, ({ params }) => {
  const w = walletOf(params.phone!);
  if (!w) return notFound("المحفظة");
  const merchant = st().clients.some((c) => c.merchant_phone === w.customer_phone);
  return ok({
    customer_phone: w.customer_phone,
    customer_name: w.customer_name,
    is_merchant: merchant,
    balances: CURRENCIES.filter((c) => w.balances[c] !== undefined).map((c) => ({ currency: c, display_balance: money(w.balances[c]!, c) })),
    transactions: w.transactions.map((t) => ({ id: t.id, reason: t.reason, display_amount: money(t.amount, t.currency), currency: t.currency, direction: t.direction, reference: t.reference, created_at: t.created_at })),
  });
});

