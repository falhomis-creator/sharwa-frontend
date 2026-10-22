import type { MockResult } from "@/lib/bff/mock-route";
import { DATA_TYPES, FIELD_TYPES, type VariantAttribute, type VariantOption } from "@/features/products/schemas";
import { defaultBlueprintFields, type ApplyTemplateResult, type ProductTemplate } from "@/features/products/schemas";
import { globalTemplates } from "@/mocks/catalog/seed";
import { applyTemplateFields } from "@/mocks/catalog/products";
import { catalog, nextCatalogId } from "@/mocks/catalog/state";
import { FIXTURE_NOW } from "@/mocks/store-state";

/**
 * Variant dictionary (`variant_hub`) and blueprints (`ProductTemplate`) — M04 §7 rows,
 * all `[NEEDS BACKEND]`. Deleting an attribute used by variants is refused with the count
 * of affected products (M04 §8). Applying a central sector copies its attributes into the
 * store dictionary without duplicating the existing ones (US-04.6.1).
 */
type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const now = () => new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString();

function productsUsing(store: string | null, attributeId: number): number {
  const state = catalog(store);
  const optionIds = new Set(state.attributes.find((a) => a.id === attributeId)?.options.map((o) => o.id) ?? []);
  const products = new Set<number>();
  for (const v of state.variants) if (v.option_ids.some((o) => optionIds.has(o))) products.add(v.product_id);
  return products.size;
}

export function listAttributes(store: string | null): VariantAttribute[] {
  const state = catalog(store);
  return [...state.attributes]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => ({ ...a, products_count: productsUsing(store, a.id) }));
}

function validateAttribute(body: Body): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  if (!str(body.name).trim()) e.name = ["أدخل اسم السمة."];
  if (!(FIELD_TYPES as readonly string[]).includes(str(body.field_type))) e.field_type = ["اختر نوع الحقل."];
  if (!(DATA_TYPES as readonly string[]).includes(str(body.data_type))) e.data_type = ["اختر نوع البيانات."];
  if (body.data_type === "unit" && !str(body.unit).trim()) e.unit = ["أدخل الوحدة (مثال: سم، غ)."];
  return e;
}

