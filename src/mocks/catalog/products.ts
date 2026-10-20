import { addDecimal, compareDecimal, isDecimal, mulDecimal, percentOf, subDecimal } from "@/lib/decimal";
import { includesNormalized } from "@/lib/i18n/normalize";
import { displayMoney, sku as makeSku, seeded } from "@/mocks/_fixtures";
import { FIXTURE_NOW } from "@/mocks/store-state";
import type { MockResult } from "@/lib/bff/mock-route";
import {
  LOW_STOCK_THRESHOLD,
  PRODUCT_STATUSES,
  STOCK_FILTERS,
  type ProductDetail,
  type ProductListItem,
  type ProductListResponse,
  type ProductStatus,
  type ProductSummary,
  type ProductVariant,
} from "@/features/products/schemas";
import { LIVE_RATE_REFS, type MockProduct, type MockVariant } from "@/mocks/catalog/seed";
import { catalog, nextCatalogId, type CatalogState } from "@/mocks/catalog/state";

/**
 * Product operations for `/api/bff/products/**` (M04 §7 — every row `[NEEDS BACKEND]`).
 * Mirrors the backend rules the spec quotes: visibility (FR-04.02), `is_auction ⇒ stock=1`,
 * serialized stock from `InventoryItem`, variant stock summing, archive instead of delete
 * when the product has orders (M04 §8), `ProductChangeLog` for the tracked fields.
 */
type Currency = MockProduct["currency"];

const TRACKED_FIELDS: Record<string, string> = {
  name: "الاسم",
  price: "السعر",
  old_price: "السعر القديم",
  cost_price: "سعر التكلفة",
  stock: "المخزون",
  currency: "العملة",
  is_available: "متاح للبيع",
  payment_policy: "سياسة الدفع",
  category_id: "التصنيف",
};

const now = () => new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString();

export function productStatus(p: MockProduct, at = Date.now()): ProductStatus {
  if (p.archived_at) return "archived";
  if (!p.is_available) return "draft";
  if (p.published_at && new Date(p.published_at).getTime() > Math.max(at, FIXTURE_NOW)) return "scheduled";
  return "published";
}

function variantsOf(state: CatalogState, productId: number): MockVariant[] {
  return state.variants.filter((v) => v.product_id === productId);
}

function effectiveStock(state: CatalogState, p: MockProduct): string {
  const vs = variantsOf(state, p.id);
  if (vs.length === 0) return p.stock;
  return vs.reduce((acc, v) => addDecimal(acc, v.stock, 3), "0.000");
}

function isLowStock(p: MockProduct, stock: string): boolean {
  const threshold = String(p.low_stock_threshold ?? LOW_STOCK_THRESHOLD);
  return compareDecimal(stock, "0") > 0 && compareDecimal(stock, threshold) <= 0;
}

function saleState(p: MockProduct): ProductDetail["sale_state"] {
  if (!p.old_price || compareDecimal(p.old_price, p.price) <= 0) return "none";
  const t = Math.max(Date.now(), FIXTURE_NOW);
  if (p.sale_start_at && new Date(p.sale_start_at).getTime() > t) return "scheduled";
  if (p.sale_end_at && new Date(p.sale_end_at).getTime() < t) return "ended";
  return "active";
}

function money(amount: string | null, currency: Currency): string | null {
  return amount === null ? null : displayMoney(Number(amount), currency);
}

export function effectivePrice(p: MockProduct): string {
  if (p.pricing_type === "formula" && p.formula_unit_price && p.formula_coefficient) {
    return addDecimal(mulDecimal(p.formula_unit_price, p.formula_coefficient), p.formula_fixed_extra ?? "0");
  }
  return p.price;
}

export function toListItem(state: CatalogState, p: MockProduct): ProductListItem {
  const cat = p.category_id === null ? undefined : state.categories.find((c) => c.id === p.category_id);
  const stock = effectiveStock(state, p);
  const sale = saleState(p);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    // Gallery only: an external `image_url` is shown as a «رابط» item in the editor, not loaded in lists.
    image: p.images[0]?.url ?? null,
    display_price: displayMoney(Number(effectivePrice(p)), p.currency),
    display_old_price: sale === "active" ? money(p.old_price, p.currency) : null,
    stock,
    unit: p.unit,
    is_low_stock: isLowStock(p, stock),
    category: cat ? { id: cat.id, name: cat.name } : null,
    status: productStatus(p),
    has_variants: variantsOf(state, p.id).length > 0,
    updated_at: p.updated_at,
    is_serialized: p.is_serialized,
    is_auction_active: p.is_auction && p.auction_status === "active",
    price: p.price,
  };
}

