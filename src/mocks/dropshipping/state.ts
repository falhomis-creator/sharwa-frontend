import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { ordersState } from "@/mocks/orders/state";
import { hashStore, rng, str, type Body } from "@/mocks/procurement/kit";

/**
 * M29 mock server state (`[NEEDS BACKEND]` §7). Every price the browser shows — supplier
 * cost, current, after a rule, suggested — is formatted HERE (FR-29.04): the UI never
 * applies markup or rounding. Jobs and imports advance on a wall clock so the 10s polling
 * of the screens has something to watch.
 */
export const SUPPLIER_CODES = ["cj", "makhazen", "knawat", "flat_feed"] as const;
export type SupplierCode = (typeof SUPPLIER_CODES)[number];
export const ROUNDINGS = ["none", "nearest_1", "end_99", "end_95", "end_00"] as const;
export type Rounding = (typeof ROUNDINGS)[number];
export const IMPORT_STATUSES = ["not_imported", "importing", "imported", "failed"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];
export const SUPPLIER_ORDER_STATUSES = ["queued", "held", "submitted", "accepted", "processing", "shipped", "delivered", "cancelled", "rejected", "failed"] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];
export const ATTENTION: readonly SupplierOrderStatus[] = ["held", "rejected", "failed"];
export const FEED_EXTENSIONS = ["csv", "tsv", "txt", "xlsx"] as const;

/**
 * The 20 mappable columns of `FeedMapping` (discovery 02 §14.C); `required` ones gate step 2.
 * APPROVED by the owner as the contract (decision 2026-10-19, Phase 7 item 5): these 20 keys,
 * with `sku`, `name`, `cost`, `stock` required — Django's `FeedMapping` must accept exactly these.
 */
export const FEED_FIELDS: Array<{ key: string; required: boolean; aliases: string[] }> = [
  { key: "sku", required: true, aliases: ["sku", "code", "item_code", "رمز"] },
  { key: "name", required: true, aliases: ["name", "title", "product_name", "الاسم"] },
  { key: "cost", required: true, aliases: ["cost", "cost_price", "wholesale", "التكلفة"] },
  { key: "stock", required: true, aliases: ["stock", "qty", "quantity", "inventory", "الكمية"] },
  { key: "price", required: false, aliases: ["price", "retail_price", "msrp", "السعر"] },
  { key: "compare_at_price", required: false, aliases: ["compare_at_price", "old_price"] },
  { key: "description", required: false, aliases: ["description", "body", "الوصف"] },
  { key: "barcode", required: false, aliases: ["barcode", "ean"] },
  { key: "gtin", required: false, aliases: ["gtin", "upc"] },
  { key: "brand", required: false, aliases: ["brand", "vendor", "العلامة"] },
  { key: "category", required: false, aliases: ["category", "type", "الفئة"] },
  { key: "image_url", required: false, aliases: ["image", "image_url", "main_image"] },
  { key: "extra_images", required: false, aliases: ["images", "extra_images", "gallery"] },
  { key: "weight", required: false, aliases: ["weight", "weight_kg", "الوزن"] },
  { key: "variant_sku", required: false, aliases: ["variant_sku", "child_sku"] },
  { key: "option1_name", required: false, aliases: ["option1_name", "option1"] },
  { key: "option1_value", required: false, aliases: ["option1_value", "size", "المقاس"] },
  { key: "option2_name", required: false, aliases: ["option2_name", "option2"] },
  { key: "option2_value", required: false, aliases: ["option2_value", "color", "اللون"] },
  { key: "supplier_url", required: false, aliases: ["url", "supplier_url", "link"] },
];

interface Connection {
  supplier_code: SupplierCode;
  connected: boolean;
  account_label: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  settings: {
    sync_products: boolean;
    sync_prices: boolean;
    sync_inventory: boolean;
    intervals: { products_minutes: number; prices_minutes: number; inventory_minutes: number };
    stock_buffer: number;
    hide_when_out_of_stock: boolean;
    orders: { forward_enabled: boolean; forward_cod: boolean; default_country_code: string; shipping_method: string };
  };
  webhook_rotated_at: string | null;
}

/**
 * INT-039 — mirrors Django's supplier registry (`services/suppliers/registry.py`): the credential inputs each
 * supplier declares, and what its adapter supports. Mákhazen asks for one API token (no separate store id).
 */
const CREDENTIAL_FIELDS: Record<SupplierCode, Array<{ name: string; label: string; type: string; help: string }>> = {
  cj: [{ name: "api_key", label: "مفتاح API", type: "password", help: "من لوحة CJ: My CJ ← Authorization ← API ← Generate Key." }],
  makhazen: [{ name: "api_key", label: "رمز الربط (API Token)", type: "password", help: "من حسابك في مخازن ← الإعدادات ← الربط البرمجي." }],
  knawat: [{ name: "api_key", label: "رمز الربط (API Token)", type: "password", help: "من حسابك في قنوات ← الإعدادات ← الربط." }],
  flat_feed: [],
};
const KEY_MIN: Record<SupplierCode, number> = { cj: 8, makhazen: 16, knawat: 12, flat_feed: 0 };
const supportsLive = (code: SupplierCode) => code !== "flat_feed";

export interface PricingRule {
  id: number;
  name: string;
  scope_type: "all" | "supplier" | "category";
  scope_value: string;
  markup_percent: string;
  rounding: Rounding;
  fx_source: "fixed" | "daily";
  fx_rate: string;
  priority: number;
  is_active: boolean;
  fixed_add: string;
  shipping_estimate: string;
  min_margin_percent: string;
}

interface SupplierProduct {
  id: number;
  supplier_code: SupplierCode;
  name: string;
  category: string;
  cost: number;
  currency: "USD" | "SAR";
  variants_count: number;
  import_status: ImportStatus;
  import_started_at: string | null;
  import_error: string | null;
  product_id: number | null;
  price_after_rule: number | null;
}