export function createAttribute(store: string | null, body: Body): MockResult<VariantAttribute> {
  const errors = validateAttribute(body);
  const state = catalog(store);
  if (state.attributes.some((a) => a.name === str(body.name).trim())) errors.name = ["سمة بهذا الاسم موجودة."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const attr = {
    id: nextCatalogId(state, "attribute"),
    name: str(body.name).trim(),
    field_type: str(body.field_type) as VariantAttribute["field_type"],
    data_type: str(body.data_type) as VariantAttribute["data_type"],
    unit: str(body.unit),
    min_value: str(body.min_value) || null,
    max_value: str(body.max_value) || null,
    is_required: Boolean(body.is_required),
    sort_order: Number(str(body.sort_order) || state.attributes.length),
    options: [] as VariantOption[],
  };
  state.attributes.push(attr);
  return { ok: true, status: 201, data: { ...attr, products_count: 0 } };
}

export function updateAttribute(store: string | null, id: number, body: Body): MockResult<VariantAttribute> {
  const state = catalog(store);
  const attr = state.attributes.find((a) => a.id === id);
  if (!attr) return { ok: false, status: 404, body: { detail: "السمة غير موجودة." } };
  const errors = validateAttribute({ ...attr, ...body });
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if ("name" in body) attr.name = str(body.name).trim();
  if ("field_type" in body) attr.field_type = str(body.field_type) as VariantAttribute["field_type"];
  if ("data_type" in body) attr.data_type = str(body.data_type) as VariantAttribute["data_type"];
  if ("unit" in body) attr.unit = str(body.unit);
  if ("min_value" in body) attr.min_value = str(body.min_value) || null;
  if ("max_value" in body) attr.max_value = str(body.max_value) || null;
  if ("is_required" in body) attr.is_required = Boolean(body.is_required);
  if ("sort_order" in body) attr.sort_order = Number(str(body.sort_order) || 0);
  return { ok: true, data: { ...attr, products_count: productsUsing(store, id) } };
}

export function deleteAttribute(store: string | null, id: number): MockResult<null> {
  const state = catalog(store);
  const used = productsUsing(store, id);
  if (used > 0) {
    return {
      ok: false,
      status: 409,
      body: { detail: `لا يمكن حذف السمة: مستخدمة في متغيرات ${used} ${used === 1 ? "منتج" : "منتجات"}.`, products_count: used },
    };
  }
  state.attributes = state.attributes.filter((a) => a.id !== id);
  return { ok: true, status: 204, data: null };
}

function optionValueErrors(attr: { data_type: string; min_value: string | null; max_value: string | null }, value: string) {
  if (!value.trim()) return ["أدخل القيمة."];
  if (attr.data_type === "number" || attr.data_type === "unit") {
    if (!/^-?\d+(\.\d+)?$/.test(value)) return ["القيمة رقم."];
    const n = Number(value);
    if (attr.min_value !== null && n < Number(attr.min_value)) return [`أقل قيمة مسموحة ${attr.min_value}.`];
    if (attr.max_value !== null && n > Number(attr.max_value)) return [`أعلى قيمة مسموحة ${attr.max_value}.`];
  }
  if (attr.data_type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ["تاريخ بصيغة YYYY-MM-DD."];
  return null;
}

export function createOption(store: string | null, attributeId: number, body: Body): MockResult<VariantOption> {
  const state = catalog(store);
  const attr = state.attributes.find((a) => a.id === attributeId);
  if (!attr) return { ok: false, status: 404, body: { detail: "السمة غير موجودة." } };
  const value = str(body.value).trim();
  const err = optionValueErrors(attr, value);
  if (err) return { ok: false, status: 400, body: { value: err } };
  if (attr.options.some((o) => o.value === value)) return { ok: false, status: 400, body: { value: ["القيمة موجودة."] } };
  const typed = attr.data_type === "number" || attr.data_type === "unit";
  const opt: VariantOption = {
    id: nextCatalogId(state, "option"),
    attribute_id: attributeId,
    value,
    text_value: typed ? null : value,
    numeric_value: attr.data_type === "number" ? value : null,
    unit_value: attr.data_type === "unit" ? value : null,
    boolean_value: attr.data_type === "bool" ? value === "نعم" : null,
    date_value: attr.data_type === "date" ? value : null,
    image: typeof body.image === "string" && body.image ? body.image : null,
    color: typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : null,
  };
  attr.options.push(opt);
  return { ok: true, status: 201, data: opt };
}

export function updateOption(store: string | null, optionId: number, body: Body): MockResult<VariantOption> {
  const state = catalog(store);
  const attr = state.attributes.find((a) => a.options.some((o) => o.id === optionId));
  const opt = attr?.options.find((o) => o.id === optionId);
  if (!attr || !opt) return { ok: false, status: 404, body: { detail: "القيمة غير موجودة." } };
  if ("value" in body) {
    const value = str(body.value).trim();
    const err = optionValueErrors(attr, value);
    if (err) return { ok: false, status: 400, body: { value: err } };
    opt.value = value;
    if (opt.text_value !== null) opt.text_value = value;
    if (opt.numeric_value !== null) opt.numeric_value = value;
    if (opt.unit_value !== null) opt.unit_value = value;
  }
  if ("color" in body) opt.color = typeof body.color === "string" && body.color ? body.color : null;
  if ("image" in body) opt.image = typeof body.image === "string" && body.image ? body.image : null;
  return { ok: true, data: opt };
}

export function deleteOption(store: string | null, optionId: number): MockResult<null> {
  const state = catalog(store);
  const used = new Set(state.variants.filter((v) => v.option_ids.includes(optionId)).map((v) => v.product_id)).size;
  if (used > 0) {
    return { ok: false, status: 409, body: { detail: `القيمة مستخدمة في متغيرات ${used} ${used === 1 ? "منتج" : "منتجات"}.` } };
  }
  for (const a of state.attributes) a.options = a.options.filter((o) => o.id !== optionId);
  return { ok: true, status: 204, data: null };
}

// ── Templates ─────────────────────────────────────────────────────────────────────────
export function listTemplates(store: string | null): ProductTemplate[] {
  const state = catalog(store);
  return state.templates.map((t) => ({
    ...t,
    products_count: state.products.filter((p) => p.blueprint_id === t.id).length,
  }));
}

function templateFieldsFrom(body: Body): Record<string, string | boolean | number | null> {
  const raw = body.fields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string | boolean | number | null> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "boolean" || typeof v === "number" || v === null) out[k] = v;
  }
  return out;
}

