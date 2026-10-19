import type { MockResult } from "@/lib/bff/mock-route";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { listStatuses, ordersState } from "@/mocks/orders/state";
import { hashStore, rng, str, type Body } from "@/mocks/procurement/kit";

/**
 * M28 mock server state (`[NEEDS BACKEND]` §7): two marketplaces, their settings, a
 * listing per product per market, the sync-job log, and the orders pulled from them.
 * Prices on the market are computed HERE (markup + FX) and handed to the browser as
 * `display_*` — the UI never applies markup or FX (FR-28.05).
 */
export const MARKETS = ["amazon", "noon"] as const;
export type Market = (typeof MARKETS)[number];
export const IDENTIFIER_TYPES = ["asin", "nsku", "ean", "upc", "gtin"] as const;
export const SYNC_STATUSES = ["needs_identifier", "pending", "synced", "failed", "unpublished", "hidden_out_of_stock"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];
export const JOB_TYPES = ["catalog_push", "price_update", "inventory_update", "order_pull", "barcode_match", "feed_result", "shipment_confirm", "fba_inventory"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const JOB_STATUSES = ["queued", "running", "completed", "completed_with_errors", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface MarketConn {
  marketplace: Market;
  connected: boolean;
  needs_reauth: boolean;
  account_label: string | null;
  connected_at: string | null;
}

export interface MarketSettings {
  currency: "SAR" | "AED";
  markup_percent: string;
  fx_rate: string;
  auto_push: boolean;
  inventory_sync: boolean;
  stock_buffer: number;
  order_pull: boolean;
  default_order_status_id: number | null;
}

export interface Listing {
  id: number;
  marketplace: Market;
  product_id: number;
  identifier_type: (typeof IDENTIFIER_TYPES)[number] | null;
  identifier_value: string;
  price_override: string | null;
  sync_status: SyncStatus;
  last_error: { code: string; message: string } | null;
  last_synced_at: string | null;
}

export interface Job {
  id: number;
  marketplace: Market;
  job_type: JobType;
  status: JobStatus;
  triggered_by: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  /** Mock clock: a queued/running job completes `runFor` ms after creation. */
  runFor: number;
  outcome: "completed" | "completed_with_errors" | "failed";
  total: number;
  success_count: number;
  error_count: number;
  listing_ids: number[];
  errors: Array<{ sku: string; code: string; message: string }>;
  csv_expired: boolean;
  summary: string;
}

export interface MarketOrder {
  order_id: number;
  order_number: string;
  marketplace: Market;
  external_order_id: string;
  fulfillment: "marketplace" | "merchant";
  marketplace_status: "pending" | "open" | "shipped" | "canceled" | "unknown";
  shipment_confirm_status: "not_required" | "pending" | "confirmed" | "failed";
  shipment_confirm_error: string | null;
  total: number;
  currency: "SAR" | "AED";
  created_at: string;
}

interface MarketsState {
  conns: Record<Market, MarketConn>;
  settings: Record<Market, MarketSettings>;
  listings: Listing[];
  jobs: Job[];
  orders: MarketOrder[];
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
const SUFFIX = { SAR: "ر.س", AED: "د.إ" } as const;
export function fmt(amount: number, currency: "SAR" | "AED") {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${SUFFIX[currency]}`;
}

const ERROR_SAMPLES = [
  { code: "8541", message: "The SKU data provided conflicts with the Amazon catalog." },
  { code: "90057", message: "Missing required attribute: brand." },
  { code: "NOON-VAL-12", message: "Image resolution below 660px." },
  { code: "5665", message: "You are not authorized to list products in this category." },
];

function seed(store: string | null): MarketsState {
  const empty = isEmptyStore(store);
  const rnd = rng(hashStore(store) ^ 0x2828);
  const conns: Record<Market, MarketConn> = {
    amazon: empty
      ? { marketplace: "amazon", connected: false, needs_reauth: false, account_label: null, connected_at: null }
      : { marketplace: "amazon", connected: true, needs_reauth: false, account_label: "Seller A1B2C3 · amazon.sa", connected_at: at(24 * 40) },
    noon: { marketplace: "noon", connected: false, needs_reauth: false, account_label: null, connected_at: null },
  };
  const settings: Record<Market, MarketSettings> = {
    amazon: { currency: "SAR", markup_percent: "15.00", fx_rate: "1.0000", auto_push: false, inventory_sync: true, stock_buffer: 2, order_pull: true, default_order_status_id: null },
    noon: { currency: "AED", markup_percent: "12.00", fx_rate: "0.9790", auto_push: false, inventory_sync: true, stock_buffer: 0, order_pull: true, default_order_status_id: null },
  };
  const state: MarketsState = { conns, settings, listings: [], jobs: [], orders: [] };
  if (empty) return state;
  const products = catalog(store).products.filter((p) => !p.archived_at);
  let id = 1;
  for (const market of MARKETS) {
    products.forEach((p, i) => {
      const roll = rnd();
      const hasBarcode = Boolean(p.barcode);
      let sync: SyncStatus;
      if (market === "noon") sync = hasBarcode ? (roll < 0.5 ? "pending" : "unpublished") : "needs_identifier";
      else sync = !hasBarcode && roll < 0.35 ? "needs_identifier" : roll < 0.55 ? "synced" : roll < 0.68 ? "failed" : roll < 0.8 ? "pending" : roll < 0.9 ? "hidden_out_of_stock" : "unpublished";
      const idType = sync === "needs_identifier" ? null : market === "amazon" ? (i % 3 === 0 ? "asin" : "ean") : "gtin";
      state.listings.push({
        id: id++,
        marketplace: market,
        product_id: p.id,
        identifier_type: idType,
        identifier_value: idType === "asin" ? `B0${String(100000 + p.id * 37).slice(0, 8)}` : idType ? (p.barcode || `62${String(10_000_000_000 + p.id * 9_173)}`) : "",
        price_override: market === "amazon" && i % 11 === 3 ? (Number(p.price) * 1.2).toFixed(2) : null,
        sync_status: sync,
        last_error: sync === "failed" ? ERROR_SAMPLES[i % ERROR_SAMPLES.length]! : null,
        last_synced_at: sync === "synced" || sync === "failed" || sync === "hidden_out_of_stock" ? at(2 + (i % 48)) : null,
      });
    });
  }
  const job = (market: Market, type: JobType, status: JobStatus, hoursAgo: number, extra: Partial<Job> = {}) => {
    const total = extra.total ?? 20 + Math.floor(rnd() * 60);
    const err = status === "completed_with_errors" ? 3 + Math.floor(rnd() * 6) : status === "failed" ? total : 0;
    state.jobs.push({
      id: nextId(store, "mkt-job", 500),
      marketplace: market,
      job_type: type,
      status,
      triggered_by: hoursAgo % 2 ? "النظام (مجدول)" : "مالك المتجر",
      created_at: at(hoursAgo),
      started_at: status === "queued" ? null : at(hoursAgo - 0.01),
      finished_at: status === "queued" || status === "running" ? null : at(hoursAgo - 0.05),
      runFor: 25_000,
      outcome: "completed",
      total,
      success_count: total - err,
      error_count: err,
      listing_ids: [],
      errors: Array.from({ length: Math.min(err, 8) }, (_, k) => ({ sku: products[k % Math.max(1, products.length)]?.sku ?? "SKU", ...ERROR_SAMPLES[k % ERROR_SAMPLES.length]! })),
      csv_expired: hoursAgo > 24 * 20,
      summary: "",
      ...extra,
    });
  };
  job("amazon", "order_pull", "completed", 0.5);
  job("amazon", "catalog_push", "completed_with_errors", 5);
  job("amazon", "price_update", "completed", 26);
  job("amazon", "inventory_update", "completed", 30);
  job("amazon", "fba_inventory", "failed", 50, { summary: "Amazon SP-API: QuotaExceeded" });
  job("amazon", "barcode_match", "completed", 72);
  job("amazon", "feed_result", "completed_with_errors", 24 * 25);
  job("amazon", "shipment_confirm", "completed", 96);
  job("noon", "catalog_push", "failed", 120, { summary: "noon: invalid api key" });

  const sourceOrders = ordersState(store).orders.slice(0, 14);
  sourceOrders.forEach((o, i) => {
    const market: Market = i % 4 === 3 ? "noon" : "amazon";
    const fba = market === "amazon" && i % 3 === 0;
    const mstatus = (["open", "shipped", "pending", "shipped", "canceled", "unknown", "open"] as const)[i % 7]!;
    state.orders.push({
      order_id: o.id,
      order_number: `#${o.id}`,
      marketplace: market,
      external_order_id: market === "amazon" ? `403-${String(1_000_000 + o.id * 77).slice(0, 7)}-${String(2_000_000 + o.id * 13).slice(0, 7)}` : `NAE${String(30_000_000 + o.id * 911)}`,
      fulfillment: fba ? "marketplace" : "merchant",
      marketplace_status: mstatus,
      shipment_confirm_status: fba ? "not_required" : mstatus === "shipped" ? (i % 5 === 1 ? "failed" : "confirmed") : "pending",
      shipment_confirm_error: !fba && mstatus === "shipped" && i % 5 === 1 ? "Tracking number format rejected by carrier code SMSA." : null,
      total: 80 + ((i * 53) % 700),
      currency: market === "amazon" ? "SAR" : "AED",
      created_at: at(6 + i * 9),
    });
  });
  return state;
}