interface SupplierOrder {
  id: number;
  order_id: number;
  order_number: string;
  supplier_code: SupplierCode;
  status: SupplierOrderStatus;
  supplier_reference: string | null;
  tracking_number: string | null;
  cost: number;
  currency: "USD" | "SAR";
  last_error: string | null;
  can_resubmit: boolean;
  updated_at: string;
}

interface SyncJob {
  id: number;
  supplier_code: SupplierCode;
  job_type: "products" | "prices" | "inventory" | "import" | "feed";
  status: "queued" | "running" | "completed" | "completed_with_errors" | "failed";
  outcome: "completed" | "completed_with_errors" | "failed";
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  runFor: number;
  processed: number;
  errors: Array<{ row: number; sku: string; message: string }>;
  feed_id: number | null;
  product_ids: number[];
  last_error: string | null;
}

export interface Feed {
  id: number;
  name: string;
  source_kind: "file" | "url";
  filename: string | null;
  url: string | null;
  sheet_name: string | null;
  columns: string[];
  sample: string[][];
  mapping: Record<string, string>;
  status: "draft" | "mapped" | "approved" | "running" | "completed" | "completed_with_errors" | "failed";
  schedule_interval: number | null;
  last_job_id: number | null;
  created_at: string;
}

interface DropState {
  conns: Record<SupplierCode, Connection>;
  rules: PricingRule[];
  products: SupplierProduct[];
  orders: SupplierOrder[];
  jobs: SyncJob[];
  feeds: Feed[];
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
const CATS = ["عطور", "إلكترونيات", "أزياء", "منزل", "تجميل"];
const NAMES: Record<SupplierCode, string[]> = {
  cj: ["Wireless Earbuds Pro", "Smart Watch S8", "LED Desk Lamp", "Phone Stand Aluminum", "Mini Projector 1080p", "Bluetooth Speaker Mini"],
  makhazen: ["عطر عود ملكي 100 مل", "بخور مخلط فاخر", "دهن عود كمبودي", "معطر مفارش"],
  knawat: ["فستان سهرة مطرز", "عباية كريب سوداء", "حقيبة يد جلد", "حذاء رياضي نسائي", "شال حرير"],
  flat_feed: ["طقم أواني جرانيت", "مفرش سرير قطن", "منظم أدراج"],
};

const ENGINE_DEFAULTS = { fixed_add: "0.00", shipping_estimate: "0.00", min_margin_percent: "10.00" };

const defaultSettings = (): Connection["settings"] => ({
  sync_products: true,
  sync_prices: true,
  sync_inventory: true,
  intervals: { products_minutes: 1440, prices_minutes: 360, inventory_minutes: 30 },
  stock_buffer: 1,
  hide_when_out_of_stock: false,
  orders: { forward_enabled: true, forward_cod: false, default_country_code: "", shipping_method: "" },
});

function seed(store: string | null): DropState {
  const empty = isEmptyStore(store);
  const rnd = rng(hashStore(store) ^ 0x2929);
  const conn = (code: SupplierCode, connected: boolean, label: string | null, hoursAgo: number): Connection => ({
    supplier_code: code,
    connected,
    account_label: connected ? label : null,
    connected_at: connected ? at(hoursAgo) : null,
    last_sync_at: connected ? at(1 + (hoursAgo % 5)) : null,
    last_error: null,
    settings: defaultSettings(),
    webhook_rotated_at: connected ? at(hoursAgo) : null,
  });
  const state: DropState = {
    conns: {
      cj: conn("cj", !empty, "cj-api ••••7f21", 24 * 60),
      makhazen: conn("makhazen", false, null, 0),
      knawat: conn("knawat", !empty, "knawat store #4471", 24 * 33),
      flat_feed: conn("flat_feed", !empty, "ملف مسطّح", 24 * 12),
    },
    rules: [],
    products: [],
    orders: [],
    jobs: [],
    feeds: [],
  };
  if (empty) return state;
  state.rules = [
    { id: 1, name: "الهامش العام", scope_type: "all", scope_value: "", markup_percent: "35.00", rounding: "end_99", fx_source: "daily", fx_rate: "3.7500", priority: 100, is_active: true, ...ENGINE_DEFAULTS },
    { id: 2, name: "إلكترونيات CJ", scope_type: "supplier", scope_value: "cj", markup_percent: "45.00", rounding: "end_95", fx_source: "fixed", fx_rate: "3.7500", priority: 10, is_active: true, ...ENGINE_DEFAULTS },
    { id: 3, name: "أزياء", scope_type: "category", scope_value: "أزياء", markup_percent: "60.00", rounding: "nearest_1", fx_source: "fixed", fx_rate: "1.0000", priority: 20, is_active: false, ...ENGINE_DEFAULTS },
  ];
  const catalogIds = catalog(store).products.map((p) => p.id);
  let pid = 1;
  for (const code of SUPPLIER_CODES) {
    const base = NAMES[code];
    const count = code === "flat_feed" ? 12 : 48;
    for (let i = 0; i < count; i++) {
      const roll = rnd();
      const status: ImportStatus = roll < 0.6 ? "not_imported" : roll < 0.9 ? "imported" : "failed";
      state.products.push({
        id: pid++,
        supplier_code: code,
        name: `${base[i % base.length]}${i >= base.length ? ` — ${Math.floor(i / base.length) + 1}` : ""}`,
        category: code === "cj" ? "إلكترونيات" : code === "makhazen" ? "عطور" : code === "knawat" ? "أزياء" : CATS[i % CATS.length]!,
        cost: Number((code === "cj" ? 4 + rnd() * 40 : 20 + rnd() * 300).toFixed(2)),
        currency: code === "cj" ? "USD" : "SAR",
        variants_count: 1 + Math.floor(rnd() * 5),
        import_status: status,
        import_started_at: null,
        import_error: status === "failed" ? "Supplier returned 422: images missing" : null,
        product_id: status === "imported" ? (catalogIds[i % Math.max(1, catalogIds.length)] ?? null) : null,
        price_after_rule: null,
      });
    }
  }
  const src = ordersState(store).orders.slice(0, 26);
  src.forEach((o, i) => {
    const status = SUPPLIER_ORDER_STATUSES[i % SUPPLIER_ORDER_STATUSES.length]!;
    const code = (["cj", "knawat", "flat_feed"] as const)[i % 3];
    state.orders.push({
      id: 7000 + i,
      order_id: o.id,
      order_number: `#${o.id}`,
      supplier_code: code,
      status,
      supplier_reference: ["queued", "held"].includes(status) ? null : `${code.toUpperCase()}-${88_000 + i * 13}`,
      tracking_number: status === "shipped" || status === "delivered" ? `CJPKL${String(7_000_000_000 + i * 7919)}` : null,
      cost: Number((10 + ((i * 37) % 160)).toFixed(2)),
      currency: code === "cj" ? "USD" : "SAR",
      last_error:
        status === "held" ? "انتهت مدة حجز مخزون المورد (DropshipStockHold) قبل التأكيد." : status === "rejected" ? "Supplier rejected: address outside coverage area." : status === "failed" ? "CJ API timeout after 3 retries." : null,
      can_resubmit: status === "held" || status === "failed",
      updated_at: at(1 + i * 3),
    });
  });
  const job = (code: SupplierCode, type: SyncJob["job_type"], status: SyncJob["status"], hoursAgo: number, errors = 0) =>
    state.jobs.push({
      id: nextId(store, "drop-job", 900),
      supplier_code: code,
      job_type: type,
      status,
      outcome: status === "queued" || status === "running" ? "completed" : status,
      created_at: at(hoursAgo),
      started_at: at(hoursAgo - 0.01),
      finished_at: at(hoursAgo - 0.03),
      runFor: 15_000,
      processed: 40 + Math.floor(rnd() * 200),
      errors: Array.from({ length: errors }, (_, k) => ({ row: k + 2, sku: `SKU-${100 + k}`, message: "cost is not a number" })),
      feed_id: null,
      product_ids: [],
      last_error: status === "failed" ? "401 Unauthorized from supplier API" : null,
    });
  job("cj", "inventory", "completed", 0.4);
  job("knawat", "prices", "completed_with_errors", 3, 4);
  job("cj", "products", "completed", 22);
  job("knawat", "inventory", "failed", 30);
  job("flat_feed", "feed", "completed_with_errors", 48, 6);
  state.feeds = [
    {
      id: 1,
      name: "موجز مورد الأواني",
      source_kind: "url",
      filename: null,
      url: "https://supplier.example/feeds/kitchen.csv",
      sheet_name: null,
      columns: ["code", "title", "wholesale", "qty", "image", "category"],
      sample: [["KIT-001", "طقم أواني جرانيت", "120.00", "14", "https://supplier.example/i/1.jpg", "منزل"]],
      mapping: { sku: "code", name: "title", cost: "wholesale", stock: "qty", image_url: "image", category: "category" },
      status: "completed_with_errors",
      schedule_interval: 720,
      last_job_id: state.jobs.find((j) => j.job_type === "feed")?.id ?? null,
      created_at: at(24 * 12),
    },
  ];
  const feedJob = state.jobs.find((j) => j.job_type === "feed");
  if (feedJob) feedJob.feed_id = 1;
  return state;
}

export function dropState(store: string | null): DropState {
  return storeState(store, "dropshipping", () => seed(store));
}

export function isCode(v: string): v is SupplierCode {
  return (SUPPLIER_CODES as readonly string[]).includes(v);
}

// ── clock ───────────────────────────────────────────────────────────────────────────

function tick(store: string | null) {
  const s = dropState(store);
  const now = Date.now();
  for (const j of s.jobs) {
    if (j.status !== "queued" && j.status !== "running") continue;
    const age = now - new Date(j.created_at).getTime();
    if (age < 2500) continue;
    if (age < j.runFor) {
      j.status = "running";
      j.started_at ??= new Date().toISOString();
      continue;
    }
    j.status = j.outcome;
    j.finished_at = new Date().toISOString();
    if (j.job_type === "import") {
      const catalogIds = catalog(store).products.map((p) => p.id);
      s.products
        .filter((p) => j.product_ids.includes(p.id))
        .forEach((p, i) => {
          const fail = i % 9 === 8;
          p.import_status = fail ? "failed" : "imported";
          p.import_error = fail ? "Supplier returned 422: images missing" : null;
          p.product_id = fail ? null : (catalogIds[(p.id * 7) % Math.max(1, catalogIds.length)] ?? null);
        });
    }
    if (j.feed_id) {
      const f = s.feeds.find((x) => x.id === j.feed_id);
      if (f) f.status = j.outcome;
    }
    s.conns[j.supplier_code].last_sync_at = j.finished_at;
  }
}

// ── money ───────────────────────────────────────────────────────────────────────────

function round(v: number, r: Rounding) {
  switch (r) {
    case "none":
      return Math.round(v * 100) / 100;
    case "nearest_1":
      return Math.round(v);
    case "end_99":
      return Math.floor(v) + 0.99;
    case "end_95":
      return Math.floor(v) + 0.95;
    case "end_00":
      return Math.ceil(v);
  }
}

function ruleFor(store: string | null, p: SupplierProduct): PricingRule | null {
  return (
    dropState(store)
      .rules.filter((r) => r.is_active && (r.scope_type === "all" || (r.scope_type === "supplier" && r.scope_value === p.supplier_code) || (r.scope_type === "category" && r.scope_value === p.category)))
      .sort((a, b) => a.priority - b.priority)[0] ?? null
  );
}

/** Django's `pricing_engine.compute_sell_price`: (cost×fx + shipping)×(1+markup) + fixed, never under cost×fx×(1+min margin). */
function applyRule(p: SupplierProduct, r: Pick<PricingRule, "markup_percent" | "rounding" | "fx_rate"> & Partial<Pick<PricingRule, "fixed_add" | "shipping_estimate" | "min_margin_percent">>) {
  const fx = p.currency === "USD" ? Number(r.fx_rate) || 3.75 : 1;
  const cost = p.cost * fx;
  const floor = cost * (1 + Number(r.min_margin_percent ?? 10) / 100);
  const price = (cost + Number(r.shipping_estimate ?? 0)) * (1 + Number(r.markup_percent) / 100) + Number(r.fixed_add ?? 0);
  return Math.max(round(Math.max(price, floor), r.rounding), Math.ceil(floor * 100) / 100);
}

const sar = (n: number) => displayMoney(n, "SAR");
const costOf = (p: SupplierProduct) => displayMoney(p.cost, p.currency);

// ── views ───────────────────────────────────────────────────────────────────────────

export function connectionView(store: string | null, c: Connection) {
  tick(store);
  const s = dropState(store);
  return {
    supplier_code: c.supplier_code,
    connected: c.connected,
    account_label: c.account_label,
    connected_at: c.connected_at,
    last_sync_at: c.last_sync_at,
    last_error: c.last_error,
    settings: c.settings,
    webhook_configured: Boolean(c.webhook_rotated_at),
    attention_count: s.orders.filter((o) => o.supplier_code === c.supplier_code && ATTENTION.includes(o.status)).length,
    products_count: s.products.filter((p) => p.supplier_code === c.supplier_code).length,
    reauth_required: false,
    webhook_supported: supportsLive(c.supplier_code),
    inventory_sync_supported: supportsLive(c.supplier_code),
    credential_fields: CREDENTIAL_FIELDS[c.supplier_code],
  };
}

export const listConnections = (store: string | null) => SUPPLIER_CODES.map((c) => connectionView(store, dropState(store).conns[c]));

export function connect(store: string | null, code: SupplierCode, b: Body): MockResult<ReturnType<typeof connectionView>> {
  const c = dropState(store).conns[code];
  const creds = (b.credentials ?? {}) as Body;
  const missing = Object.fromEntries(CREDENTIAL_FIELDS[code].filter((f) => !str(creds[f.name])).map((f) => [`credentials.${f.name}`, [`أدخل «${f.label}».`]]));
  if (Object.keys(missing).length) return { ok: false, status: 400, body: missing };
  if (code !== "flat_feed") {
    const key = str(creds.api_key);
    if (key.length < KEY_MIN[code] || /^(bad|revoked)/i.test(key)) return { ok: false, status: 400, body: { "credentials.api_key": [`مفتاح ${code} غير صالح — تحقق من نسخه كاملاً.`] } };
    c.account_label = `${code}-api ••••${key.slice(-4)}`;
  } else c.account_label = "ملفات وروابط الكتالوج";
  c.connected = true;
  c.connected_at = new Date().toISOString();
  c.last_error = null;
  return { ok: true, data: connectionView(store, c) };
}

export function disconnect(store: string | null, code: SupplierCode) {
  const c = dropState(store).conns[code];
  Object.assign(c, { connected: false, account_label: null, connected_at: null, webhook_rotated_at: null });
  return connectionView(store, c);
}

export function saveSettings(store: string | null, code: SupplierCode, b: Body): MockResult<ReturnType<typeof connectionView>> {
  const c = dropState(store).conns[code];
  if (!c.connected) return { ok: false, status: 409, body: { detail: "المورد غير مربوط." } };
  const errors: Record<string, string[]> = {};
  const iv = (b.intervals ?? {}) as Body;
  const intervals = { products_minutes: Number(iv.products_minutes), prices_minutes: Number(iv.prices_minutes), inventory_minutes: Number(iv.inventory_minutes) };
  // Django's bounds (INT-039): the catalog beat runs hourly → products/prices ≥ 60; inventory 15..1440.
  const bounds: Record<keyof typeof intervals, [number, number]> = { products_minutes: [60, 10080], prices_minutes: [60, 10080], inventory_minutes: [15, 1440] };
  for (const [k, v] of Object.entries(intervals) as Array<[keyof typeof intervals, number]>) {
    const [low, high] = bounds[k];
    if (!Number.isInteger(v) || v < low || v > high) errors[`intervals.${k}`] = [`الفاصل بين ${low} و${high} دقيقة.`];
  }
  const buffer = Number(b.stock_buffer);
  if (!Number.isInteger(buffer) || buffer < 0) errors.stock_buffer = ["عدد صحيح غير سالب."];
  const orders = (b.orders ?? null) as Body | null;
  const country = str(orders?.default_country_code).toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) errors["orders.default_country_code"] = ["رمز دولة من حرفين لاتينيين (مثل YE أو SA)."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  c.settings = {
    sync_products: b.sync_products === true,
    sync_prices: b.sync_prices === true,
    sync_inventory: b.sync_inventory === true,
    intervals,
    stock_buffer: buffer,
    hide_when_out_of_stock: b.hide_when_out_of_stock === true,
    orders: orders
      ? { forward_enabled: orders.forward_enabled === true, forward_cod: orders.forward_cod === true, default_country_code: country, shipping_method: str(orders.shipping_method).slice(0, 100) }
      : c.settings.orders,
  };
  return { ok: true, data: connectionView(store, c) };
}

export function rotateWebhook(store: string | null, code: SupplierCode, host: string): MockResult<{ webhook_url: string; webhook_secret: string; base_url_missing: boolean }> {
  const c = dropState(store).conns[code];
  if (!c.connected) return { ok: false, status: 409, body: { detail: "اربط المورد أولاً ثم فعّل الإشعارات الفورية." } };
  if (!supportsLive(code)) return { ok: false, status: 409, body: { detail: "هذا المورد لا يرسل إشعارات فورية — المزامنة الدورية تكفي." } };
  c.webhook_rotated_at = new Date().toISOString();
  const hex = (n: number) => Array.from({ length: n }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("");
  return { ok: true, data: { webhook_url: `https://${host}/webhooks/suppliers/${code}/${hex(32)}/`, webhook_secret: hex(43), base_url_missing: false } };
}

function newJob(store: string | null, code: SupplierCode, type: SyncJob["job_type"], extra: Partial<SyncJob> = {}): SyncJob {
  const j: SyncJob = {
    id: nextId(store, "drop-job", 900),
    supplier_code: code,
    job_type: type,
    status: "queued",
    outcome: "completed",
    created_at: new Date().toISOString(),
    started_at: null,
    finished_at: null,
    runFor: 8000,
    processed: 0,
    errors: [],
    feed_id: null,
    product_ids: [],
    last_error: null,
    ...extra,
  };
  dropState(store).jobs.unshift(j);
  return j;
}

export function syncInventory(store: string | null, code: SupplierCode): MockResult<{ job_id: number }> {
  const c = dropState(store).conns[code];
  if (!supportsLive(code)) return { ok: false, status: 409, body: { detail: "هذا المورد لا يدعم مزامنة المخزون المباشرة — المخزون يتحدّث مع الكتالوج/الملف." } };
  if (!c.connected) return { ok: false, status: 409, body: { detail: "المورد غير مربوط." } };
  return { ok: true, status: 202, data: { job_id: newJob(store, code, "inventory", { processed: 48 }).id } };
}

// ── pricing rules ───────────────────────────────────────────────────────────────────

export function listRules(store: string | null) {
  return [...dropState(store).rules].sort((a, b) => a.priority - b.priority);
}

function parseRule(b: Body): MockResult<Omit<PricingRule, "id">> {
  const errors: Record<string, string[]> = {};
  const name = str(b.name);
  if (!name) errors.name = ["اسم القاعدة مطلوب."];
  const scope = str(b.scope_type) as PricingRule["scope_type"];
  if (!["all", "supplier", "category"].includes(scope)) errors.scope_type = ["النطاق غير صالح."];
  if (scope === "supplier" && !isCode(str(b.scope_value))) errors.scope_value = ["اختر المورد."];
  if (scope === "category" && !str(b.scope_value)) errors.scope_value = ["اختر الفئة."];
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(str(b.markup_percent))) errors.markup_percent = ["نسبة الهامش رقم حتى خانتين."];
  const rounding = str(b.rounding) as Rounding;
  if (!(ROUNDINGS as readonly string[]).includes(rounding)) errors.rounding = ["التقريب غير صالح."];
  const fx = str(b.fx_source) as PricingRule["fx_source"];
  if (fx !== "fixed" && fx !== "daily") errors.fx_source = ["مصدر الصرف غير صالح."];
  if (fx === "fixed" && !(/^\d+(\.\d{1,4})?$/.test(str(b.fx_rate)) && Number(b.fx_rate) > 0)) errors.fx_rate = ["سعر صرف موجب حتى 4 خانات."];
  const priority = Number(b.priority ?? 50);
  if (!Number.isInteger(priority) || priority < 1) errors.priority = ["الأولوية عدد صحيح موجب (الأصغر أولاً)."];
  const engine: Record<string, string> = {};
  for (const [k, high, fallback] of [
    ["fixed_add", 100000, "0"],
    ["shipping_estimate", 100000, "0"],
    ["min_margin_percent", 1000, "10"],
  ] as const) {
    const raw = str(b[k]) || fallback;
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > high) errors[k] = [`رقم بين 0 و${high} حتى خانتين.`];
    else engine[k] = Number(raw).toFixed(2);
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return {
    ok: true,
    data: {
      name,
      scope_type: scope,
      scope_value: scope === "all" ? "" : str(b.scope_value),
      markup_percent: Number(b.markup_percent).toFixed(2),
      rounding,
      fx_source: fx,
      fx_rate: fx === "daily" ? "3.7500" : Number(b.fx_rate).toFixed(4),
      priority,
      is_active: b.is_active !== false,
      fixed_add: engine.fixed_add!,
      shipping_estimate: engine.shipping_estimate!,
      min_margin_percent: engine.min_margin_percent!,
    },
  };
}

export function createRule(store: string | null, b: Body): MockResult<PricingRule> {
  const r = parseRule(b);
  if (!r.ok) return r;
  const rule = { id: nextId(store, "drop-rule", 10), ...r.data };
  dropState(store).rules.push(rule);
  return { ok: true, status: 201, data: rule };
}

export function patchRule(store: string | null, id: number, b: Body): MockResult<PricingRule> {
  const rule = dropState(store).rules.find((x) => x.id === id);
  if (!rule) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  const r = parseRule({ ...rule, ...b });
  if (!r.ok) return r;
  Object.assign(rule, r.data);
  return { ok: true, data: rule };
}

export function deleteRule(store: string | null, id: number): MockResult<null> {
  const s = dropState(store);
  if (!s.rules.some((r) => r.id === id)) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  s.rules = s.rules.filter((r) => r.id !== id);
  return { ok: true, status: 204, data: null };
}

function inScope(p: SupplierProduct, r: Pick<PricingRule, "scope_type" | "scope_value">) {
  return r.scope_type === "all" || (r.scope_type === "supplier" && r.scope_value === p.supplier_code) || (r.scope_type === "category" && r.scope_value === p.category);
}

export function simulateRule(store: string | null, b: Body): MockResult<{ sample: unknown[]; affected_count: number; below_cost_count: number; overlaps: Array<{ id: number; name: string; priority: number }> }> {
  const parsed = parseRule({ name: "محاكاة", priority: 50, ...((b.rule ?? b) as Body) });
  if (!parsed.ok) return parsed;
  const r = parsed.data;
  const products = dropState(store).products.filter((p) => inScope(p, r));
  const sample = products.slice(0, 8).map((p) => {
    const current = ruleFor(store, p);
    const after = applyRule(p, r);
    const fxCost = p.cost * (p.currency === "USD" ? Number(r.fx_rate) || 3.75 : 1);
    return {
      product: { id: p.id, name: p.name, supplier_code: p.supplier_code },
      display_cost: costOf(p),
      display_current: current ? sar(applyRule(p, current)) : "—",
      display_after: sar(after),
      below_cost: after < fxCost,
    };
  });
  const overlaps = dropState(store)
    .rules.filter((x) => x.is_active && x.id !== Number(b.id ?? 0) && (x.scope_type === "all" || r.scope_type === "all" || (x.scope_type === r.scope_type && x.scope_value === r.scope_value)))
    .map((x) => ({ id: x.id, name: x.name, priority: x.priority }));
  return { ok: true, data: { sample, affected_count: products.length, below_cost_count: sample.filter((s) => s.below_cost).length, overlaps } };
}

export function applyRuleNow(store: string | null, id: number): MockResult<{ updated: number; job_id: number | null }> {
  const rule = dropState(store).rules.find((x) => x.id === id);
  if (!rule) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  if (!rule.is_active) return { ok: false, status: 409, body: { detail: "القاعدة غير مفعّلة." } };
  const targets = dropState(store).products.filter((p) => inScope(p, rule) && ruleFor(store, p)?.id === rule.id);
  targets.forEach((p) => (p.price_after_rule = applyRule(p, rule)));
  return { ok: true, data: { updated: targets.length, job_id: null } };
}

// ── supplier catalog ────────────────────────────────────────────────────────────────

export function catalogView(store: string | null, p: SupplierProduct) {
  const rule = ruleFor(store, p);
  return {
    id: p.id,
    name: p.name,
    image: null as string | null,
    category: p.category,
    display_cost: costOf(p),
    display_suggested_price: rule ? sar(applyRule(p, rule)) : costOf(p),
    variants_count: p.variants_count,
    import_status: p.import_status,
    import_error: p.import_error,
    product_id: p.product_id,
  };
}

export function listCatalog(store: string | null, code: SupplierCode, params: URLSearchParams) {
  tick(store);
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const cat = params.get("category");
  const st = params.get("import_status");
  return dropState(store)
    .products.filter((p) => p.supplier_code === code && (!q || p.name.toLowerCase().includes(q)) && (!cat || p.category === cat) && (!st || p.import_status === st))
    .map((p) => catalogView(store, p));
}

export function categoriesOf(store: string | null, code: SupplierCode) {
  return [...new Set(dropState(store).products.filter((p) => p.supplier_code === code).map((p) => p.category))];
}

export function importProducts(store: string | null, code: SupplierCode, b: Body): MockResult<{ job_id: number; count: number }> {
  const s = dropState(store);
  if (!s.conns[code].connected) return { ok: false, status: 409, body: { detail: "المورد غير مربوط." } };
  const ids = Array.isArray(b.supplier_product_ids) ? (b.supplier_product_ids as unknown[]).map(Number) : [];
  const targets = s.products.filter((p) => p.supplier_code === code && ids.includes(p.id) && p.import_status !== "imported" && p.import_status !== "importing");
  if (!targets.length) return { ok: false, status: 400, body: { supplier_product_ids: ["حدد منتجات غير مستوردة."] } };
  targets.forEach((p) => {
    p.import_status = "importing";
    p.import_started_at = new Date().toISOString();
    p.import_error = null;
  });
  const j = newJob(store, code, "import", { product_ids: targets.map((p) => p.id), processed: targets.length, runFor: 7000 });
  return { ok: true, status: 202, data: { job_id: j.id, count: targets.length } };
}

// ── feeds ───────────────────────────────────────────────────────────────────────────

export function feedView(store: string | null, f: Feed) {
  tick(store);
  const job = f.last_job_id ? dropState(store).jobs.find((j) => j.id === f.last_job_id) : undefined;
  const required = FEED_FIELDS.filter((x) => x.required).map((x) => x.key);
  return {
    id: f.id,
    name: f.name,
    source_kind: f.source_kind,
    filename: f.filename,
    url: f.url,
    sheet_name: f.sheet_name,
    columns: f.columns,
    mapping: f.mapping,
    missing_required: required.filter((k) => !f.mapping[k]),
    status: f.status,
    schedule_interval: f.schedule_interval,
    last_job: job ? jobView(job) : null,
    created_at: f.created_at,
  };
}

function parseDelimited(text: string, ext: string): string[][] {
  const delim = ext === "tsv" || (ext === "txt" && text.includes("\t")) ? "\t" : ",";
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 51)
    .map((l) => l.split(delim).map((c) => c.trim().replace(/^"|"$/g, "")));
}