export function createTemplate(store: string | null, body: Body): MockResult<ProductTemplate> {
  const state = catalog(store);
  const name = str(body.name).trim();
  if (!name) return { ok: false, status: 400, body: { name: ["أدخل اسم القالب."] } };
  if (state.templates.some((t) => t.name === name)) return { ok: false, status: 400, body: { name: ["قالب بهذا الاسم موجود."] } };
  const posted = templateFieldsFrom(body);
  // A template always carries a blueprint: from scratch it starts from the defaults, and the
  // fields the merchant posted win over them. [NEEDS BACKEND] same rule in Django.
  let fields: Record<string, string | boolean | number | null> = { ...defaultBlueprintFields(), ...posted };
  let attributeIds = Array.isArray(body.variant_attribute_ids)
    ? [...new Set(body.variant_attribute_ids.map(Number).filter((id) => state.attributes.some((a) => a.id === id)))]
    : [];
  const fromProduct = Number(body.from_product_id);
  if (fromProduct) {
    const p = state.products.find((x) => x.id === fromProduct);
    if (p) {
      fields = {
        ...posted,
        product_type: p.product_type,
        unit: p.unit,
        currency: p.currency,
        payment_policy: p.payment_policy,
        deposit_required: p.deposit_required,
        is_taxable: p.is_taxable,
        tax_rate: p.tax_rate,
        low_stock_threshold: p.low_stock_threshold,
        variant_display_style: p.variant_display_style,
        is_free_shipping: p.is_free_shipping,
        delivery_duration: p.delivery_duration,
        weight: p.weight,
        is_hazardous: p.is_hazardous,
        hazard_class: p.hazard_class,
      };
      // Merge, not replace: attributes the merchant checked in the form (e.g. from a standard
      // category preset) survive alongside the product's own. [NEEDS BACKEND] same semantics.
      attributeIds = [...new Set([...attributeIds, ...p.variant_attribute_ids])];
    }
  }
  const t = {
    id: nextCatalogId(state, "template"),
    name,
    global_template_id: Number(body.global_template_id) || null,
    variant_attribute_ids: attributeIds,
    fields,
    updated_at: now(),
  };
  state.templates.push(t);
  return { ok: true, status: 201, data: { ...t, products_count: 0 } };
}

export function updateTemplate(store: string | null, id: number, body: Body): MockResult<ProductTemplate> {
  const state = catalog(store);
  const t = state.templates.find((x) => x.id === id);
  if (!t) return { ok: false, status: 404, body: { detail: "القالب غير موجود." } };
  if ("name" in body) {
    const name = str(body.name).trim();
    if (!name) return { ok: false, status: 400, body: { name: ["أدخل اسم القالب."] } };
    t.name = name;
  }
  if ("fields" in body) t.fields = templateFieldsFrom(body);
  if (Array.isArray(body.variant_attribute_ids)) t.variant_attribute_ids = body.variant_attribute_ids.map(Number);
  t.updated_at = now();
  return { ok: true, data: { ...t, products_count: state.products.filter((p) => p.blueprint_id === id).length } };
}

export function deleteTemplate(store: string | null, id: number): MockResult<null> {
  const state = catalog(store);
  state.templates = state.templates.filter((t) => t.id !== id);
  for (const p of state.products) if (p.blueprint_id === id) p.blueprint_id = null;
  return { ok: true, status: 204, data: null };
}

export function applyTemplate(store: string | null, id: number, productIds: number[]): MockResult<ApplyTemplateResult> {
  const state = catalog(store);
  const t = state.templates.find((x) => x.id === id);
  if (!t) return { ok: false, status: 404, body: { detail: "القالب غير موجود." } };
  let applied = 0;
  const skipped: ApplyTemplateResult["skipped"] = [];
  for (const pid of productIds) {
    const p = state.products.find((x) => x.id === pid);
    if (!p) {
      skipped.push({ id: pid, reason: "غير موجود" });
      continue;
    }
    if (p.is_auction && p.auction_status === "active") {
      skipped.push({ id: pid, reason: "مزاد نشط" });
      continue;
    }
    applyTemplateFields(p, t.fields);
    p.blueprint_id = t.id;
    p.updated_at = now();
    applied += 1;
  }
  return { ok: true, data: { applied, skipped, fields: Object.keys(t.fields) } };
}

export function applyGlobal(store: string | null, id: number, globalId: number) {
  const state = catalog(store);
  const t = state.templates.find((x) => x.id === id);
  const g = globalTemplates().find((x) => x.id === globalId);
  if (!t || !g) return { ok: false as const, status: 404, body: { detail: "القالب أو القطاع غير موجود." } };
  const added: string[] = [];
  const existing: string[] = [];
  for (const ga of g.attributes) {
    let attr = state.attributes.find((a) => a.name === ga.name);
    if (attr) existing.push(ga.name);
    else {
      attr = {
        id: nextCatalogId(state, "attribute"),
        name: ga.name,
        field_type: ga.field_type,
        data_type: ga.data_type,
        unit: ga.data_type === "unit" ? "مل" : "",
        min_value: null,
        max_value: null,
        is_required: false,
        sort_order: state.attributes.length,
        options: [],
      };
      state.attributes.push(attr);
      added.push(ga.name);
    }
    for (const value of ga.values) {
      if (!attr.options.some((o) => o.value === value)) {
        attr.options.push({
          id: nextCatalogId(state, "option"),
          attribute_id: attr.id,
          value,
          text_value: ga.data_type === "text" ? value : null,
          numeric_value: ga.data_type === "number" ? value : null,
          unit_value: ga.data_type === "unit" ? value : null,
          boolean_value: null,
          date_value: null,
          image: null,
          color: null,
        });
      }
    }
    if (!t.variant_attribute_ids.includes(attr.id)) t.variant_attribute_ids.push(attr.id);
  }
  t.global_template_id = g.id;
  t.updated_at = now();
  return { ok: true as const, data: { added_attributes: added, existing_attributes: existing } };
}
