import { FEATURE_KEYS } from "@/lib/access";
import type { Currency } from "@/lib/schemas/money";
import { displayMoney, int, pick, seeded } from "@/mocks/_fixtures";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";
import { MODULE_GROUPS, groupOf } from "@/features/platform-admin/schemas/billing";
import type { DecidedBy } from "@/features/platform-admin/schemas/billing";
import type { DeactivationStatus, SharwaShipState, SubscriptionStatus } from "@/features/platform-admin/schemas/stores";
import type { ProvisioningState } from "@/features/platform-admin/schemas/common";
import type { DueStatus, RequestStatus } from "@/features/platform-admin/schemas/money";
import type { WebhookEventStatus } from "@/features/platform-admin/schemas/catalog";

/**
 * The platform's public-schema rows (M20/M45/M46 — every row `[NEEDS BACKEND]`), one bag
 * on the shared mock root (`storeState(null, …)`) so route handlers and RSCs see the same
 * objects in one Node process.
 *
 * It is also the ONE source for the platform data the merchant side reads:
 * - each store's effective features (`effectiveFeatures`) → the merchant session (M03);
 * - Sharwa Ship zones → M15 «شروة شيب» (read-only there);
 * - market categories → the M02 wizard's `public/market-categories`.
 *
 * Seeds keep the fixture stores (`noor`, `shop`, `pending1`, `closed`) exactly as the
 * earlier phases expect them: no override, no plan gate, so they keep all 39 features.
 */
export interface ClientRow {
  schema_name: string;
  name: string;
  primary_domain: string;
  domains: Array<{ id: number; domain: string; is_primary: boolean }>;
  merchant_phone: string | null;
  interested_categories: number[];
  terms_accepted_at: string | null;
  is_active: boolean;
  created_on: string;
  provisioning_status: ProvisioningState;
  provisioning_error: string | null;
  provisioning_started_at: string | null;
  provisioned_at: string | null;
  sharwa_ship: SharwaShipState;
  /** A queued Celery job finishes after this many reads (dev stand-in for the worker). */
  pending_job: { kind: "reprovision" | "sharwa_ship"; reads_left: number; target?: boolean } | null;
  snapshot: { date: string; orders_count: number; completed_orders_count: number; refunded_orders_count: number; revenue_sar: number } | null;
}

export interface PlanRow {
  id: number;
  code: string;
  name: string;
  description: string;
  is_free: boolean;
  price: string;
  currency: Currency;
  billing_interval: "monthly" | "yearly" | "lifetime";
  commission_type: "none" | "percentage" | "fixed";
  commission_value: string;
  max_products: number | null;
  max_orders_per_month: number | null;
  is_active: boolean;
  is_default_free: boolean;
  display_order: number;
}

export interface FeatureRow {
  code: string;
  name: string;
  description: string;
  module_group: string;
  is_active_globally: boolean;
  requires_plan: boolean;
}

export interface OverrideRow {
  id: number;
  feature_code: string;
  schema_name: string;
  is_enabled: boolean;
  notes: string;
  updated_at: string;
}

export interface SubscriptionRowM {
  id: number;
  schema_name: string;
  plan_id: number;
  status: SubscriptionStatus;
  is_current: boolean;
  started_at: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  notes: string;
}

export interface AppRow {
  code: string;
  name: string;
  description: string;
  icon: string;
  is_listed: boolean;
  is_free: boolean;
  price: string;
  currency: Currency;
  billing_interval: "monthly" | "yearly";
  billing_enabled: boolean;
}

export interface InstallationRowM {
  id: number;
  schema_name: string;
  app_code: string;
  is_active: boolean;
  suspended_by_platform: boolean;
  subscription_expires_at: string | null;
  installed_at: string;
}

export interface AppOverrideRow {
  id: number;
  app_code: string;
  schema_name: string;
  is_billed: boolean;
  notes: string;
}

export interface CommissionRow {
  id: number;
  schema_name: string;
  order_id: number;
  plan_name_snapshot: string;
  commission_type: "none" | "percentage" | "fixed";
  commission_value: string;
  amount: number;
  currency: Currency;
  status: DueStatus;
  created_at: string;
  collected_at: string | null;
}

export interface ChargeRow {
  id: number;
  schema_name: string;
  installation_id: number;
  app_code: string;
  app_name_snapshot: string;
  period_label: string;
  price: number;
  currency: Currency;
  status: DueStatus;
  created_at: string;
  collected_at: string | null;
}

export interface WalletTx {
  id: number;
  reason: "topup_manual" | "topup_auto" | "purchase" | "purchase_refund" | "withdrawal" | "withdrawal_reversal" | "platform_fee";
  amount: number;
  currency: Currency;
  direction: "credit" | "debit";
  reference: string;
  created_at: string;
}

export interface WalletRow {
  customer_phone: string;
  customer_name: string | null;
  balances: Partial<Record<Currency, number>>;
  transactions: WalletTx[];
}