export function marketsState(store: string | null): MarketsState {
  return storeState(store, "marketplaces", () => seed(store));
}

export function isMarket(v: string): v is Market {
  return (MARKETS as readonly string[]).includes(v);
}

// ── jobs clock ──────────────────────────────────────────────────────────────────────

function tick(store: string | null, j: Job) {
  if (j.status !== "queued" && j.status !== "running") return;
  const age = Date.now() - new Date(j.created_at).getTime();
  if (age < 3000) return;
  if (age < j.runFor) {
    if (j.status === "queued") {
      j.status = "running";
      j.started_at = new Date().toISOString();
    }
    return;
  }
  j.status = j.outcome;
  j.finished_at = new Date().toISOString();
  if (j.job_type === "catalog_push") {
    const listings = marketsState(store).listings.filter((l) => j.listing_ids.includes(l.id));
    listings.forEach((l, i) => {
      const fail = j.outcome === "completed_with_errors" && i % 7 === 0;
      l.sync_status = fail ? "failed" : "synced";
      l.last_error = fail ? ERROR_SAMPLES[i % ERROR_SAMPLES.length]! : null;
      l.last_synced_at = j.finished_at;
    });
  }
}
function tickAll(store: string | null) {
  for (const j of marketsState(store).jobs) tick(store, j);
}