export async function createFeed(store: string | null, request: Request): Promise<MockResult<ReturnType<typeof feedView>>> {
  const ct = request.headers.get("content-type") ?? "";
  const s = dropState(store);
  let feed: Feed;
  const base = { id: nextId(store, "drop-feed", 10), mapping: {}, status: "draft" as const, schedule_interval: null, last_job_id: null, created_at: new Date().toISOString(), sheet_name: null };
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return { ok: false, status: 400, body: { file: ["اختر ملفاً."] } };
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!(FEED_EXTENSIONS as readonly string[]).includes(ext)) return { ok: false, status: 400, body: { file: [`الامتدادات المسموحة: ${FEED_EXTENSIONS.join(", ")}`] } };
    let rows: string[][];
    let sheet: string | null = null;
    if (ext === "xlsx") {
      // The mock cannot read a workbook; the real server returns the first sheet's header.
      rows = [["sku", "name", "cost", "stock", "price", "category"], ["XL-001", "منتج من ورقة العمل", "45.00", "10", "79.00", "منزل"]];
      sheet = "Sheet1";
    } else rows = parseDelimited(await file.text(), ext);
    if (!rows.length || !rows[0]!.length) return { ok: false, status: 400, body: { file: ["الملف فارغ."] } };
    feed = { ...base, name: str(form.get("name")) || file.name, source_kind: "file", filename: file.name, url: null, columns: rows[0]!, sample: rows.slice(1), sheet_name: sheet };
  } else {
    let b: Body = {};
    try {
      b = (await request.json()) as Body;
    } catch {
      /* empty */
    }
    const url = str(b.url);
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return { ok: false, status: 400, body: { url: ["رابط غير صالح."] } };
    if (/auth|login|private/.test(url)) return { ok: false, status: 400, body: { url: ["الرابط يتطلب مصادقة (401) — جرّب الرفع المباشر."] } };
    feed = {
      ...base,
      name: str(b.name) || url.split("/").pop() || "موجز",
      source_kind: "url",
      filename: null,
      url,
      columns: ["item_code", "title", "cost_price", "quantity", "retail_price", "brand", "image", "weight_kg"],
      sample: Array.from({ length: 14 }, (_, i) => [`URL-${100 + i}`, `منتج موجز ${i + 1}`, i === 4 ? "N/A" : (20 + i * 3).toFixed(2), String(i * 2), (40 + i * 5).toFixed(2), "Generic", `https://cdn.example/${i}.jpg`, "0.5"]),
    };
  }
  // Auto-detect by column name (US-29.4 #2).
  const used = new Set<string>();
  for (const field of FEED_FIELDS) {
    const hit = feed.columns.find((c) => !used.has(c) && field.aliases.includes(c.toLowerCase().trim()));
    if (hit) {
      (feed.mapping as Record<string, string>)[field.key] = hit;
      used.add(hit);
    }
  }
  s.feeds.unshift(feed);
  return { ok: true, status: 201, data: feedView(store, feed) };
}