function variantLabel(state: CatalogState, optionIds: number[]): string {
  const parts: string[] = [];
  for (const attr of [...state.attributes].sort((a, b) => a.sort_order - b.sort_order)) {
    const opt = attr.options.find((o) => optionIds.includes(o.id));
    if (opt) parts.push(opt.value);
  }
  return parts.join(" / ");
}

export function toVariant(state: CatalogState, p: MockProduct, v: MockVariant): ProductVariant {
  return {
    id: v.id,
    option_ids: v.option_ids,
    label: variantLabel(state, v.option_ids),
    sku: v.sku,
    extra_price: v.extra_price,
    stock: v.stock,
    image: v.image,
    display_effective_price: displayMoney(Number(addDecimal(effectivePrice(p), v.extra_price)), p.currency),
  };
}

export function toDetail(state: CatalogState, p: MockProduct, hasOrders: boolean): ProductDetail {
  const stock = effectiveStock(state, p);
  const vs = variantsOf(state, p.id);
  const sale = saleState(p);
  const badges: ProductDetail["active_badges"] = [];
  if (compareDecimal(stock, "0") <= 0) badges.push({ name: "نفدت الكمية", color: "#dc2626", reason: "المخزون صفر." });
  if (sale === "active") badges.push({ name: "تخفيض", color: "#16a34a", reason: "السعر القديم أعلى من الحالي ونافذة التخفيض فعّالة." });
  if (Math.max(Date.now(), FIXTURE_NOW) - new Date(p.created_at).getTime() <= 7 * 86_400_000) {
    badges.push({ name: "وصل حديثاً", color: "#0ea5e9", reason: "أُنشئ خلال آخر 7 أيام." });
  }
  const price = effectivePrice(p);
  return {
    ...p,
    blueprint_id: p.blueprint_id,
    collection_ids: state.collections.filter((c) => c.product_ids.includes(p.id)).map((c) => c.id),
    stock: vs.length > 0 ? p.stock : stock,
    variants: vs.map((v) => toVariant(state, p, v)),
    status: productStatus(p),
    display_price: displayMoney(Number(price), p.currency),
    display_old_price: money(p.old_price, p.currency),
    display_price_with_tax:
      p.is_taxable && p.tax_rate ? displayMoney(Number(addDecimal(price, percentOf(price, p.tax_rate))), p.currency) : null,
    // (price − cost) / price × 100 — server-computed in Django (`profit_margin_percent`).
    profit_margin_percent:
      p.cost_price && compareDecimal(price, "0") > 0
        ? ((Number(subDecimal(price, p.cost_price)) / Number(price)) * 100).toFixed(1)
        : null,
    is_on_sale: sale === "active",
    sale_state: sale,
    active_badges: badges,
    has_variants: vs.length > 0,
    variants_stock_total: vs.length > 0 ? stock : null,
    serial_available: p.is_serialized ? (p.serial_available ?? 0) : null,
    auction_status: p.is_auction ? (p.auction_status ?? "draft") : null,
    has_orders: hasOrders,
    live_rate_refs: LIVE_RATE_REFS,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────────────
function descendants(state: CatalogState, id: number): Set<number> {
  const out = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of state.categories) {
      if (c.parent_id !== null && out.has(c.parent_id) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

export function productSummary(state: CatalogState): ProductSummary {
  const s: ProductSummary = { published: 0, draft: 0, scheduled: 0, archived: 0, low_stock: 0, out_of_stock: 0 };
  for (const p of state.products) {
    s[productStatus(p)] += 1;
    if (p.archived_at) continue;
    const stock = effectiveStock(state, p);
    if (compareDecimal(stock, "0") <= 0) s.out_of_stock += 1;
    else if (isLowStock(p, stock)) s.low_stock += 1;
  }
  return s;
}

export function filterProducts(state: CatalogState, params: URLSearchParams): MockProduct[] {
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  const stock = params.get("stock") ?? "";
  const category = Number(params.get("category") ?? "") || null;
  const brand = Number(params.get("brand") ?? "") || null;
  const tag = Number(params.get("tag") ?? "") || null;
  const collection = Number(params.get("collection") ?? "") || null;
  const type = params.get("product_type") ?? "";
  const flags = (params.get("flags") ?? "").split(",").filter(Boolean);
  const catIds = category ? descendants(state, category) : null;
  const coll = collection ? state.collections.find((c) => c.id === collection) : null;

  return state.products.filter((p) => {
    if (q && !includesNormalized(`${p.name} ${p.name_en} ${p.sku} ${p.barcode}`, q)) return false;
    if (status && (PRODUCT_STATUSES as readonly string[]).includes(status) && productStatus(p) !== status) return false;
    if (stock && (STOCK_FILTERS as readonly string[]).includes(stock)) {
      const s = effectiveStock(state, p);
      const out = compareDecimal(s, "0") <= 0;
      if (stock === "out" && !out) return false;
      if (stock === "low" && !isLowStock(p, s)) return false;
      if (stock === "in_stock" && (out || isLowStock(p, s))) return false;
    }
    if (catIds && (p.category_id === null || !catIds.has(p.category_id))) return false;
    if (brand && p.brand_id !== brand) return false;
    if (tag && !p.tag_ids.includes(tag)) return false;
    if (coll && !coll.product_ids.includes(p.id)) return false;
    if (type && p.product_type !== type) return false;
    for (const f of flags) {
      if (f === "variants" && variantsOf(state, p.id).length === 0) return false;
      if (f === "bundle" && !p.is_bundle) return false;
      if (f === "auction" && !p.is_auction) return false;
      if (f === "bookable" && !p.is_bookable) return false;
    }
    return true;
  });
}

const ORDERINGS: Record<string, (a: MockProduct, b: MockProduct, s: CatalogState) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, "ar"),
  price: (a, b) => compareDecimal(effectivePrice(a), effectivePrice(b)),
  stock: (a, b, s) => compareDecimal(effectiveStock(s, a), effectiveStock(s, b)),
  updated_at: (a, b) => a.updated_at.localeCompare(b.updated_at),
  sku: (a, b) => a.sku.localeCompare(b.sku),
};

export function listProducts(store: string | null, params: URLSearchParams): ProductListResponse {
  const state = catalog(store);
  const rows = filterProducts(state, params);
  const ordering = params.get("ordering") ?? "-updated_at";
  const key = ordering.replace(/^-/, "");
  const cmp = ORDERINGS[key] ?? ORDERINGS.updated_at!;
  const dir = ordering.startsWith("-") || !ORDERINGS[key] ? -1 : 1;
  rows.sort((a, b) => dir * cmp(a, b, state) || b.id - a.id);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: slice.map((p) => toListItem(state, p)),
    summary: productSummary(state),
  };
}

// ── Writes ────────────────────────────────────────────────────────────────────────────
type Body = Record<string, unknown>;
type FieldErrors = Record<string, string[]>;

const str = (v: unknown): string => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const decOrNull = (v: unknown): string | null => {
  const s = str(v).trim();
  return s === "" ? null : s;
};
const intOrNull = (v: unknown): number | null => {
  const s = str(v).trim();
  return s === "" ? null : Number.parseInt(s, 10);
};
const bool = (v: unknown): boolean => v === true || v === "true" || v === "on";
const ids = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n)) : []);

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function uniqueSlug(state: CatalogState, base: string, selfId?: number): string {
  let slug = base || `product-${state.ids.product + 1}`;
  let i = 2;
  while (state.products.some((p) => p.slug === slug && p.id !== selfId)) slug = `${base}-${i++}`;
  return slug;
}