// ── views ───────────────────────────────────────────────────────────────────────────

export function hubView(store: string | null) {
  tickAll(store);
  const s = marketsState(store);
  return MARKETS.map((m) => {
    const last = s.jobs.filter((j) => j.marketplace === m).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const ls = s.listings.filter((l) => l.marketplace === m);
    return {
      ...s.conns[m],
      listings_count: ls.length,
      needs_identifier_count: ls.filter((l) => l.sync_status === "needs_identifier").length,
      failed_count: ls.filter((l) => l.sync_status === "failed").length,
      last_job: last ? { id: last.id, job_type: last.job_type, status: last.status, finished_at: last.finished_at } : null,
    };
  });
}

function priceOf(store: string | null, l: Listing) {
  const p = catalog(store).products.find((x) => x.id === l.product_id);
  const set = marketsState(store).settings[l.marketplace];
  const computed = Number(p?.price ?? 0) * (1 + Number(set.markup_percent) / 100) * Number(set.fx_rate);
  return { computed, currency: set.currency };
}

export function listingView(store: string | null, l: Listing) {
  const p = catalog(store).products.find((x) => x.id === l.product_id);
  const { computed, currency } = priceOf(store, l);
  return {
    id: l.id,
    marketplace: l.marketplace,
    product: { id: l.product_id, name: p?.name ?? "منتج محذوف", sku: p?.sku ?? "—", image: p?.image_url || null, barcode: p?.barcode || null },
    identifier_type: l.identifier_type,
    identifier_value: l.identifier_value,
    display_market_price: fmt(l.price_override ? Number(l.price_override) : computed, currency),
    display_computed_price: fmt(computed, currency),
    price_override: l.price_override,
    sync_status: l.sync_status,
    last_error: l.last_error,
    last_synced_at: l.last_synced_at,
  };
}

