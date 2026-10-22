import { normalizeNumberText, type ProductDetail, type ProductFormValues } from "@/features/products/schemas";

/**
 * ProductDetail (API) ⇄ ProductFormValues (RHF). Inputs are text; the payload sends decimal
 * TEXT for money/quantities (data-model §6), integers for counts, `null` for empty
 * optionals — never a float.
 */
const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
/** `"1.500"` (Django Decimal(12,3)) → `"1.5"`, `"2.000"` → `"2"` for the quantity inputs. */
const quantity = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "" : v.includes(".") ? v.replace(/\.?0+$/, "") : v);

/** `2026-10-20T09:00:00.000Z` → `2026-10-20T12:00` in the browser's zone (datetime-local). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  name_en: "",
  slug: "",
  sku: "",
  barcode: "",
  product_type: "physical",
  category_id: "",
  brand_id: "",
  tag_ids: [],
  badge_ids: [],
  collection_ids: [],
  price: "",
  old_price: "",
  sale_start_at: "",
  sale_end_at: "",
  cost_price: "",
  currency: "SAR",
  payment_policy: "cod",
  deposit_required: "",
  is_taxable: false,
  tax_rate: "",
  pricing_type: "fixed",
  live_rate_ref: "",
  formula_unit_price: "",
  formula_coefficient: "",
  formula_fixed_extra: "",
  has_refundable_deposit: false,
  refundable_deposit_amount: "",
  refundable_deposit_refund_rule: "",
  refundable_deposit_return_event: "",
  is_serialized: false,
  is_bundle: false,
  bundle_build_fee: "",
  is_auction: false,
  is_personalizable: false,
  is_bookable: false,
  booking_duration_minutes: "",
  stock: "0",
  unit: "piece",
  low_stock_threshold: "",
  allow_backorder: false,
  min_quantity: "",
  max_quantity: "",
  allow_variable_quantity: false,
  description: "",
  description_en: "",
  image_url: "",
  video_url: "",
  variant_display_style: "dropdown",
  product_template: "standard",
  is_available: true,
  published_at: "",
  is_featured: false,
  is_free_shipping: false,
  delivery_duration: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  is_hazardous: false,
  hazard_class: "none",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
};

export function detailToForm(p: ProductDetail): ProductFormValues {
  return {
    name: p.name,
    name_en: p.name_en,
    slug: p.slug,
    sku: p.sku,
    barcode: p.barcode,
    product_type: p.product_type,
    category_id: s(p.category_id),
    brand_id: s(p.brand_id),
    tag_ids: p.tag_ids,
    badge_ids: p.badge_ids,
    collection_ids: p.collection_ids,
    price: p.price,
    old_price: s(p.old_price),
    sale_start_at: isoToLocalInput(p.sale_start_at),
    sale_end_at: isoToLocalInput(p.sale_end_at),
    cost_price: s(p.cost_price),
    currency: p.currency,
    payment_policy: p.payment_policy,
    deposit_required: s(p.deposit_required),
    is_taxable: p.is_taxable,
    tax_rate: s(p.tax_rate),
    pricing_type: p.pricing_type,
    live_rate_ref: s(p.live_rate_ref),
    formula_unit_price: s(p.formula_unit_price),
    formula_coefficient: s(p.formula_coefficient),
    formula_fixed_extra: s(p.formula_fixed_extra),
    has_refundable_deposit: p.has_refundable_deposit,
    refundable_deposit_amount: s(p.refundable_deposit_amount),
    refundable_deposit_refund_rule: p.refundable_deposit_refund_rule,
    refundable_deposit_return_event: p.refundable_deposit_return_event,
    is_serialized: p.is_serialized,
    is_bundle: p.is_bundle,
    bundle_build_fee: s(p.bundle_build_fee),
    is_auction: p.is_auction,
    is_personalizable: p.is_personalizable,
    is_bookable: p.is_bookable,
    booking_duration_minutes: s(p.booking_duration_minutes),
    stock: String(Number(p.stock)),
    unit: p.unit,
    low_stock_threshold: s(p.low_stock_threshold),
    allow_backorder: p.allow_backorder,
    min_quantity: quantity(p.min_quantity),
    max_quantity: quantity(p.max_quantity),
    allow_variable_quantity: p.allow_variable_quantity,
    description: p.description,
    description_en: p.description_en,
    image_url: p.image_url,
    video_url: p.video_url,
    variant_display_style: p.variant_display_style,
    product_template: p.product_template,
    is_available: p.is_available,
    published_at: isoToLocalInput(p.published_at),
    is_featured: p.is_featured,
    is_free_shipping: p.is_free_shipping,
    delivery_duration: p.delivery_duration,
    weight: s(p.weight),
    length: s(p.length),
    width: s(p.width),
    height: s(p.height),
    is_hazardous: p.is_hazardous,
    hazard_class: p.hazard_class,
    meta_title: p.meta_title,
    meta_description: p.meta_description,
    meta_keywords: p.meta_keywords,
  };
}

const DECIMAL_FIELDS = [
  "price",
  "old_price",
  "cost_price",
  "deposit_required",
  "tax_rate",
  "formula_unit_price",
  "formula_coefficient",
  "formula_fixed_extra",
  "refundable_deposit_amount",
  "bundle_build_fee",
  "stock",
  "min_quantity",
  "max_quantity",
  "weight",
  "length",
  "width",
  "height",
] as const;

const INT_FIELDS = ["booking_duration_minutes", "low_stock_threshold", "category_id", "brand_id"] as const;

/**
 * Whatever the merchant typed in «الرابط (slug)» becomes a valid slug instead of an error
 * (schema audit 2026-10-23): lower-case, spaces and underscores → «-», only letters (Arabic
 * included, as Django's own slugs), digits and «-». Empty stays empty (Django generates one).
 */