function validate(body: Body, partial: boolean): FieldErrors {
  const e: FieldErrors = {};
  const has = (k: string) => !partial || k in body;
  if (has("name") && !str(body.name).trim()) e.name = ["أدخل اسم المنتج."];
  if (has("price") && !isDecimal(str(body.price))) e.price = ["أدخل السعر كرقم (مثال: 120.00)."];
  for (const k of ["old_price", "cost_price", "deposit_required", "tax_rate", "weight", "length", "width", "height"]) {
    if (k in body && decOrNull(body[k]) !== null && !isDecimal(str(body[k]))) e[k] = ["أدخل رقماً صحيحاً."];
  }
  if ("old_price" in body && decOrNull(body.old_price) && isDecimal(str(body.price)) && compareDecimal(str(body.old_price), str(body.price)) <= 0) {
    e.old_price = ["السعر القديم يجب أن يكون أكبر من السعر الحالي."];
  }
  if (body.payment_policy === "deposit" && !decOrNull(body.deposit_required)) e.deposit_required = ["أدخل قيمة العربون المطلوب."];
  return e;
}

/** Apply a ProductForm payload to a product (only keys present in `body`). */
function applyBody(state: CatalogState, p: MockProduct, body: Body) {
  const set = <K extends keyof MockProduct>(k: K, v: MockProduct[K]) => {
    if (k in body) p[k] = v;
  };
  set("name", str(body.name).trim());
  set("name_en", str(body.name_en));
  set("barcode", str(body.barcode));
  set("product_type", (str(body.product_type) || p.product_type) as MockProduct["product_type"]);
  set("category_id", intOrNull(body.category_id));
  set("brand_id", intOrNull(body.brand_id));
  set("tag_ids", ids(body.tag_ids));
  set("badge_ids", ids(body.badge_ids));
  set("price", str(body.price));
  set("old_price", decOrNull(body.old_price));
  set("sale_start_at", decOrNull(body.sale_start_at));
  set("sale_end_at", decOrNull(body.sale_end_at));
  set("cost_price", decOrNull(body.cost_price));
  set("currency", (str(body.currency) || p.currency) as Currency);
  set("payment_policy", (str(body.payment_policy) || p.payment_policy) as MockProduct["payment_policy"]);
  set("deposit_required", decOrNull(body.deposit_required));
  set("is_taxable", bool(body.is_taxable));
  set("tax_rate", decOrNull(body.tax_rate));
  set("pricing_type", (str(body.pricing_type) || p.pricing_type) as MockProduct["pricing_type"]);
  set("live_rate_ref", decOrNull(body.live_rate_ref));
  set("formula_unit_price", decOrNull(body.formula_unit_price));
  set("formula_coefficient", decOrNull(body.formula_coefficient));
  set("formula_fixed_extra", decOrNull(body.formula_fixed_extra));
  set("has_refundable_deposit", bool(body.has_refundable_deposit));
  set("refundable_deposit_amount", decOrNull(body.refundable_deposit_amount));
  set("refundable_deposit_refund_rule", str(body.refundable_deposit_refund_rule));
  set("refundable_deposit_return_event", str(body.refundable_deposit_return_event));
  set("is_serialized", bool(body.is_serialized));
  set("is_bundle", bool(body.is_bundle));
  set("bundle_build_fee", decOrNull(body.bundle_build_fee));
  set("is_auction", bool(body.is_auction));
  set("is_personalizable", bool(body.is_personalizable));
  set("is_bookable", bool(body.is_bookable));
  set("booking_duration_minutes", intOrNull(body.booking_duration_minutes));
  set("stock", str(body.stock) || p.stock);
  set("unit", (str(body.unit) || p.unit) as MockProduct["unit"]);
  set("low_stock_threshold", intOrNull(body.low_stock_threshold));
  set("allow_backorder", bool(body.allow_backorder));
  set("min_quantity", intOrNull(body.min_quantity));
  set("max_quantity", intOrNull(body.max_quantity));
  set("allow_variable_quantity", bool(body.allow_variable_quantity));
  set("description", str(body.description));
  set("description_en", str(body.description_en));
  set("image_url", str(body.image_url));
  set("video_url", str(body.video_url));
  set("variant_display_style", (str(body.variant_display_style) || p.variant_display_style) as MockProduct["variant_display_style"]);
  set("product_template", (str(body.product_template) || p.product_template) as MockProduct["product_template"]);
  set("is_available", bool(body.is_available));
  set("published_at", decOrNull(body.published_at));
  set("is_featured", bool(body.is_featured));
  set("is_free_shipping", bool(body.is_free_shipping));
  set("delivery_duration", str(body.delivery_duration));
  set("weight", decOrNull(body.weight));
  set("length", decOrNull(body.length));
  set("width", decOrNull(body.width));
  set("height", decOrNull(body.height));
  set("is_hazardous", bool(body.is_hazardous));
  set("hazard_class", (str(body.hazard_class) || p.hazard_class) as MockProduct["hazard_class"]);
  set("meta_title", str(body.meta_title));
  set("meta_description", str(body.meta_description));
  set("meta_keywords", str(body.meta_keywords));
  if ("slug" in body) p.slug = uniqueSlug(state, slugify(str(body.slug)) || slugify(p.name_en), p.id);
  if ("sku" in body && str(body.sku).trim()) p.sku = str(body.sku).trim();
  if ("collection_ids" in body) {
    const wanted = new Set(ids(body.collection_ids));
    for (const c of state.collections) {
      const has = c.product_ids.includes(p.id);
      if (wanted.has(c.id) && !has) c.product_ids.push(p.id);
      if (!wanted.has(c.id) && has) c.product_ids = c.product_ids.filter((x) => x !== p.id);
    }
  }
  // Model rules.
  if (p.is_auction) p.stock = "1.000";
  if (p.product_type !== "physical") p.is_free_shipping = false;
  if (p.payment_policy !== "deposit") p.deposit_required = null;
  if (!p.is_hazardous) p.hazard_class = "none";
}