export function settingsView(store: string | null, m: Market) {
  const s = marketsState(store).settings[m];
  const sample = catalog(store).products.find((p) => !p.archived_at);
  const samplePrice = Number(sample?.price ?? 100);
  return {
    ...s,
    preview: {
      sample_product: sample?.name ?? "منتج نموذجي",
      display_store_price: `${samplePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س`,
      display_sample_price: fmt(samplePrice * (1 + Number(s.markup_percent) / 100) * Number(s.fx_rate), s.currency),
    },
    order_status_options: listStatuses(store).map((x) => ({ id: x.id, name: x.name })),
  };
}

export function saveSettings(store: string | null, m: Market, b: Body): MockResult<ReturnType<typeof settingsView>> {
  const errors: Record<string, string[]> = {};
  const currency = str(b.currency);
  if (currency !== "SAR" && currency !== "AED") errors.currency = ["العملة SAR أو AED."];
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(str(b.markup_percent))) errors.markup_percent = ["نسبة الهامش رقم حتى خانتين عشريتين."];
  if (!/^\d+(\.\d{1,4})?$/.test(str(b.fx_rate)) || Number(b.fx_rate) <= 0) errors.fx_rate = ["سعر الصرف رقم موجب حتى 4 خانات."];
  const buffer = Number(b.stock_buffer);
  if (!Number.isInteger(buffer) || buffer < 0) errors.stock_buffer = ["احتياطي المخزون عدد صحيح غير سالب."];
  const statusId = b.default_order_status_id === null || b.default_order_status_id === "" || b.default_order_status_id === undefined ? null : Number(b.default_order_status_id);
  if (statusId !== null && !listStatuses(store).some((s) => s.id === statusId)) errors.default_order_status_id = ["الحالة غير موجودة."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  Object.assign(marketsState(store).settings[m], {
    currency,
    markup_percent: Number(b.markup_percent).toFixed(2),
    fx_rate: Number(b.fx_rate).toFixed(4),
    auto_push: b.auto_push === true,
    inventory_sync: b.inventory_sync === true,
    stock_buffer: buffer,
    order_pull: b.order_pull === true,
    default_order_status_id: statusId,
  });
  return { ok: true, data: settingsView(store, m) };
}

export function listListings(store: string | null, m: Market, params: URLSearchParams) {
  tickAll(store);
  const status = params.get("sync_status");
  const idType = params.get("identifier_type");
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const cat = catalog(store).products;
  return marketsState(store)
    .listings.filter((l) => {
      if (l.marketplace !== m) return false;
      if (status && l.sync_status !== status) return false;
      if (idType && l.identifier_type !== idType) return false;
      if (q) {
        const p = cat.find((x) => x.id === l.product_id);
        if (!p || (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !l.identifier_value.toLowerCase().includes(q))) return false;
      }
      return true;
    })
    .map((l) => listingView(store, l));
}

const ID_PATTERNS: Record<(typeof IDENTIFIER_TYPES)[number], RegExp> = {
  asin: /^B0[A-Z0-9]{8}$/,
  nsku: /^[A-Z0-9-]{4,40}$/,
  ean: /^\d{13}$/,
  upc: /^\d{12}$/,
  gtin: /^\d{8,14}$/,
};