export interface TopupRow {
  id: number;
  customer_phone: string;
  amount: number;
  currency: Currency;
  bank_name: string;
  bank_transaction_id: string;
  receipt_image: string;
  status: RequestStatus;
  note: string;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface WithdrawalRow {
  id: number;
  customer_phone: string;
  amount: number;
  currency: Currency;
  destination: string;
  status: RequestStatus;
  note: string;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface ZoneRow {
  id: number;
  code: string;
  name: string;
  price: string;
  currency: Currency;
  volumetric_divisor: number;
  center_latitude: string | null;
  center_longitude: string | null;
  radius_km: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface MarketCategoryRow {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface WebhookEventRow {
  id: number;
  source: string;
  event_type: string;
  schema_name: string | null;
  status: WebhookEventStatus;
  reason: string;
  payload: Record<string, unknown>;
  attempts: number;
  received_at: string;
  resolved_at: string | null;
}

export interface DeactivationRow {
  id: number;
  schema_name: string;
  status: DeactivationStatus;
  reason: string;
  grace_period_ends_at: string | null;
  settled_custody: boolean;
  created_at: string;
  updated_at: string;
  by: string;
  /** Set by «إعادة التفعيل» — the record stays in the history (Django keeps it too, INT-030). */
  reinstated_at: string | null;
}

export interface ActionRow {
  id: number;
  schema_name: string | null;
  at: string;
  actor: { username: string; role: "superuser" | "operator" };
  action: string;
  detail: string;
}

export interface PlatformState {
  clients: ClientRow[];
  plans: PlanRow[];
  features: FeatureRow[];
  planFeatures: Map<string, boolean>;
  overrides: OverrideRow[];
  subscriptions: SubscriptionRowM[];
  billing: { subscriptions_enabled: boolean; commission_enabled: boolean; updated_at: string };
  apps: AppRow[];
  installations: InstallationRowM[];
  appOverrides: AppOverrideRow[];
  commissions: CommissionRow[];
  charges: ChargeRow[];
  wallets: Map<string, WalletRow>;
  topups: TopupRow[];
  withdrawals: WithdrawalRow[];
  zones: ZoneRow[];
  categories: MarketCategoryRow[];
  webhookEvents: WebhookEventRow[];
  deactivations: DeactivationRow[];
  actions: ActionRow[];
  ids: Record<string, number>;
}

export const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
export const ahead = (hours: number) => new Date(FIXTURE_NOW + hours * 3_600_000).toISOString();

export function nextPlatformId(state: PlatformState, entity: string): number {
  state.ids[entity] = (state.ids[entity] ?? 1000) + 1;
  return state.ids[entity]!;
}

export function cellKey(planId: number, code: string): string {
  return `${planId}:${code}`;
}

/** Arabic names of the 39 keys (discovery 01 §7) + `pos` (Phase 7 decision 1) — the catalogue the server would send. */
const FEATURE_NAMES: Record<string, string> = {
  refunds: "الاسترجاعات",
  inventory: "المخزون",
  bulk_upload: "الرفع الجماعي",
  marketing: "التسويق",
  campaigns: "الحملات",
  promotions: "العروض الترويجية",
  coupon: "الكوبونات",
  tracking_tools: "أدوات التتبع",
  timeline: "الجدول الزمني",
  abandoned_carts: "السلات المتروكة",
  influencers: "المؤثرون",
  affiliates: "المسوّقون بالعمولة",
  bookings: "الحجوزات",
  storefront_design: "تصميم المتجر",
  contact_info: "معلومات التواصل",
  store_policies: "سياسات المتجر",
  customer_wallets: "محافظ العملاء",
  reports: "التقارير",
  shipping_settings: "إعدادات الشحن",
  shipping_companies: "شركات الشحن",
  shipping_providers: "مندوبو الشحن",
  payment_gateways: "بوابات الدفع",
  local_wallets: "المحافظ المحلية",
  bank_transfers: "التحويل البنكي",
  currency_settings: "أسعار الصرف",
  seo_settings: "إعدادات SEO",
  gift_settings: "الإهداء",
  loyalty_settings: "نقاط الولاء",
  merchantwallet: "محفظة المتجر",
  app_marketplace: "متجر التطبيقات",
  pickuplocation: "نقاط الاستلام",
  sharwa_ship: "شروة شيب",
  customer_report: "تقرير العملاء",
  product_report: "تقرير المنتجات",
  multi_location: "تعدد المواقع",
  staff_rbac: "الموظفون والأدوار",
  social_channels: "قنوات التواصل",
  marketplaces: "الأسواق",
  dropshipping: "الدروبشيبينغ",
  pos: "نقطة البيع",
};

/** Premium keys: `requires_plan=true` — only bite once `subscriptions_enabled` is on. */
const REQUIRES_PLAN = new Set(["campaigns", "influencers", "affiliates", "customer_wallets", "reports", "multi_location", "staff_rbac", "social_channels", "marketplaces", "dropshipping", "sharwa_ship", "bookings", "pos"]);

/** Fixture stores the earlier phases' checks depend on — never touched by the seed's overrides. */
export const FIXTURE_SCHEMAS = ["noor", "shop", "pending1", "closed"] as const;

const STORE_NAMES = [
  ["atyab", "أطياب العود"],
  ["zahra", "زهرة الياسمين"],
  ["bunn", "بُن يافع"],
  ["sanaa", "سوق صنعاء"],
  ["aden", "عدن ستايل"],
  ["tamr", "تمور الوادي"],
  ["kids", "عالم الصغار"],
  ["techy", "تقنية بلس"],
  ["abaya", "عبايات لمار"],
  ["honey", "عسل دوعن"],
  ["mobile", "جوالات الريان"],
  ["books", "مكتبة المعرفة"],
  ["fit", "فت زون"],
  ["home", "بيتي الجميل"],
  ["glow", "جلو للتجميل"],
  ["spice", "بهارات الشرق"],
  ["shoes", "خطوات"],
  ["gifts", "هدايا الفرح"],
  ["watch", "ساعات الوقت"],
  ["coffee", "قهوة المكلا"],
  ["silver", "فضيات تهامة"],
  ["bags", "حقائب ريم"],
  ["toys", "ألعاب السعادة"],
  ["perfume", "عطور الحرمين"],
  ["fabric", "أقمشة الشامي"],
  ["baby", "بيبي كير"],
  ["sport", "رياضة اليمن"],
  ["optic", "نظارات الرؤية"],
  ["clean", "نظافة بلس"],
  ["dates", "تمر سكري"],
  ["phone", "اتصالات الحديدة"],
  ["salon", "صالون لمسة"],
  ["bakery", "مخبز الصباح"],
  ["flowers", "ورد الربيع"],
  ["tools", "عدّة المهني"],
  ["pets", "عالم الأليف"],
  ["print", "مطبعة الإتقان"],
  ["auto", "قطع غيار الأمان"],
  ["camp", "رحلات البر"],
  ["oud", "بخور الملوك"],
  ["shawl", "شمغ وعمائم"],
  ["kitchen", "مطبخ ماما"],
  ["laptop", "لابتوب سنتر"],
  ["gold", "ذهب الأمانة"],
  ["art", "فنون يمنية"],
  ["herbal", "أعشاب الجبل"],
  ["energy", "طاقة شمسية"],
  ["travel", "سفريات الأفق"],
  ["music", "أعواد صنعانية"],
  ["school", "قرطاسية النجاح"],
  ["kidswear", "ملابس أطفالي"],
  ["cosmo", "كوزمو"],
] as const;

function seed(): PlatformState {
  const rnd = seeded(2026);
  const base = process.env.TENANT_BASE_DOMAIN ?? "localhost";
  const state: PlatformState = {
    clients: [],
    plans: [],
    features: [],
    planFeatures: new Map(),
    overrides: [],
    subscriptions: [],
    billing: { subscriptions_enabled: false, commission_enabled: false, updated_at: at(24 * 90) },
    apps: [],
    installations: [],
    appOverrides: [],
    commissions: [],
    charges: [],
    wallets: new Map(),
    topups: [],
    withdrawals: [],
    zones: [],
    categories: [],
    webhookEvents: [],
    deactivations: [],
    actions: [],
    ids: {},
  };

  // ── plans ─────────────────────────────────────────────────────────────────────────
  state.plans = [
    { id: 1, code: "free", name: "المجانية", description: "للبدء: متجر كامل بحدود صغيرة.", is_free: true, price: "0.00", currency: "SAR", billing_interval: "monthly", commission_type: "percentage", commission_value: "3.00", max_products: 50, max_orders_per_month: 100, is_active: true, is_default_free: true, display_order: 1 },
    { id: 2, code: "basic", name: "الأساسية", description: "للمتاجر الناشئة.", is_free: false, price: "49.00", currency: "SAR", billing_interval: "monthly", commission_type: "percentage", commission_value: "2.00", max_products: 500, max_orders_per_month: 1000, is_active: true, is_default_free: false, display_order: 2 },
    { id: 3, code: "pro", name: "الاحترافية", description: "للمتاجر النامية مع الأدوات التسويقية.", is_free: false, price: "149.00", currency: "SAR", billing_interval: "monthly", commission_type: "percentage", commission_value: "1.00", max_products: null, max_orders_per_month: 10000, is_active: true, is_default_free: false, display_order: 3 },
    { id: 4, code: "business", name: "الأعمال", description: "سنوية للمتاجر الكبيرة.", is_free: false, price: "1490.00", currency: "SAR", billing_interval: "yearly", commission_type: "fixed", commission_value: "0.00", max_products: null, max_orders_per_month: null, is_active: true, is_default_free: false, display_order: 4 },
    { id: 5, code: "founders", name: "المؤسِّسون", description: "عرض الإطلاق — مغلق.", is_free: false, price: "990.00", currency: "USD", billing_interval: "lifetime", commission_type: "none", commission_value: "0.00", max_products: null, max_orders_per_month: null, is_active: false, is_default_free: false, display_order: 5 },
  ];

  // ── features ──────────────────────────────────────────────────────────────────────
  state.features = FEATURE_KEYS.map((code) => ({
    code,
    name: FEATURE_NAMES[code] ?? code,
    description: `مفتاح «${FEATURE_NAMES[code] ?? code}» في لوحة التاجر.`,
    module_group: groupOf(code).key,
    is_active_globally: true,
    requires_plan: REQUIRES_PLAN.has(code),
  }));
  const tiers: Record<number, (code: string) => boolean> = {
    1: (c) => !REQUIRES_PLAN.has(c) && !["promotions", "timeline", "abandoned_carts", "tracking_tools"].includes(c),
    2: (c) => !REQUIRES_PLAN.has(c) || ["reports", "sharwa_ship"].includes(c),
    3: (c) => !["marketplaces", "dropshipping", "multi_location"].includes(c),
    4: () => true,
    5: () => true,
  };
  for (const p of state.plans) for (const f of state.features) if (f.requires_plan || p.id <= 3) state.planFeatures.set(cellKey(p.id, f.code), tiers[p.id]!(f.code));

  // ── clients ───────────────────────────────────────────────────────────────────────
  const fixtures: ClientRow[] = [
    client("noor", "متجر نور", "967770000011", 24 * 220, "ready", { domains: ["noor-store.com"], sharwa_ship: "active" }),
    client("shop", "سوق الحكمة", "967770000022", 24 * 160, "ready", {}),
    client("pending1", "متجر قيد التجهيز", "967770000033", 1.5, "provisioning", { stalledMinutes: 90 }),
    client("closed", "متجر مغلق", "967770000044", 24 * 400, "ready", { is_active: false }),
  ];
  state.clients.push(...fixtures);
  STORE_NAMES.forEach(([slug, name], i) => {
    const hours = 24 * int(rnd, 2, 380) + i;
    let status: ProvisioningState = "ready";
    if (i % 17 === 5) status = "failed";
    else if (i === 9) status = "provisioning";
    else if (i === 30 || i === 44) status = "pending";
    const phone = i % 13 === 7 ? null : `9677${String(71000000 + i * 7919).slice(0, 8)}`;
    state.clients.push(
      client(slug, name, phone, status === "ready" ? hours : status === "failed" ? 24 * (i % 4) + 3 : 0.2 + i / 100, status, {
        sharwa_ship: i % 6 === 0 ? "active" : "inactive",
        error: status === "failed" ? pick(rnd, ["تعذّر إنشاء المخطط: انتهت مهلة الاتصال بقاعدة البيانات.", "فشل ترحيل catalog.0042 (قيد فريد).", "خادم Celery لم يستلم المهمة."]) : null,
        stalledMinutes: status === "provisioning" ? 12 : undefined,
      }),
    );
  });

  function client(
    schema: string,
    name: string,
    phone: string | null,
    hoursAgo: number,
    status: ProvisioningState,
    o: { domains?: string[]; is_active?: boolean; sharwa_ship?: SharwaShipState; error?: string | null; stalledMinutes?: number },
  ): ClientRow {
    const created = at(hoursAgo);
    const ready = status === "ready";
    const orders = ready ? int(rnd, 3, 900) : 0;
    const subdomainHost = `${schema}.${base}`;
    const domains = [{ id: nextPlatformId(state, "domain"), domain: subdomainHost, is_primary: !o.domains?.length }];
    for (const d of o.domains ?? []) domains.push({ id: nextPlatformId(state, "domain"), domain: d, is_primary: true });
    return {
      schema_name: schema,
      name,
      primary_domain: domains.find((d) => d.is_primary)!.domain,
      domains,
      merchant_phone: phone,
      interested_categories: [int(rnd, 1, 8)],
      terms_accepted_at: created,
      is_active: o.is_active ?? true,
      created_on: created,
      provisioning_status: status,
      provisioning_error: o.error ?? null,
      provisioning_started_at: status === "provisioning" ? new Date(FIXTURE_NOW - (o.stalledMinutes ?? 5) * 60_000).toISOString() : null,
      provisioned_at: ready ? created : null,
      sharwa_ship: o.sharwa_ship ?? "inactive",
      pending_job: null,
      snapshot: ready
        ? {
            date: at(20).slice(0, 10),
            orders_count: orders,
            completed_orders_count: Math.round(orders * 0.82),
            refunded_orders_count: Math.round(orders * 0.03),
            revenue_sar: Math.round(orders * (60 + rnd() * 140) * 100) / 100,
          }
        : null,
    };
  }

  // ── subscriptions: one current row per ready store; a history row for a few ─────────
  for (const c of state.clients.filter((x) => x.provisioning_status === "ready")) {
    const idx = state.clients.indexOf(c);
    const planId = c.schema_name === "noor" ? 3 : idx % 9 === 2 ? 2 : idx % 11 === 4 ? 4 : 1;
    if (idx % 7 === 3 && planId !== 1) {
      state.subscriptions.push({ id: nextPlatformId(state, "sub"), schema_name: c.schema_name, plan_id: 1, status: "cancelled", is_current: false, started_at: c.created_on, current_period_end: at(24 * 60), cancelled_at: at(24 * 60), notes: "ترقية" });
    }
    state.subscriptions.push({
      id: nextPlatformId(state, "sub"),
      schema_name: c.schema_name,
      plan_id: planId,
      status: c.is_active ? "active" : "expired",
      is_current: true,
      started_at: idx % 7 === 3 ? at(24 * 60) : c.created_on,
      current_period_end: planId === 1 ? null : ahead(24 * (idx % 25) + 30),
      cancelled_at: null,
      notes: "",
    });
  }

  // ── overrides (never on fixture stores) ─────────────────────────────────────────────
  const ov = (feature_code: string, schema_name: string, is_enabled: boolean, notes: string) =>
    state.overrides.push({ id: nextPlatformId(state, "override"), feature_code, schema_name, is_enabled, notes, updated_at: at(int(rnd, 10, 900)) });
  ov("marketplaces", "atyab", true, "تجربة أمازون — اتفاق شراكة");
  ov("dropshipping", "atyab", true, "مورد عطور معتمد");
  ov("bookings", "salon", true, "صالون — حجوزات بلا ترقية");
  ov("abandoned_carts", "zahra", false, "شكوى إزعاج رسائل — مؤقت");
  ov("sharwa_ship", "honey", true, "منطقة دوعن قيد الاختبار");
  ov("multi_location", "mobile", true, "ثلاثة فروع");

  // ── billing switches stay off: the platform's real state today (discovery 01 §2.2) ──

  // ── apps + installations + overrides ────────────────────────────────────────────────
  state.apps = [
    { code: "whatsapp_bot", name: "بوت واتساب", description: "ردود آلية وتأكيد الطلبات عبر واتساب.", icon: "message-circle", is_listed: true, is_free: false, price: "29.00", currency: "SAR", billing_interval: "monthly", billing_enabled: true },
    { code: "sharwa_ai", name: "شروة AI", description: "مساعد ذكي يردّ على العملاء والمسوّقين ويصعّد للموظفين.", icon: "bot", is_listed: true, is_free: false, price: "49.00", currency: "SAR", billing_interval: "monthly", billing_enabled: true },
    { code: "invoice_pro", name: "فواتير احترافية", description: "فواتير ضريبية بقوالب.", icon: "file-text", is_listed: true, is_free: false, price: "190.00", currency: "SAR", billing_interval: "yearly", billing_enabled: true },
    { code: "google_shopping", name: "Google Shopping", description: "مزامنة المنتجات مع Google Merchant.", icon: "shopping-bag", is_listed: true, is_free: true, price: "0.00", currency: "SAR", billing_interval: "monthly", billing_enabled: false },
    { code: "loyalty_plus", name: "ولاء بلس", description: "مستويات ولاء ومكافآت.", icon: "award", is_listed: true, is_free: false, price: "5000.00", currency: "YER_NEW", billing_interval: "monthly", billing_enabled: true },
    { code: "sms_gateway", name: "بوابة SMS", description: "رسائل نصية للعملاء.", icon: "smartphone", is_listed: true, is_free: false, price: "9.00", currency: "USD", billing_interval: "monthly", billing_enabled: true },
    { code: "live_chat", name: "دردشة مباشرة", description: "نافذة دردشة في المتجر — قيد المراجعة.", icon: "messages-square", is_listed: false, is_free: true, price: "0.00", currency: "SAR", billing_interval: "monthly", billing_enabled: true },
  ];
  // Subscription ends are compared with the REAL clock by the screens (`installationState`), so they are anchored
  // on it — anchored on FIXTURE_NOW they silently expired a few days after the fixture date (Sharwa AI first).
  const fromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
  const install = (schema: string, app_code: string, hoursAgo: number, o: Partial<InstallationRowM> = {}) => {
    const row: InstallationRowM = { id: nextPlatformId(state, "install"), schema_name: schema, app_code, is_active: true, suspended_by_platform: false, subscription_expires_at: fromNow(24 * 20), installed_at: at(hoursAgo), ...o };
    state.installations.push(row);
    return row;
  };
  const noorBot = install("noor", "whatsapp_bot", 24 * 120);
  const noorInvoice = install("noor", "invoice_pro", 24 * 200, { subscription_expires_at: fromNow(24 * 150) });
  install("noor", "google_shopping", 24 * 90, { subscription_expires_at: null });
  install("noor", "sharwa_ai", 24 * 60, { subscription_expires_at: fromNow(24 * 5) });
  const atyabBot = install("atyab", "whatsapp_bot", 24 * 80);
  const zahraLoyalty = install("zahra", "loyalty_plus", 24 * 50, { suspended_by_platform: true, is_active: false });
  install("techy", "sms_gateway", 24 * 40, { subscription_expires_at: at(24 * 3) });
  const bunnSms = install("bunn", "sms_gateway", 24 * 35);
  state.appOverrides = [
    { id: nextPlatformId(state, "app_override"), app_code: "whatsapp_bot", schema_name: "atyab", is_billed: false, notes: "شريك إطلاق — بلا فوترة لسنة" },
    { id: nextPlatformId(state, "app_override"), app_code: "sms_gateway", schema_name: "techy", is_billed: true, notes: "" },
  ];

  // ── dues (commission records exist from an earlier pilot period) ────────────────────
  const commission = (schema: string, order_id: number, amount: number, currency: Currency, status: DueStatus, hoursAgo: number, type: CommissionRow["commission_type"] = "percentage", value = "1.00") =>
    state.commissions.push({ id: nextPlatformId(state, "commission"), schema_name: schema, order_id, plan_name_snapshot: type === "none" ? "المؤسِّسون" : "الاحترافية", commission_type: type, commission_value: value, amount, currency, status, created_at: at(hoursAgo), collected_at: status === "collected" ? at(hoursAgo - 2) : null });
  commission("noor", 1041, 4.5, "SAR", "pending", 30);
  commission("noor", 1037, 7.25, "SAR", "pending", 52);
  commission("noor", 1029, 1200, "YER_NEW", "pending", 70);
  commission("noor", 1012, 3.1, "SAR", "collected", 300);
  commission("noor", 1009, 0, "SAR", "pending", 320, "none", "0.00");
  commission("atyab", 88, 12.4, "SAR", "pending", 40, "percentage", "2.00");
  commission("atyab", 81, 9.9, "SAR", "waived", 200, "percentage", "2.00");
  commission("bunn", 301, 2.2, "USD", "pending", 26, "percentage", "2.00");
  commission("zahra", 55, 18, "SAR", "pending", 15, "percentage", "2.00");
  commission("techy", 12, 3, "SAR", "pending", 90);
  const charge = (inst: InstallationRowM, app: AppRow, period: string, status: DueStatus, hoursAgo: number) =>
    state.charges.push({ id: nextPlatformId(state, "charge"), schema_name: inst.schema_name, installation_id: inst.id, app_code: app.code, app_name_snapshot: app.name, period_label: period, price: Number(app.price), currency: app.currency, status, created_at: at(hoursAgo), collected_at: status === "collected" ? at(hoursAgo - 3) : null });
  const appBy = (code: string) => state.apps.find((a) => a.code === code)!;
  charge(noorBot, appBy("whatsapp_bot"), "2026-09", "collected", 24 * 40);
  charge(noorBot, appBy("whatsapp_bot"), "2026-10", "pending", 24 * 15);
  charge(noorInvoice, appBy("invoice_pro"), "2025", "waived", 24 * 300);
  charge(atyabBot, appBy("whatsapp_bot"), "2026-10", "waived", 24 * 10);
  charge(zahraLoyalty, appBy("loyalty_plus"), "2026-09", "pending", 24 * 45);
  charge(bunnSms, appBy("sms_gateway"), "2026-09", "pending", 24 * 33);

  // ── Sharwa Pay wallets (merchants + a few customers) ───────────────────────────────
  const wallet = (phone: string, name: string | null, balances: Partial<Record<Currency, number>>) => {
    const txs: WalletTx[] = [];
    for (const [cur, bal] of Object.entries(balances) as Array<[Currency, number]>) {
      txs.push({ id: nextPlatformId(state, "wtx"), reason: "topup_manual", amount: bal + 40, currency: cur, direction: "credit", reference: `TOP-${int(rnd, 1000, 9999)}`, created_at: at(int(rnd, 200, 900)) });
      txs.push({ id: nextPlatformId(state, "wtx"), reason: "purchase", amount: 40, currency: cur, direction: "debit", reference: `ORD-${int(rnd, 100, 999)}`, created_at: at(int(rnd, 20, 190)) });
    }
    state.wallets.set(phone, { customer_phone: phone, customer_name: name, balances, transactions: txs.sort((a, b) => b.created_at.localeCompare(a.created_at)) });
  };
  wallet("967770000011", "متجر نور", { SAR: 160, YER_NEW: 25000 });
  wallet("967770000022", "سوق الحكمة", { SAR: 12 });
  for (const c of state.clients.slice(4, 30)) if (c.merchant_phone && c.provisioning_status === "ready" && state.clients.indexOf(c) % 3 !== 0) wallet(c.merchant_phone, c.name, { SAR: int(rnd, 0, 400), USD: int(rnd, 0, 50) });
  const zahraPhone = state.clients.find((c) => c.schema_name === "zahra")?.merchant_phone;
  if (zahraPhone) state.wallets.set(zahraPhone, { customer_phone: zahraPhone, customer_name: "زهرة الياسمين", balances: { SAR: 5 }, transactions: [] });
  wallet("967771234567", "مريم سالم", { SAR: 85 });
  wallet("967733221100", "سالم باعباد", { YER_NEW: 54000, USD: 12 });
  wallet("966551234500", "نورة الشهري", { SAR: 300 });

  // ── top-up and withdrawal requests ──────────────────────────────────────────────────
  const banks = ["بنك الكريمي", "بنك التضامن", "بنك اليمن والكويت", "جوالي"];
  const custPhones = ["967771234567", "967733221100", "966551234500", "967770000011", "967778889990", "967771112223"];
  for (let i = 0; i < 12; i++) {
    const status: RequestStatus = i < 7 ? "pending" : i < 10 ? "approved" : "rejected";
    const cur: Currency = i % 4 === 1 ? "YER_NEW" : i % 5 === 3 ? "USD" : "SAR";
    state.topups.push({
      id: nextPlatformId(state, "topup"),
      customer_phone: custPhones[i % custPhones.length]!,
      amount: cur === "YER_NEW" ? int(rnd, 5, 60) * 1000 : int(rnd, 20, 500),
      currency: cur,
      bank_name: banks[i % banks.length]!,
      bank_transaction_id: `TX${String(880100 + i * 37)}`,
      receipt_image: `receipt-${(i % 3) + 1}`,
      status,
      note: status === "rejected" ? "الإيصال غير واضح." : "",
      created_at: at(2 + i * 9),
      decided_at: status === "pending" ? null : at(1 + i * 9),
      decided_by: status === "pending" ? null : "admin",
    });
  }
  // A pending request reusing an approved one's transfer id — the server refuses it (US-20.5 a3).
  state.topups[6]!.bank_transaction_id = state.topups[7]!.bank_transaction_id;
  for (let i = 0; i < 6; i++) {
    const status: RequestStatus = i < 4 ? "pending" : i === 4 ? "approved" : "rejected";
    state.withdrawals.push({
      id: nextPlatformId(state, "withdrawal"),
      customer_phone: custPhones[(i + 2) % custPhones.length]!,
      amount: int(rnd, 20, 250),
      currency: i === 2 ? "USD" : "SAR",
      destination: i % 2 ? "بنك الكريمي — 3021445566770" : "جوالي — 770000011",
      status,
      note: "",
      created_at: at(3 + i * 40 + (i === 3 ? 24 * 20 : 0)),
      decided_at: status === "pending" ? null : at(2 + i * 40),
      decided_by: status === "pending" ? null : "admin",
    });
  }

  // ── Sharwa Ship zones + market categories ──────────────────────────────────────────
  state.zones = [
    { id: 1, code: "SAN-01", name: "صنعاء — الأمانة", price: "1200.00", currency: "YER_NEW", volumetric_divisor: 5000, center_latitude: "15.3694", center_longitude: "44.1910", radius_km: "22", is_active: true, sort_order: 1 },
    { id: 2, code: "ADN-01", name: "عدن — المدينة", price: "1400.00", currency: "YER_NEW", volumetric_divisor: 5000, center_latitude: "12.7855", center_longitude: "45.0187", radius_km: "16", is_active: true, sort_order: 2 },
    { id: 3, code: "TAZ-01", name: "تعز", price: "1500.00", currency: "YER_NEW", volumetric_divisor: 5000, center_latitude: "13.5795", center_longitude: "44.0209", radius_km: "12", is_active: true, sort_order: 3 },
    { id: 4, code: "HOD-01", name: "الحديدة", price: "1600.00", currency: "YER_NEW", volumetric_divisor: 6000, center_latitude: "14.7979", center_longitude: "42.9545", radius_km: "14", is_active: true, sort_order: 4 },
    { id: 5, code: "MKX-01", name: "المكلا", price: "18.00", currency: "SAR", volumetric_divisor: 5000, center_latitude: "14.5425", center_longitude: "49.1242", radius_km: "10", is_active: false, sort_order: 5 },
  ];
  state.ids.zone = 5;
  state.categories = ["أزياء وملابس", "عطور وتجميل", "إلكترونيات", "مواد غذائية", "منزل ومطبخ", "هدايا", "أطفال", "خدمات وحجوزات"].map((name, i) => ({ id: i + 1, name, display_order: i + 1, is_active: true }));
  state.categories.push({ id: 9, name: "سيارات وقطع غيار", display_order: 9, is_active: false });
  state.ids.category = 9;

  // ── pending webhook events ─────────────────────────────────────────────────────────
  const ev = (source: string, event_type: string, schema: string | null, status: WebhookEventStatus, reason: string, payload: Record<string, unknown>, hoursAgo: number, attempts = 1) =>
    state.webhookEvents.push({ id: nextPlatformId(state, "webhook_event"), source, event_type, schema_name: schema, status, reason, payload, attempts, received_at: at(hoursAgo), resolved_at: status === "pending" ? null : at(hoursAgo - 1) });
  ev("aramex", "shipment.delivered", "noor", "pending", "رقم البوليصة غير معروف لدى المتجر.", { waybill: "44012879999", status: "DELIVERED", ts: at(5) }, 5, 3);
  ev("jeeb", "payment.succeeded", "atyab", "pending", "تعذّر مطابقة رقم الطلب.", { reference: "ORD-88-x", amount: "120.00", currency: "SAR" }, 9, 2);
  ev("kuraimi", "payment.reversed", "bunn", "pending", "انتهت مهلة قفل الطلب.", { txn: "KR-5511", amount: "30.00" }, 22);
  ev("smsa", "shipment.returned", "deleted-store", "pending", "المتجر غير موجود.", { awb: "290019922", reason: "REFUSED" }, 50);
  ev("whatsapp", "message.status", "zahra", "pending", "رمز الاشتراك منتهٍ.", { id: "wamid.HBg…", status: "failed" }, 70, 4);
  ev("aramex", "shipment.in_transit", "noor", "resolved", "تأخر وصول الطلب.", { waybill: "44012873365" }, 140);
  ev("jeeb", "payment.failed", "techy", "discarded", "حدث مكرر.", { reference: "ORD-12" }, 200);

  // ── deactivation lifecycle ─────────────────────────────────────────────────────────
  state.deactivations.push({ id: nextPlatformId(state, "deactivation"), schema_name: "closed", status: "closed", reason: "طلب التاجر إغلاق المتجر.", grace_period_ends_at: at(24 * 30), settled_custody: true, created_at: at(24 * 60), updated_at: at(24 * 20), by: "admin", reinstated_at: null });
  state.deactivations.push({ id: nextPlatformId(state, "deactivation"), schema_name: "kidswear", status: "suspended", reason: "مخالفة سياسة المحتوى — بانتظار رد التاجر.", grace_period_ends_at: ahead(24 * 9), settled_custody: false, created_at: at(24 * 5), updated_at: at(24 * 5), by: "admin", reinstated_at: null });
  const kidswear = state.clients.find((c) => c.schema_name === "kidswear");
  if (kidswear) kidswear.is_active = false;

  // ── action log ─────────────────────────────────────────────────────────────────────
  const act = (schema: string | null, action: string, detail: string, hoursAgo: number, role: "superuser" | "operator" = "superuser") =>
    state.actions.push({ id: nextPlatformId(state, "action"), schema_name: schema, at: at(hoursAgo), actor: { username: role === "superuser" ? "admin" : "ops", role }, action, detail });
  act("noor", "sharwa_ship.activate", "فُعِّلت شروة شيب.", 24 * 100);
  act("noor", "subscription.assign", "أُسندت الباقة «الاحترافية».", 24 * 90);
  act("noor", "dues.collect_commission", "تم تحصيل عمولة الطلب #1012 من محفظة شروة باي للتاجر.", 300, "operator");
  act("kidswear", "deactivation.suspend", "عُلِّق المتجر: مخالفة سياسة المحتوى.", 24 * 5);
  act("atyab", "feature_override.bulk", "استثناء «الأسواق» = مفعّل.", 24 * 12);

  return state;
}

export function platformState(): PlatformState {
  return storeState(null, "platform", seed);
}

// ── derived reads ────────────────────────────────────────────────────────────────────
export function findClient(schema: string): ClientRow | undefined {
  return platformState().clients.find((c) => c.schema_name === schema);
}

export function currentSubscription(schema: string): SubscriptionRowM | undefined {
  return platformState().subscriptions.find((s) => s.schema_name === schema && s.is_current);
}

export function planById(id: number): PlanRow | undefined {
  return platformState().plans.find((p) => p.id === id);
}

/** Celery stand-in: a queued job resolves after a few reads (dev only). */
export function tickJobs(c: ClientRow): void {
  if (!c.pending_job) return;
  c.pending_job.reads_left -= 1;
  if (c.pending_job.reads_left > 0) return;
  if (c.pending_job.kind === "reprovision") {
    c.provisioning_status = "ready";
    c.provisioning_error = null;
    c.provisioning_started_at = null;
    c.provisioned_at = new Date().toISOString();
  } else {
    c.sharwa_ship = c.pending_job.target ? "active" : "inactive";
  }
  c.pending_job = null;
}

/** Django's sweeper thresholds (`retry_stalled_tenant_provisioning`): pending > 5 min, provisioning > 20 min. */
export function isStalled(c: ClientRow): boolean {
  if (c.pending_job) return false;
  if (c.provisioning_status === "pending") return FIXTURE_NOW - Date.parse(c.created_on) > 5 * 60_000;
  if (c.provisioning_status !== "provisioning" || !c.provisioning_started_at) return false;
  return FIXTURE_NOW - Date.parse(c.provisioning_started_at) > 20 * 60_000;
}

/**
 * The server's resolution order (M46 FR-46.04 / `Feature.is_enabled_for_client()`),
 * implemented ONCE here — the console shows it, the merchant session obeys it.
 */
export function resolveFeature(code: string, schema: string): { enabled: boolean; decided_by: DecidedBy; plan: string | null } {
  const s = platformState();
  const sub = currentSubscription(schema);
  const plan = sub ? (planById(sub.plan_id)?.name ?? null) : null;
  const override = s.overrides.find((o) => o.feature_code === code && o.schema_name === schema);
  if (override) return { enabled: override.is_enabled, decided_by: "override", plan };
  const f = s.features.find((x) => x.code === code);
  if (!f || !f.is_active_globally) return { enabled: false, decided_by: "global_kill", plan };
  if (!f.requires_plan) return { enabled: true, decided_by: "no_plan_required", plan };
  if (!s.billing.subscriptions_enabled) return { enabled: true, decided_by: "subscriptions_disabled", plan };
  const cell = sub ? s.planFeatures.get(cellKey(sub.plan_id, code)) : undefined;
  if (cell === undefined) return { enabled: false, decided_by: "plan_feature_missing", plan };
  return { enabled: cell, decided_by: cell ? "plan_feature" : "plan_feature_missing", plan };
}

/**
 * Effective features for a store's merchant session (M03 `features[]`). A store the
 * platform does not know (a wizard-created one, a custom host) keeps the open default.
 */
export function effectiveFeatures(schema: string | null): string[] {
  if (!schema || !findClient(schema)) return [...FEATURE_KEYS];
  return FEATURE_KEYS.filter((code) => resolveFeature(code, schema).enabled);
}

export function money(amount: number, currency: Currency): string {
  return displayMoney(amount, currency);
}

export function planDisplayPrice(p: PlanRow): string {
  return displayMoney(Number(p.price), p.currency);
}

export function moduleGroupOrder(key: string): number {
  const i = MODULE_GROUPS.findIndex((g) => g.key === key);
  return i < 0 ? MODULE_GROUPS.length : i;
}

export function logAction(schema: string | null, actor: { username: string; role: "superuser" | "operator" }, action: string, detail: string): void {
  const s = platformState();
  s.actions.push({ id: nextPlatformId(s, "action"), schema_name: schema, at: new Date().toISOString(), actor, action, detail });
}

export function walletOf(phone: string | null): WalletRow | undefined {
  return phone ? platformState().wallets.get(phone) : undefined;
}