function blankProduct(state: CatalogState, store: string | null): MockProduct {
  const id = nextCatalogId(state, "product");
  return {
    id,
    name: "",
    name_en: "",
    slug: "",
    sku: makeSku(seeded(id * 31 + (store?.length ?? 1))),
    barcode: "",
    product_type: "physical",
    category_id: null,
    brand_id: null,
    tag_ids: [],
    badge_ids: [],
    blueprint_id: null,
    price: "0.00",
    old_price: null,
    sale_start_at: null,
    sale_end_at: null,
    cost_price: null,
    currency: "SAR",
    payment_policy: "cod",
    deposit_required: null,
    is_taxable: false,
    tax_rate: null,
    pricing_type: "fixed",
    live_rate_ref: null,
    formula_unit_price: null,
    formula_coefficient: null,
    formula_fixed_extra: null,
    has_refundable_deposit: false,
    refundable_deposit_amount: null,
    refundable_deposit_refund_rule: "",
    refundable_deposit_return_event: "",
    is_serialized: false,
    is_bundle: false,
    bundle_build_fee: null,
    is_auction: false,
    auction_status: null,
    is_personalizable: false,
    is_bookable: false,
    booking_duration_minutes: null,
    stock: "0.000",
    unit: "piece",
    low_stock_threshold: null,
    allow_backorder: false,
    min_quantity: null,
    max_quantity: null,
    allow_variable_quantity: false,
    description: "",
    description_en: "",
    images: [],
    image_url: "",
    video_url: "",
    variant_display_style: "dropdown",
    product_template: "standard",
    is_available: true,
    published_at: null,
    archived_at: null,
    is_featured: false,
    is_free_shipping: false,
    delivery_duration: "",
    weight: null,
    length: null,
    width: null,
    height: null,
    is_hazardous: false,
    hazard_class: "none",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: null,
    variant_attribute_ids: [],
    views_count: 0,
    add_to_cart_count: 0,
    serial_available: null,
    created_at: now(),
    updated_at: now(),
  };
}