export function getFeed(store: string | null, id: number) {
  return dropState(store).feeds.find((f) => f.id === id);
}

export function saveMapping(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof feedView>> {
  const f = getFeed(store, id);
  if (!f) return { ok: false, status: 404, body: { detail: "الملف غير موجود." } };
  const mapping = (b.mapping ?? {}) as Record<string, unknown>;
  const clean: Record<string, string> = {};
  const errors: Record<string, string[]> = {};
  const seen = new Map<string, string>();
  for (const field of FEED_FIELDS) {
    const col = str(mapping[field.key]);
    if (!col) {
      if (field.required) errors[`mapping.${field.key}`] = ["حقل إلزامي."];
      continue;
    }
    if (!f.columns.includes(col)) errors[`mapping.${field.key}`] = ["العمود غير موجود في الملف."];
    else if (seen.has(col)) errors[`mapping.${field.key}`] = [`العمود مستخدم في حقل آخر (${seen.get(col)}).`];
    else {
      seen.set(col, field.key);
      clean[field.key] = col;
    }
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  f.mapping = clean;
  if (f.status === "draft" || f.status === "approved") f.status = "mapped";
  return { ok: true, data: feedView(store, f) };
}

function convertRows(f: Feed) {
  const idx = (k: string) => (f.mapping[k] ? f.columns.indexOf(f.mapping[k]!) : -1);
  return f.sample.map((row, i) => {
    const out: Record<string, string> = {};
    for (const field of FEED_FIELDS) {
      const j = idx(field.key);
      if (j >= 0) out[field.key] = row[j] ?? "";
    }
    const errors: string[] = [];
    if (!out.sku) errors.push("sku فارغ");
    if (!out.name) errors.push("name فارغ");
    if (out.cost !== undefined && !/^\d+(\.\d+)?$/.test(out.cost)) errors.push("cost ليس رقماً");
    if (out.stock !== undefined && !/^\d+$/.test(out.stock)) errors.push("stock ليس عدداً صحيحاً");
    return { row: i + 2, values: out, errors };
  });
}

export function previewFeed(store: string | null, id: number): MockResult<{ rows: unknown[]; errors_count: number; total_rows: number; fields: string[] }> {
  const f = getFeed(store, id);
  if (!f) return { ok: false, status: 404, body: { detail: "الملف غير موجود." } };
  if (FEED_FIELDS.some((x) => x.required && !f.mapping[x.key])) return { ok: false, status: 409, body: { detail: "اربط الحقول الإلزامية أولاً." } };
  const rows = convertRows(f);
  return { ok: true, data: { rows: rows.slice(0, 10), errors_count: rows.filter((r) => r.errors.length).length, total_rows: rows.length, fields: Object.keys(f.mapping) } };
}

export function approveFeed(store: string | null, id: number): MockResult<ReturnType<typeof feedView>> {
  const f = getFeed(store, id);
  if (!f) return { ok: false, status: 404, body: { detail: "الملف غير موجود." } };
  if (FEED_FIELDS.some((x) => x.required && !f.mapping[x.key])) return { ok: false, status: 409, body: { detail: "اربط الحقول الإلزامية أولاً." } };
  f.status = "approved";
  return { ok: true, data: feedView(store, f) };
}

export function runFeed(store: string | null, id: number): MockResult<{ job_id: number }> {
  const f = getFeed(store, id);
  if (!f) return { ok: false, status: 404, body: { detail: "الملف غير موجود." } };
  if (!["approved", "completed", "completed_with_errors", "failed"].includes(f.status)) return { ok: false, status: 409, body: { detail: "اعتمد الملف قبل التشغيل." } };
  const rows = convertRows(f);
  const bad = rows.filter((r) => r.errors.length);
  const j = newJob(store, "flat_feed", "feed", {
    feed_id: f.id,
    processed: rows.length,
    outcome: bad.length ? "completed_with_errors" : "completed",
    errors: bad.map((r) => ({ row: r.row, sku: r.values.sku ?? "", message: r.errors.join("؛ ") })),
    runFor: 6000,
  });
  f.status = "running";
  f.last_job_id = j.id;
  return { ok: true, status: 202, data: { job_id: j.id } };
}

export function patchFeed(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof feedView>> {
  const f = getFeed(store, id);
  if (!f) return { ok: false, status: 404, body: { detail: "الملف غير موجود." } };
  if ("schedule_interval" in b) {
    const v = b.schedule_interval;
    if (v === null || v === "" || v === 0) f.schedule_interval = null;
    else if (f.source_kind !== "url") return { ok: false, status: 400, body: { schedule_interval: ["الجدولة لملفات الروابط فقط — الملف المرفوع لا يتغيّر من تلقاء نفسه."] } };
    else if (!Number.isInteger(Number(v)) || Number(v) < 60 || Number(v) > 10080) return { ok: false, status: 400, body: { schedule_interval: ["الفاصل بين 60 و10080 دقيقة."] } };
    else f.schedule_interval = Number(v);
  }
  if ("name" in b && str(b.name)) f.name = str(b.name);
  return { ok: true, data: feedView(store, f) };
}

export function feedErrorsCsv(store: string | null, id: number): string | null {
  const f = getFeed(store, id);
  const j = f?.last_job_id ? dropState(store).jobs.find((x) => x.id === f.last_job_id) : undefined;
  if (!j || !j.errors.length) return null;
  return jobCsv(j);
}

// ── orders + jobs ───────────────────────────────────────────────────────────────────

export function orderView(o: SupplierOrder) {
  return {
    id: o.id,
    order_id: o.order_id,
    order_number: o.order_number,
    supplier_code: o.supplier_code,
    status: o.status,
    supplier_reference: o.supplier_reference,
    tracking_number: o.tracking_number,
    display_cost: displayMoney(o.cost, o.currency),
    last_error: o.last_error,
    can_resubmit: o.can_resubmit,
    updated_at: o.updated_at,
  };
}

export function listOrders(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const supplier = params.get("supplier");
  const attention = params.get("attention");
  return dropState(store)
    .orders.filter(
      (o) =>
        (!status || o.status === status) &&
        (!supplier || o.supplier_code === supplier) &&
        (attention === "1" ? ATTENTION.includes(o.status) : attention === "0" ? !ATTENTION.includes(o.status) : true),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(orderView);
}

export function resubmitOrder(store: string | null, id: number): MockResult<ReturnType<typeof orderView>> {
  const o = dropState(store).orders.find((x) => x.id === id);
  if (!o) return { ok: false, status: 404, body: { detail: "طلب المورد غير موجود." } };
  if (!o.can_resubmit) return { ok: false, status: 409, body: { detail: "لا يمكن إعادة إرسال هذا الطلب." } };
  o.status = "submitted";
  o.last_error = null;
  o.can_resubmit = false;
  o.supplier_reference = `${o.supplier_code.toUpperCase()}-${90_000 + o.id}`;
  o.updated_at = new Date().toISOString();
  return { ok: true, data: orderView(o) };
}

export function jobView(j: SyncJob) {
  const live = j.status === "queued" || j.status === "running";
  return {
    id: j.id,
    supplier_code: j.supplier_code,
    job_type: j.job_type,
    status: j.status,
    created_at: j.created_at,
    started_at: j.started_at,
    finished_at: j.finished_at,
    duration_seconds: j.started_at ? Math.max(0, Math.round(((j.finished_at ? new Date(j.finished_at).getTime() : Date.now()) - new Date(j.started_at).getTime()) / 1000)) : null,
    processed: live ? 0 : j.processed,
    errors_count: live ? 0 : j.errors.length,
    errors_csv_url: !live && j.errors.length ? `/api/bff/dropshipping/jobs/${j.id}/errors.csv` : null,
    last_error: j.last_error,
    feed_id: j.feed_id,
  };
}

export function listJobs(store: string | null, params: URLSearchParams) {
  tick(store);
  const supplier = params.get("supplier");
  const status = params.get("status");
  return dropState(store)
    .jobs.filter((j) => (!supplier || j.supplier_code === supplier) && (!status || j.status === status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(jobView);
}

export function getJob(store: string | null, id: number) {
  tick(store);
  return dropState(store).jobs.find((j) => j.id === id);
}

export function retryJob(store: string | null, id: number): MockResult<{ job_id: number }> {
  const j = getJob(store, id);
  if (!j) return { ok: false, status: 404, body: { detail: "المهمة غير موجودة." } };
  if (j.status !== "failed" && j.status !== "completed_with_errors") return { ok: false, status: 409, body: { detail: "إعادة التشغيل للمهام الفاشلة فقط." } };
  const n = newJob(store, j.supplier_code, j.job_type, { processed: j.processed, feed_id: j.feed_id, product_ids: j.product_ids });
  return { ok: true, status: 202, data: { job_id: n.id } };
}

export function jobCsv(j: SyncJob) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return ["row,sku,message", ...j.errors.map((e) => [e.row, e.sku, e.message].map(esc).join(","))].join("\n");
}

export function attentionTotal(store: string | null) {
  return dropState(store).orders.filter((o) => ATTENTION.includes(o.status)).length;
}