export function patchListing(store: string | null, m: Market, id: number, b: Body): MockResult<ReturnType<typeof listingView>> {
  const l = marketsState(store).listings.find((x) => x.id === id && x.marketplace === m);
  if (!l) return { ok: false, status: 404, body: { detail: "القائمة غير موجودة." } };
  const errors: Record<string, string[]> = {};
  if ("identifier_type" in b || "identifier_value" in b) {
    const t = str(b.identifier_type ?? l.identifier_type) as (typeof IDENTIFIER_TYPES)[number];
    const v = str(b.identifier_value ?? l.identifier_value).toUpperCase();
    if (!(IDENTIFIER_TYPES as readonly string[]).includes(t)) errors.identifier_type = ["نوع المعرّف غير صالح."];
    else if (!ID_PATTERNS[t].test(v)) errors.identifier_value = [`قيمة ${t.toUpperCase()} غير صالحة.`];
    else {
      l.identifier_type = t;
      l.identifier_value = v;
      if (l.sync_status === "needs_identifier") l.sync_status = "pending";
    }
  }
  if ("price_override" in b) {
    const v = b.price_override;
    if (v === null || v === "") l.price_override = null;
    else if (!/^\d+(\.\d{1,2})?$/.test(str(v)) || Number(v) <= 0) errors.price_override = ["السعر رقم موجب حتى خانتين."];
    else l.price_override = Number(v).toFixed(2);
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return { ok: true, data: listingView(store, l) };
}

function newJob(store: string | null, m: Market, type: JobType, actor: string, extra: Partial<Job> = {}): Job {
  const j: Job = {
    id: nextId(store, "mkt-job", 500),
    marketplace: m,
    job_type: type,
    status: "queued",
    triggered_by: actor,
    created_at: new Date().toISOString(),
    started_at: null,
    finished_at: null,
    runFor: 12_000,
    outcome: "completed",
    total: 0,
    success_count: 0,
    error_count: 0,
    listing_ids: [],
    errors: [],
    csv_expired: false,
    summary: "",
    ...extra,
  };
  marketsState(store).jobs.unshift(j);
  return j;
}

export function pushListings(store: string | null, m: Market, b: Body, actor: string): MockResult<{ job_id: number; count: number }> {
  const s = marketsState(store);
  if (!s.conns[m].connected) return { ok: false, status: 409, body: { detail: "السوق غير مربوط." } };
  if (s.conns[m].needs_reauth) return { ok: false, status: 409, body: { detail: "انتهت صلاحية الربط — أعد ربط السوق." } };
  const ids = Array.isArray(b.listing_ids) ? (b.listing_ids as unknown[]).map(Number) : [];
  const listings = s.listings.filter((l) => l.marketplace === m && ids.includes(l.id));
  if (!listings.length) return { ok: false, status: 400, body: { listing_ids: ["حدد قائمة واحدة على الأقل."] } };
  const blocked = listings.filter((l) => l.sync_status === "needs_identifier");
  if (blocked.length === listings.length) return { ok: false, status: 400, body: { detail: "كل القوائم المحددة تحتاج معرّفاً قبل الدفع." } };
  const pushable = listings.filter((l) => l.sync_status !== "needs_identifier");
  pushable.forEach((l) => (l.sync_status = "pending"));
  const errors = blocked.map((l) => ({ sku: catalog(store).products.find((p) => p.id === l.product_id)?.sku ?? "—", code: "NO-ID", message: "Missing product identifier." }));
  const j = newJob(store, m, "catalog_push", actor, {
    listing_ids: pushable.map((l) => l.id),
    total: listings.length,
    success_count: pushable.length,
    error_count: blocked.length,
    errors,
    outcome: blocked.length || pushable.length > 10 ? "completed_with_errors" : "completed",
  });
  if (j.outcome === "completed_with_errors" && !blocked.length) {
    const failed = Math.max(1, Math.floor(pushable.length / 7));
    j.success_count = pushable.length - failed;
    j.error_count = failed;
    j.errors = pushable.slice(0, failed).map((l, i) => ({ sku: catalog(store).products.find((p) => p.id === l.product_id)?.sku ?? "—", ...ERROR_SAMPLES[i % ERROR_SAMPLES.length]! }));
  }
  return { ok: true, status: 202, data: { job_id: j.id, count: listings.length } };
}

export function triggerJob(store: string | null, m: Market, b: Body, actor: string): MockResult<{ job_id: number }> {
  const s = marketsState(store);
  if (!s.conns[m].connected) return { ok: false, status: 409, body: { detail: "السوق غير مربوط." } };
  const type = str(b.job_type);
  if (type !== "order_pull" && type !== "fba_inventory") return { ok: false, status: 400, body: { job_type: ["النوع order_pull أو fba_inventory."] } };
  if (type === "fba_inventory" && m !== "amazon") return { ok: false, status: 400, body: { job_type: ["مخزون FBA لأمازون فقط."] } };
  const j = newJob(store, m, type, actor, { total: type === "order_pull" ? 3 : 40, success_count: type === "order_pull" ? 3 : 40 });
  return { ok: true, status: 202, data: { job_id: j.id } };
}

export function jobView(j: Job) {
  const ended = j.finished_at ?? null;
  return {
    id: j.id,
    marketplace: j.marketplace,
    job_type: j.job_type,
    status: j.status,
    triggered_by: j.triggered_by,
    created_at: j.created_at,
    started_at: j.started_at,
    finished_at: ended,
    duration_seconds: j.started_at ? Math.max(0, Math.round(((ended ? new Date(ended).getTime() : Date.now()) - new Date(j.started_at).getTime()) / 1000)) : null,
    total: j.total,
    success_count: j.status === "queued" || j.status === "running" ? 0 : j.success_count,
    error_count: j.status === "queued" || j.status === "running" ? 0 : j.error_count,
    errors_csv_url: j.error_count && (j.status === "completed_with_errors" || j.status === "failed") ? (j.csv_expired ? null : `/api/bff/marketplaces/jobs/${j.id}/errors.csv`) : null,
    summary: j.summary || null,
  };
}

export function listJobs(store: string | null, params: URLSearchParams) {
  tickAll(store);
  const market = params.get("market");
  const type = params.get("job_type");
  const status = params.get("status");
  const trig = params.get("triggered_by");
  return marketsState(store)
    .jobs.filter((j) => (!market || j.marketplace === market) && (!type || j.job_type === type) && (!status || j.status === status) && (!trig || (trig === "system" ? j.triggered_by.startsWith("النظام") : !j.triggered_by.startsWith("النظام"))))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(jobView);
}

export function getJob(store: string | null, id: number) {
  tickAll(store);
  return marketsState(store).jobs.find((j) => j.id === id);
}

export function jobCsv(j: Job) {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  return ["sku,error_code,message", ...j.errors.map((e) => [e.sku, e.code, e.message].map(esc).join(","))].join("\n");
}

export function orderView(o: MarketOrder) {
  return {
    order_id: o.order_id,
    order_number: o.order_number,
    marketplace: o.marketplace,
    external_order_id: o.external_order_id,
    fulfillment: o.fulfillment,
    marketplace_status: o.marketplace_status,
    shipment_confirm_status: o.shipment_confirm_status,
    shipment_confirm_error: o.shipment_confirm_error,
    display_total: fmt(o.total, o.currency),
    created_at: o.created_at,
  };
}

export function listMarketOrders(store: string | null, params: URLSearchParams) {
  const market = params.get("market");
  const ful = params.get("fulfillment");
  const status = params.get("status");
  return marketsState(store)
    .orders.filter((o) => (!market || o.marketplace === market) && (!ful || o.fulfillment === ful) && (!status || o.marketplace_status === status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(orderView);
}

export function confirmShipment(store: string | null, orderId: number, actor: string): MockResult<ReturnType<typeof orderView>> {
  const o = marketsState(store).orders.find((x) => x.order_id === orderId);
  if (!o) return { ok: false, status: 404, body: { detail: "طلب السوق غير موجود." } };
  if (o.fulfillment === "marketplace") return { ok: false, status: 409, body: { detail: "ينفّذه السوق — لا تأكيد شحنة من المتجر." } };
  if (o.shipment_confirm_status === "confirmed") return { ok: false, status: 409, body: { detail: "الشحنة مؤكدة مسبقاً." } };
  o.shipment_confirm_status = "confirmed";
  o.shipment_confirm_error = null;
  newJob(store, o.marketplace, "shipment_confirm", actor, { total: 1, success_count: 1, runFor: 4000 });
  return { ok: true, data: orderView(o) };
}

export function connectNoon(store: string | null, b: Body): MockResult<ReturnType<typeof hubView>[number]> {
  const key = str(b.api_key);
  if (key.length < 16) return { ok: false, status: 400, body: { api_key: ["مفتاح API غير صالح (16 حرفاً على الأقل)."] } };
  const c = marketsState(store).conns.noon;
  Object.assign(c, { connected: true, needs_reauth: false, account_label: `noon partner ••••${key.slice(-4)}`, connected_at: new Date().toISOString() });
  return { ok: true, data: hubView(store).find((x) => x.marketplace === "noon")! };
}

export function connectAmazon(store: string | null) {
  Object.assign(marketsState(store).conns.amazon, { connected: true, needs_reauth: false, account_label: "Seller A1B2C3 · amazon.sa", connected_at: new Date().toISOString() });
}

export function disconnect(store: string | null, m: Market): MockResult<ReturnType<typeof hubView>[number]> {
  Object.assign(marketsState(store).conns[m], { connected: false, needs_reauth: false, account_label: null, connected_at: null });
  return { ok: true, data: hubView(store).find((x) => x.marketplace === m)! };
}