function logChanges(state: CatalogState, before: MockProduct, after: MockProduct, actor: string) {
  for (const [field] of Object.entries(TRACKED_FIELDS)) {
    const b = before[field as keyof MockProduct];
    const a = after[field as keyof MockProduct];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    state.changes.unshift({
      id: nextCatalogId(state, "change"),
      product_id: after.id,
      field,
      before: b === null || b === undefined ? null : String(b),
      after: a === null || a === undefined ? null : String(a),
      actor,
      at: now(),
    });
  }
}

export function actorName(session: { kind: string; staff?: { full_name: string } }): string {
  return session.kind === "staff" ? (session.staff?.full_name ?? "موظف") : "مالك المتجر";
}

export function createProduct(store: string | null, body: Body): MockResult<ProductDetail> {
  const errors = validate(body, false);
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const state = catalog(store);
  const p = blankProduct(state, store);
  applyBody(state, p, body);
  // [NEEDS BACKEND] create-from-template / duplicate keep the blueprint link (M04 presets, 2026-10-20).
  const blueprintId = intOrNull(body.blueprint_id);
  const template = blueprintId ? state.templates.find((t) => t.id === blueprintId) : undefined;
  if (template) {
    p.blueprint_id = template.id;
    p.variant_attribute_ids = [...template.variant_attribute_ids];
  }
  if (!p.slug) p.slug = uniqueSlug(state, slugify(p.name_en) || `product-${p.id}`);
  state.products.unshift(p);
  return { ok: true, status: 201, data: toDetail(state, p, false) };
}

export function applyTemplateFields(p: MockProduct, fields: Record<string, unknown>): number {
  let n = 0;
  for (const [k, v] of Object.entries(fields)) {
    if (k in p && k !== "id") {
      (p as unknown as Record<string, unknown>)[k] = v;
      n += 1;
    }
  }
  return n;
}