export function toSlug(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

/** An optional link: «www.example.com» → «https://www.example.com»; empty stays empty. */
export function toUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function formToPayload(v: ProductFormValues): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of DECIMAL_FIELDS) {
    const raw = normalizeNumberText(v[k]);
    out[k] = raw === "" ? null : raw;
  }
  for (const k of INT_FIELDS) {
    const raw = normalizeNumberText(v[k]);
    out[k] = raw === "" ? null : Number.parseInt(raw, 10);
  }
  out.name = v.name.trim();
  out.slug = toSlug(v.slug);
  out.sku = v.sku.trim();
  out.barcode = v.barcode.trim();
  out.image_url = toUrl(v.image_url);
  out.video_url = toUrl(v.video_url);
  out.sale_start_at = localInputToIso(v.sale_start_at);
  out.sale_end_at = localInputToIso(v.sale_end_at);
  out.published_at = localInputToIso(v.published_at);
  out.live_rate_ref = v.live_rate_ref || null;
  // Conditional fields that are hidden are also not sent (FR-04.04).
  if (v.payment_policy !== "deposit") out.deposit_required = null;
  if (!v.is_taxable) out.tax_rate = null;
  if (v.pricing_type !== "formula") {
    out.formula_unit_price = null;
    out.formula_coefficient = null;
    out.formula_fixed_extra = null;
    out.live_rate_ref = null;
  }
  if (!v.has_refundable_deposit) out.refundable_deposit_amount = null;
  if (!v.is_bundle) out.bundle_build_fee = null;
  if (!v.is_bookable) out.booking_duration_minutes = null;
  if (!v.is_hazardous || v.product_type !== "physical") {
    out.is_hazardous = v.product_type === "physical" ? v.is_hazardous : false;
    if (!out.is_hazardous) out.hazard_class = "none";
  }
  // Optional with a default: an empty stock is 0. A formula computes the price server-side.
  if (out.stock === null) out.stock = "0";
  if (v.pricing_type === "formula" && out.price === null) delete out.price;
  return out;
}