export function quickAdd(
  store: string | null,
  body: Body,
): MockResult<{ id: number; applied_template: { name: string; fields_count: number } | null }> {
  const errors: FieldErrors = {};
  if (!str(body.name).trim()) errors.name = ["أدخل اسم المنتج."];
  if (!isDecimal(str(body.price))) errors.price = ["أدخل السعر كرقم (مثال: 120.00)."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const state = catalog(store);
  const p = blankProduct(state, store);
  let applied: { name: string; fields_count: number } | null = null;
  const blueprintId = intOrNull(body.blueprint_id);
  const template = blueprintId ? state.templates.find((t) => t.id === blueprintId) : undefined;
  if (template) {
    // Blueprint first (`apply_to()`), then the merchant's own quick-add values win.
    const n = applyTemplateFields(p, template.fields);
    p.blueprint_id = template.id;
    p.variant_attribute_ids = [...template.variant_attribute_ids];
    applied = { name: template.name, fields_count: Math.max(n, Object.keys(template.fields).length) };
  }
  applyBody(state, p, {
    name: body.name,
    name_en: body.name_en,
    price: body.price,
    stock: str(body.stock) || "0",
    unit: body.unit ?? "piece",
    pricing_type: body.pricing_type ?? "fixed",
    formula_unit_price: body.formula_unit_price,
    formula_coefficient: body.formula_coefficient,
    formula_fixed_extra: body.formula_fixed_extra,
    is_serialized: body.is_serialized,
    is_bundle: body.is_bundle,
    is_auction: body.is_auction,
    is_personalizable: body.is_personalizable,
    is_available: true,
  });
  if (/^\d+$/.test(p.stock)) p.stock = `${p.stock}.000`;
  if (typeof body.image === "string" && body.image) {
    p.images = [{ id: nextCatalogId(state, "image"), url: body.image, sort_order: 0 }];
  }
  p.slug = uniqueSlug(state, slugify(p.name_en) || `product-${p.id}`);
  state.products.unshift(p);
  return { ok: true, status: 201, data: { id: p.id, applied_template: applied } };
}

export function findProduct(store: string | null, id: number) {
  const state = catalog(store);
  const p = state.products.find((x) => x.id === id);
  return { state, p };
}

export function updateProduct(
  store: string | null,
  id: number,
  body: Body,
  actor: string,
  hasOrders: boolean,
): MockResult<ProductDetail> {
  const { state, p } = findProduct(store, id);
  if (!p) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  if (p.is_auction && p.auction_status === "active" && ("price" in body || "stock" in body)) {
    if (str(body.price) !== p.price) {
      return { ok: false, status: 400, body: { price: ["لا يمكن تعديل السعر أثناء مزاد نشط."] } };
    }
  }
  const errors = validate({ ...p, ...body } as Body, true);
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const before = structuredClone(p);
  applyBody(state, p, body);
  p.updated_at = now();
  logChanges(state, before, p, actor);
  return { ok: true, data: toDetail(state, p, hasOrders) };
}

export function deleteProduct(store: string | null, id: number, hasOrders: boolean): MockResult<{ archived: boolean } | null> {
  const { state, p } = findProduct(store, id);
  if (!p) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  if (hasOrders) {
    // M04 §8: a product with orders is archived, never deleted; orders keep their snapshots.
    p.archived_at = now();
    p.updated_at = now();
    return { ok: true, data: { archived: true } };
  }
  state.products = state.products.filter((x) => x.id !== id);
  state.variants = state.variants.filter((v) => v.product_id !== id);
  for (const c of state.collections) c.product_ids = c.product_ids.filter((x) => x !== id);
  return { ok: true, data: { archived: false } };
}

export function setStock(store: string | null, id: number, stock: unknown, actor: string): MockResult<{ stock: string; is_low_stock: boolean }> {
  const { state, p } = findProduct(store, id);
  if (!p) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  const value = str(stock).trim();
  if (!/^\d+(\.\d{1,3})?$/.test(value)) return { ok: false, status: 400, body: { stock: ["المخزون رقم حتى 3 خانات عشرية."] } };
  if (p.is_auction && p.auction_status === "active") {
    return { ok: false, status: 400, body: { detail: "المخزون محجوب أثناء مزاد نشط." } };
  }
  if (p.is_serialized) return { ok: false, status: 400, body: { detail: "مخزون هذا المنتج يُدار بالأرقام التسلسلية." } };
  if (variantsOf(state, p.id).length > 0) return { ok: false, status: 400, body: { detail: "المخزون يُدار على المتغيرات." } };
  const before = structuredClone(p);
  p.stock = value.includes(".") ? value.padEnd(value.indexOf(".") + 4, "0") : `${value}.000`;
  p.updated_at = now();
  logChanges(state, before, p, actor);
  return { ok: true, data: { stock: p.stock, is_low_stock: isLowStock(p, p.stock) } };
}

/** In-place price edit from the list (FR-04.11) goes through PATCH with `{price}`. */
export function setPrice(store: string | null, id: number, price: string, actor: string) {
  return updateProduct(store, id, { price }, actor, false);
}

// ── Images ────────────────────────────────────────────────────────────────────────────
export function addImages(store: string | null, id: number, urls: string[]) {
  const { state, p } = findProduct(store, id);
  if (!p) return null;
  for (const url of urls) {
    p.images.push({ id: nextCatalogId(state, "image"), url, sort_order: p.images.length });
  }
  p.updated_at = now();
  return p.images;
}

export function deleteImage(store: string | null, id: number, imageId: number) {
  const { p } = findProduct(store, id);
  if (!p) return null;
  p.images = p.images.filter((i) => i.id !== imageId).map((img, i) => ({ ...img, sort_order: i }));
  return p.images;
}

export function reorderImages(store: string | null, id: number, ordered: number[]) {
  const { p } = findProduct(store, id);
  if (!p) return null;
  const byId = new Map(p.images.map((i) => [i.id, i]));
  const next = ordered.map((iid) => byId.get(iid)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  for (const img of p.images) if (!ordered.includes(img.id)) next.push(img);
  p.images = next.map((img, i) => ({ ...img, sort_order: i }));
  return p.images;
}

// ── Variants ──────────────────────────────────────────────────────────────────────────
export function generateVariants(
  store: string | null,
  id: number,
  attributeIds: number[],
  optionIds: number[] | undefined,
  exclude: number[][],
): MockResult<ProductVariant[]> {
  const { state, p } = findProduct(store, id);
  if (!p) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  const attrs = attributeIds
    .map((aid) => state.attributes.find((a) => a.id === aid))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .sort((a, b) => a.sort_order - b.sort_order);
  if (attrs.length === 0) {
    state.variants = state.variants.filter((v) => v.product_id !== id);
    p.variant_attribute_ids = [];
    return { ok: true, data: [] };
  }
  const groups = attrs.map((a) =>
    a.options.filter((o) => !optionIds || optionIds.includes(o.id)).map((o) => o.id),
  );
  if (groups.some((g) => g.length === 0)) {
    return { ok: false, status: 400, body: { detail: "اختر قيمة واحدة على الأقل لكل سمة." } };
  }
  const combos = groups.reduce<number[][]>((acc, g) => acc.flatMap((c) => g.map((o) => [...c, o])), [[]]);
  const key = (c: number[]) => [...c].sort((a, b) => a - b).join(",");
  const excluded = new Set(exclude.map(key));
  const existing = new Map(variantsOf(state, id).map((v) => [key(v.option_ids), v]));
  const next: MockVariant[] = [];
  for (const combo of combos) {
    if (excluded.has(key(combo))) continue;
    const prev = existing.get(key(combo));
    next.push(
      prev ?? {
        id: nextCatalogId(state, "variant"),
        product_id: id,
        option_ids: combo,
        sku: `${p.sku}-${combo.join("")}`,
        extra_price: "0.00",
        stock: "0.000",
        image: null,
      },
    );
  }
  state.variants = state.variants.filter((v) => v.product_id !== id).concat(next);
  p.variant_attribute_ids = attrs.map((a) => a.id);
  p.updated_at = now();
  return { ok: true, data: next.map((v) => toVariant(state, p, v)) };
}

export function bulkPatchVariants(
  store: string | null,
  id: number,
  rows: Array<{ id: number; sku?: string; extra_price?: string; stock?: string }>,
): MockResult<ProductVariant[]> {
  const { state, p } = findProduct(store, id);
  if (!p) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  const errors: FieldErrors = {};
  for (const r of rows) {
    if (r.extra_price !== undefined && !isDecimal(r.extra_price)) errors[`variants.${r.id}.extra_price`] = ["رقم غير صالح."];
    if (r.stock !== undefined && !/^\d+(\.\d{1,3})?$/.test(r.stock)) errors[`variants.${r.id}.stock`] = ["رقم غير صالح."];
  }
  const skus = new Map<string, number>();
  for (const v of state.variants) skus.set(v.sku, v.id);
  for (const r of rows) {
    if (r.sku && skus.has(r.sku) && skus.get(r.sku) !== r.id) errors[`variants.${r.id}.sku`] = ["SKU مستخدم لمتغير آخر."];
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  for (const r of rows) {
    const v = state.variants.find((x) => x.id === r.id && x.product_id === id);
    if (!v) continue;
    if (r.sku !== undefined) v.sku = r.sku;
    if (r.extra_price !== undefined) v.extra_price = r.extra_price;
    if (r.stock !== undefined) v.stock = r.stock.includes(".") ? r.stock : `${r.stock}.000`;
  }
  p.updated_at = now();
  return { ok: true, data: variantsOf(state, id).map((v) => toVariant(state, p, v)) };
}

// ── Change log ────────────────────────────────────────────────────────────────────────
export function productChanges(store: string | null, id: number, page: number) {
  const state = catalog(store);
  const rows = state.changes.filter((c) => c.product_id === id);
  const size = 20;
  return {
    count: rows.length,
    next: page * size < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * size, page * size).map((c) => ({
      id: c.id,
      field: c.field,
      field_label: TRACKED_FIELDS[c.field] ?? c.field,
      before: c.before,
      after: c.after,
      actor: c.actor,
      at: c.at,
    })),
  };
}

// ── Bulk ──────────────────────────────────────────────────────────────────────────────
export function bulkProducts(
  store: string | null,
  idsIn: unknown,
  action: string,
  payload: Record<string, unknown>,
  hasOrders: (id: number) => boolean,
): MockResult<{ succeeded: number[]; failed: Array<{ id: number; reason: string }> }> {
  const state = catalog(store);
  const list = ids(idsIn);
  if (list.length === 0) return { ok: false, status: 400, body: { ids: ["اختر منتجاً واحداً على الأقل."] } };
  const succeeded: number[] = [];
  const failed: Array<{ id: number; reason: string }> = [];
  const categoryId = intOrNull(payload.category_id);
  const tagId = intOrNull(payload.tag_id);
  if (action === "set_category" && categoryId !== null && !state.categories.some((c) => c.id === categoryId)) {
    return { ok: false, status: 400, body: { payload: ["التصنيف غير موجود."] } };
  }
  for (const id of list) {
    const p = state.products.find((x) => x.id === id);
    if (!p) {
      failed.push({ id, reason: "غير موجود" });
      continue;
    }
    const activeAuction = p.is_auction && p.auction_status === "active";
    switch (action) {
      case "publish":
        if (p.archived_at) {
          failed.push({ id, reason: "مؤرشف — ألغِ الأرشفة أولاً" });
          continue;
        }
        p.is_available = true;
        p.published_at = null;
        break;
      case "archive":
        if (activeAuction) {
          failed.push({ id, reason: "مزاد نشط" });
          continue;
        }
        p.archived_at = now();
        break;
      case "unarchive":
        p.archived_at = null;
        break;
      case "delete":
        if (activeAuction) {
          failed.push({ id, reason: "مزاد نشط" });
          continue;
        }
        if (hasOrders(id)) {
          p.archived_at = now();
          failed.push({ id, reason: "له طلبات — أُرشف بدل الحذف" });
          continue;
        }
        state.products = state.products.filter((x) => x.id !== id);
        break;
      case "set_category":
        p.category_id = categoryId;
        break;
      case "add_tag":
        if (tagId === null) {
          failed.push({ id, reason: "لم يُحدَّد وسم" });
          continue;
        }
        if (!p.tag_ids.includes(tagId)) p.tag_ids.push(tagId);
        break;
      case "remove_tag":
        p.tag_ids = p.tag_ids.filter((t) => t !== tagId);
        break;
      default:
        return { ok: false, status: 400, body: { action: ["إجراء غير معروف."] } };
    }
    p.updated_at = now();
    succeeded.push(id);
  }
  return { ok: true, data: { succeeded, failed } };
}

// ── CSV ───────────────────────────────────────────────────────────────────────────────
function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function exportCsv(store: string | null, params: URLSearchParams): string {
  const state = catalog(store);
  const rows = filterProducts(state, params).map((p) => toListItem(state, p));
  const header = ["id", "name", "sku", "price", "stock", "unit", "category", "status", "updated_at"];
  const lines = rows.map((r) =>
    [String(r.id), r.name, r.sku, r.display_price, r.stock, r.unit, r.category?.name ?? "", r.status, r.updated_at]
      .map(csvCell)
      .join(","),
  );
  // BOM so Excel opens Arabic text as UTF-8.
  return `﻿${header.join(",")}\n${lines.join("\n")}\n`;
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  const delimiter = text.includes("\t") && !text.split("\n")[0]!.includes(",") ? "\t" : ",";
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) out.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) out.push(row);
  return out;
}
