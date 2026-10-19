import type { MockResult } from "@/lib/bff/mock-route";
import type { Currency } from "@/lib/schemas/money";
import { fullName, seeded } from "@/mocks/_fixtures";
import type { MockProduct } from "@/mocks/catalog/seed";
import { catalog, nextCatalogId, type CatalogState } from "@/mocks/catalog/state";
import { FIXTURE_NOW, seedOf, storeState } from "@/mocks/store-state";
import { AUCTIONS, BUNDLES, PERSONALIZATION, TIER_PRICES } from "@/mocks/storefront/extensions";
import { fmt } from "@/mocks/storefront/money";

/**
 * The mock SERVER of M37 (bundles, compatibility rules, personalization fields, auction,
 * serials, formula preview) and of M36's quantity prices — the rows `edit_product` keeps
 * HTML-only today (`[NEEDS BACKEND]`). One state per store, shared by the merchant editor
 * (`/api/bff/products/<id>/extras/*`) and the storefront PDP (`src/mocks/storefront/catalog.ts`
 * projects it), so what the merchant saves is what the buyer sees.
 *
 * Every derived price is computed HERE and sent as a `display_*` string (FR-37.02).
 * The auction `reserve` never leaves the merchant rows (FR-37.06).
 */
export const PERSONALIZATION_TYPES = ["text", "textarea", "number", "select", "multi_select", "date", "checkbox", "file", "image"] as const;
export type PersonalizationType = (typeof PERSONALIZATION_TYPES)[number];
export const COMPAT_OPERATORS = ["equals", "not_equals", "in"] as const;
export type CompatOperator = (typeof COMPAT_OPERATORS)[number];
export const AUCTION_STATUSES = ["draft", "active", "ended"] as const;
export type AuctionStatus = (typeof AUCTION_STATUSES)[number];
export const SERIAL_STATUSES = ["available", "reserved", "sold"] as const;

export interface TierRow {
  id: number;
  min_quantity: number;
  price: string;
}
export interface BundleRow {
  id: number;
  component_id: number;
  quantity: string;
  is_optional: boolean;
}
export interface RuleRow {
  id: number;
  attribute_a_id: number;
  operator: CompatOperator;
  attribute_b_id: number | null;
  value: string | null;
}
export interface FieldRow {
  id: number;
  label: string;
  field_type: PersonalizationType;
  price_add: string | null;
  is_required: boolean;
  options_csv: string;
  sort_order: number;
}
export interface AuctionRow {
  status: AuctionStatus;
  start_bid: string;
  bid_step: string;
  reserve: string | null;
  buy_now: string | null;
  end_at: number | null;
  anti_sniping_seconds: number;
}
export interface BidRow {
  bidder_name: string;
  bidder_phone: string;
  amount: string;
  created_at: number;
}
export interface SerialRow {
  code: string;
  status: (typeof SERIAL_STATUSES)[number];
}

/**
 * Which variant attribute a component is picked by inside a bundle (fixture: the bundle
 * components have no variant matrix of their own in M04's seed). Option ids are the store
 * dictionary's (attribute 2 = اللون).
 */
const COMPONENT_CHOICES: Record<string, { attribute_id: number; option_ids: number[] }> = {
  "دلة قهوة نحاس": { attribute_id: 2, option_ids: [5, 7] },
  "ترمس حافظ": { attribute_id: 2, option_ids: [5, 6, 7, 8] },
};

interface ExtrasState {
  tiers: Map<number, TierRow[]>;
  bundle: Map<number, BundleRow[]>;
  rules: Map<number, RuleRow[]>;
  fields: Map<number, FieldRow[]>;
  auctions: Map<number, AuctionRow>;
  bids: Map<number, BidRow[]>;
  serials: Map<number, SerialRow[]>;
  ids: { value: number };
}

const byName = (state: CatalogState, name: string) => state.products.find((p) => p.name === name);

function seed(store: string | null): ExtrasState {
  const state = catalog(store);
  const ids = { value: 100 };
  const id = () => ++ids.value;
  const s: ExtrasState = { tiers: new Map(), bundle: new Map(), rules: new Map(), fields: new Map(), auctions: new Map(), bids: new Map(), serials: new Map(), ids };
  for (const [name, rows] of Object.entries(TIER_PRICES)) {
    const p = byName(state, name);
    if (p) s.tiers.set(p.id, rows.map((r) => ({ id: id(), ...r })));
  }
  for (const [name, rows] of Object.entries(BUNDLES)) {
    const p = byName(state, name);
    if (!p) continue;
    s.bundle.set(
      p.id,
      rows.flatMap((r) => {
        const c = byName(state, r.name);
        return c ? [{ id: id(), component_id: c.id, quantity: r.quantity.toFixed(3), is_optional: r.is_optional }] : [];
      }),
    );
    // The pot and the thermos must match in colour; navy is not offered for this set.
    s.rules.set(p.id, [
      { id: id(), attribute_a_id: 2, operator: "equals", attribute_b_id: 2, value: null },
      { id: id(), attribute_a_id: 2, operator: "in", attribute_b_id: null, value: "أسود,أبيض,أحمر" },
    ]);
  }
  for (const [name, rows] of Object.entries(PERSONALIZATION)) {
    const p = byName(state, name);
    if (p) s.fields.set(p.id, rows.map((f, i) => ({ id: f.id, label: f.label, field_type: f.field_type, price_add: f.price_add, is_required: f.is_required, options_csv: f.options.join(","), sort_order: i })));
  }
  const rnd = seeded(seedOf(store) + 37);
  for (const [name, a] of Object.entries(AUCTIONS)) {
    const p = byName(state, name);
    if (!p) continue;
    s.auctions.set(p.id, {
      status: p.auction_status ?? "active",
      start_bid: a.start_bid,
      bid_step: a.bid_step,
      reserve: "1250.00",
      buy_now: a.buy_now,
      end_at: Math.max(Date.now(), FIXTURE_NOW) + a.hours_left * 3_600_000 + 14 * 60_000,
      anti_sniping_seconds: a.anti_sniping_seconds,
    });
    s.bids.set(
      p.id,
      a.seed_bids.map((amount, i) => ({ bidder_name: fullName(rnd), bidder_phone: `96777${String(1_000_000 + Math.floor(rnd() * 8_999_999))}`, amount, created_at: FIXTURE_NOW - (a.seed_bids.length - i) * 3_600_000 })),
    );
  }
  for (const p of state.products.filter((x) => x.is_serialized)) {
    const n = (p.serial_available ?? 0) + 2;
    s.serials.set(
      p.id,
      Array.from({ length: n }, (_, i) => ({ code: `SN-${p.sku.slice(-4)}-${String(2401 + i)}`, status: i === n - 1 ? "sold" : i === n - 2 ? "reserved" : "available" })),
    );
  }
  return s;
}

export function extras(store: string | null): ExtrasState {
  return storeState(store, "product-extras", () => seed(store));
}

// ── helpers ──────────────────────────────────────────────────────────────────────────
type Body = Record<string, unknown>;
const DEC = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v));
const money = (p: MockProduct, amount: number) => fmt(amount, p.currency as Currency);

function product(store: string | null, id: number) {
  const state = catalog(store);
  return { state, p: state.products.find((x) => x.id === id) };
}

function logChange(state: CatalogState, p: MockProduct, field: string, before: string | null, after: string | null, actor: string) {
  state.changes.unshift({ id: nextCatalogId(state, "change"), product_id: p.id, field, before, after, actor, at: new Date().toISOString() });
}

const notFound = { ok: false as const, status: 404, body: { detail: "المنتج غير موجود." } };

// ── M36 quantity prices (`ProductTierPrice`) ─────────────────────────────────────────
export function tierView(p: MockProduct, rows: TierRow[]) {
  return [...rows].sort((a, b) => a.min_quantity - b.min_quantity).map((t) => ({ id: t.id, min_quantity: t.min_quantity, price: t.price, display_price: money(p, Number(t.price)) }));
}

export function listTiers(store: string | null, id: number) {
  const { p } = product(store, id);
  return p ? { ok: true as const, data: tierView(p, extras(store).tiers.get(p.id) ?? []) } : notFound;
}

export function addTier(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof tierView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).tiers.get(p.id) ?? [];
  const min = Number(body.min_quantity);
  const price = str(body.price);
  const e: Record<string, string[]> = {};
  if (!Number.isInteger(min) || min < 1) e.min_quantity = ["أدخل عدداً صحيحاً موجباً."];
  else if (rows.some((r) => r.min_quantity === min)) e.min_quantity = ["يوجد سعر لهذه الكمية مسبقاً."];
  if (!DEC.test(price) || Number(price) <= 0) e.price = ["أدخل سعراً صحيحاً."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  rows.push({ id: ++extras(store).ids.value, min_quantity: min, price: Number(price).toFixed(2) });
  extras(store).tiers.set(p.id, rows);
  logChange(state, p, "tier_prices", null, `${min}+ → ${price}`, actor);
  return { ok: true, status: 201, data: tierView(p, rows) };
}

export function deleteTier(store: string | null, id: number, tierId: number, actor: string): MockResult<ReturnType<typeof tierView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).tiers.get(p.id) ?? [];
  const row = rows.find((r) => r.id === tierId);
  if (!row) return { ok: false, status: 404, body: { detail: "السعر غير موجود." } };
  extras(store).tiers.set(p.id, rows.filter((r) => r !== row));
  logChange(state, p, "tier_prices", `${row.min_quantity}+ → ${row.price}`, null, actor);
  return { ok: true, data: tierView(p, extras(store).tiers.get(p.id)!) };
}

// ── Bundle components & compatibility rules ──────────────────────────────────────────
function componentPrice(state: CatalogState, c: MockProduct): number {
  return Number(c.price);
}

export function bundleView(store: string | null, p: MockProduct) {
  const state = catalog(store);
  const rows = extras(store).bundle.get(p.id) ?? [];
  const components = rows.flatMap((r) => {
    const c = state.products.find((x) => x.id === r.component_id);
    return c ? [{ id: r.id, component_id: c.id, name: c.name, sku: c.sku, quantity: r.quantity, is_optional: r.is_optional, stock: c.stock, display_price: money(c, componentPrice(state, c)) }] : [];
  });
  const total = rows.reduce((sum, r) => {
    const c = state.products.find((x) => x.id === r.component_id);
    return r.is_optional || !c ? sum : sum + componentPrice(state, c) * Number(r.quantity);
  }, Number(p.bundle_build_fee ?? 0));
  return { results: components, display_build_fee: p.bundle_build_fee ? money(p, Number(p.bundle_build_fee)) : null, display_bundle_total: money(p, total) };
}

export function addComponent(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof bundleView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  if (!p.is_bundle) return { ok: false, status: 400, body: { detail: "فعّل «حزمة» على المنتج أولاً." } };
  const cid = Number(body.component_id);
  const qty = str(body.quantity || "1");
  const e: Record<string, string[]> = {};
  const c = state.products.find((x) => x.id === cid && !x.archived_at);
  if (cid === p.id) e.component_id = ["لا يمكن إضافة الحزمة إلى نفسها."];
  else if (!c) e.component_id = ["اختر منتجاً صالحاً."];
  else if (c.is_bundle) e.component_id = ["لا يمكن وضع حزمة داخل حزمة."];
  if (!QTY.test(qty) || Number(qty) <= 0) e.quantity = ["أدخل كمية أكبر من صفر (حتى 3 منازل عشرية)."];
  const rows = extras(store).bundle.get(p.id) ?? [];
  if (!e.component_id && rows.some((r) => r.component_id === cid)) e.component_id = ["هذا المنتج مكوّن في الحزمة مسبقاً."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  rows.push({ id: ++extras(store).ids.value, component_id: cid, quantity: Number(qty).toFixed(3), is_optional: body.is_optional === true });
  extras(store).bundle.set(p.id, rows);
  logChange(state, p, "bundle_components", null, c!.name, actor);
  return { ok: true, status: 201, data: bundleView(store, p) };
}

export function patchComponent(store: string | null, id: number, rowId: number, body: Body): MockResult<ReturnType<typeof bundleView>> {
  const { p } = product(store, id);
  if (!p) return notFound;
  const row = (extras(store).bundle.get(p.id) ?? []).find((r) => r.id === rowId);
  if (!row) return { ok: false, status: 404, body: { detail: "المكوّن غير موجود." } };
  if ("quantity" in body) {
    const qty = str(body.quantity);
    if (!QTY.test(qty) || Number(qty) <= 0) return { ok: false, status: 400, body: { quantity: ["أدخل كمية أكبر من صفر (حتى 3 منازل عشرية)."] } };
    row.quantity = Number(qty).toFixed(3);
  }
  if ("is_optional" in body) row.is_optional = body.is_optional === true;
  return { ok: true, data: bundleView(store, p) };
}

export function deleteComponent(store: string | null, id: number, rowId: number, actor: string): MockResult<ReturnType<typeof bundleView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).bundle.get(p.id) ?? [];
  const row = rows.find((r) => r.id === rowId);
  if (!row) return { ok: false, status: 404, body: { detail: "المكوّن غير موجود." } };
  extras(store).bundle.set(p.id, rows.filter((r) => r !== row));
  logChange(state, p, "bundle_components", state.products.find((x) => x.id === row.component_id)?.name ?? String(row.component_id), null, actor);
  return { ok: true, data: bundleView(store, p) };
}

export function rulesView(store: string | null, p: MockProduct) {
  const attrs = catalog(store).attributes;
  return (extras(store).rules.get(p.id) ?? []).map((r) => ({
    ...r,
    attribute_a_name: attrs.find((a) => a.id === r.attribute_a_id)?.name ?? null,
    attribute_b_name: r.attribute_b_id ? (attrs.find((a) => a.id === r.attribute_b_id)?.name ?? null) : null,
  }));
}

export function addRule(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof rulesView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const attrs = state.attributes;
  const a = Number(body.attribute_a_id);
  const b = body.attribute_b_id === null || body.attribute_b_id === undefined || body.attribute_b_id === "" ? null : Number(body.attribute_b_id);
  const op = str(body.operator) as CompatOperator;
  const value = str(body.value) || null;
  const e: Record<string, string[]> = {};
  if (!attrs.some((x) => x.id === a)) e.attribute_a_id = ["اختر خاصية."];
  if (!(COMPAT_OPERATORS as readonly string[]).includes(op)) e.operator = ["اختر نوع القاعدة."];
  if (b !== null && !attrs.some((x) => x.id === b)) e.attribute_b_id = ["اختر خاصية صالحة."];
  if (b === null && !value) e.value = ["حدّد خاصية ثانية أو قيمة."];
  if (b !== null && value) e.value = ["حدّد خاصية ثانية أو قيمة، لا الاثنين."];
  if (op === "in" && b !== null) e.attribute_b_id = ["قاعدة «ضمن القيم» تقارن بقائمة قيم."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const rows = extras(store).rules.get(p.id) ?? [];
  rows.push({ id: ++extras(store).ids.value, attribute_a_id: a, operator: op, attribute_b_id: b, value: value ? value.split(",").map((v) => v.trim()).filter(Boolean).join(",") : null });
  extras(store).rules.set(p.id, rows);
  logChange(state, p, "compatibility_rules", null, op, actor);
  return { ok: true, status: 201, data: rulesView(store, p) };
}

export function deleteRule(store: string | null, id: number, ruleId: number): MockResult<ReturnType<typeof rulesView>> {
  const { p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).rules.get(p.id) ?? [];
  if (!rows.some((r) => r.id === ruleId)) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  extras(store).rules.set(p.id, rows.filter((r) => r.id !== ruleId));
  return { ok: true, data: rulesView(store, p) };
}

/** The storefront's view of the bundle: components with prices, picker choices, rules, total. */
export function pdpBundle(store: string | null, p: MockProduct, money2: (n: number) => string) {
  const state = catalog(store);
  const rows = extras(store).bundle.get(p.id) ?? [];
  if (!p.is_bundle || rows.length === 0) return null;
  const options = new Map(state.attributes.flatMap((a) => a.options.map((o) => [o.id, { ...o, attribute_name: a.name }] as const)));
  const components = rows.flatMap((r) => {
    const c = state.products.find((x) => x.id === r.component_id);
    if (!c) return [];
    const choice = COMPONENT_CHOICES[c.name];
    return [
      {
        product_id: c.id,
        name: c.name,
        image: c.images[0]?.url ?? null,
        quantity: Number(r.quantity),
        is_optional: r.is_optional,
        in_stock: Number(c.stock) > 0,
        display_price: money2(Number(c.price)),
        choice: choice
          ? {
              attribute_id: choice.attribute_id,
              attribute_name: state.attributes.find((a) => a.id === choice.attribute_id)?.name ?? "",
              options: choice.option_ids.flatMap((id) => {
                const o = options.get(id);
                return o ? [{ id: o.id, value: o.value }] : [];
              }),
            }
          : null,
      },
    ];
  });
  const missing = components.find((c) => !c.is_optional && !c.in_stock);
  const total = rows.reduce((sum, r) => {
    const c = state.products.find((x) => x.id === r.component_id);
    return r.is_optional || !c ? sum : sum + Number(c.price) * Number(r.quantity);
  }, Number(p.bundle_build_fee ?? 0));
  return {
    display_build_fee: p.bundle_build_fee ? money2(Number(p.bundle_build_fee)) : null,
    display_total: money2(total),
    unavailable_component: missing?.name ?? null,
    components,
    rules: rulesView(store, p).map((r) => ({ id: r.id, attribute_a_id: r.attribute_a_id, attribute_a_name: r.attribute_a_name ?? "", operator: r.operator, attribute_b_id: r.attribute_b_id, value: r.value })),
  };
}

// ── Personalization fields ───────────────────────────────────────────────────────────
export function fieldsView(p: MockProduct, rows: FieldRow[]) {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order).map((f) => ({ ...f, display_price_add: f.price_add ? money(p, Number(f.price_add)) : null }));
}

function validateField(body: Body, partial: boolean): { e: Record<string, string[]>; patch: Partial<FieldRow> } {
  const e: Record<string, string[]> = {};
  const patch: Partial<FieldRow> = {};
  if (!partial || "label" in body) {
    const label = str(body.label);
    if (!label) e.label = ["أدخل عنوان الحقل."];
    else patch.label = label;
  }
  if (!partial || "field_type" in body) {
    const t = str(body.field_type);
    if (!(PERSONALIZATION_TYPES as readonly string[]).includes(t)) e.field_type = ["اختر نوع الحقل."];
    else patch.field_type = t as PersonalizationType;
  }
  if ("price_add" in body) {
    const v = str(body.price_add);
    if (v && (!DEC.test(v) || Number(v) < 0)) e.price_add = ["أدخل مبلغاً صحيحاً."];
    else patch.price_add = v && Number(v) > 0 ? Number(v).toFixed(2) : null;
  }
  if ("is_required" in body) patch.is_required = body.is_required === true;
  if ("options_csv" in body) patch.options_csv = str(body.options_csv).split(",").map((x) => x.trim()).filter(Boolean).join(",");
  const type = patch.field_type;
  if (type && (type === "select" || type === "multi_select") && !(patch.options_csv ?? "")) e.options_csv = ["أدخل خيارات القائمة مفصولة بفاصلة."];
  return { e, patch };
}

export function listFields(store: string | null, id: number) {
  const { p } = product(store, id);
  return p ? { ok: true as const, data: fieldsView(p, extras(store).fields.get(p.id) ?? []) } : notFound;
}

export function addField(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof fieldsView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const { e, patch } = validateField(body, false);
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const rows = extras(store).fields.get(p.id) ?? [];
  rows.push({ id: ++extras(store).ids.value, label: patch.label!, field_type: patch.field_type!, price_add: patch.price_add ?? null, is_required: patch.is_required ?? false, options_csv: patch.options_csv ?? "", sort_order: rows.length });
  extras(store).fields.set(p.id, rows);
  logChange(state, p, "personalization_fields", null, patch.label!, actor);
  return { ok: true, status: 201, data: fieldsView(p, rows) };
}

export function patchField(store: string | null, id: number, fieldId: number, body: Body): MockResult<ReturnType<typeof fieldsView>> {
  const { p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).fields.get(p.id) ?? [];
  const row = rows.find((f) => f.id === fieldId);
  if (!row) return { ok: false, status: 404, body: { detail: "الحقل غير موجود." } };
  const { e, patch } = validateField({ field_type: row.field_type, options_csv: row.options_csv, ...body }, true);
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  Object.assign(row, patch);
  return { ok: true, data: fieldsView(p, rows) };
}

export function deleteField(store: string | null, id: number, fieldId: number, actor: string): MockResult<ReturnType<typeof fieldsView>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).fields.get(p.id) ?? [];
  const row = rows.find((f) => f.id === fieldId);
  if (!row) return { ok: false, status: 404, body: { detail: "الحقل غير موجود." } };
  const next = rows.filter((f) => f !== row).map((f, i) => ({ ...f, sort_order: i }));
  extras(store).fields.set(p.id, next);
  logChange(state, p, "personalization_fields", row.label, null, actor);
  return { ok: true, data: fieldsView(p, next) };
}

export function reorderFields(store: string | null, id: number, body: Body): MockResult<ReturnType<typeof fieldsView>> {
  const { p } = product(store, id);
  if (!p) return notFound;
  const rows = extras(store).fields.get(p.id) ?? [];
  const order = Array.isArray(body.ordered_ids) ? body.ordered_ids.map(Number) : [];
  if (order.length !== rows.length || !rows.every((r) => order.includes(r.id))) return { ok: false, status: 400, body: { ordered_ids: ["أرسل كل الحقول بترتيبها الجديد."] } };
  for (const r of rows) r.sort_order = order.indexOf(r.id);
  return { ok: true, data: fieldsView(p, rows) };
}

export function pdpFields(store: string | null, p: MockProduct, money2: (n: number) => string) {
  if (!p.is_personalizable) return [];
  return [...(extras(store).fields.get(p.id) ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({ id: f.id, label: f.label, field_type: f.field_type, is_required: f.is_required, options: f.options_csv ? f.options_csv.split(",") : [], display_price_add: f.price_add ? money2(Number(f.price_add)) : null }));
}

// ── Auction ──────────────────────────────────────────────────────────────────────────
export function auctionRow(store: string | null, p: MockProduct): AuctionRow | null {
  if (!p.is_auction) return null;
  const s = extras(store);
  let row = s.auctions.get(p.id);
  if (!row) {
    row = { status: "draft", start_bid: p.price, bid_step: "10.00", reserve: null, buy_now: null, end_at: null, anti_sniping_seconds: 120 };
    s.auctions.set(p.id, row);
  }
  // `active` past `end_at` is `ended` (the server would close it on a schedule).
  if (row.status === "active" && row.end_at !== null && row.end_at <= Date.now()) row.status = "ended";
  return row;
}

export function bidsOf(store: string | null, p: MockProduct): BidRow[] {
  const s = extras(store);
  if (!s.bids.has(p.id)) s.bids.set(p.id, []);
  return s.bids.get(p.id)!;
}

/** Merchant view — the ONLY place `reserve` appears. */
export function merchantAuction(store: string | null, id: number) {
  const { p } = product(store, id);
  if (!p) return notFound;
  const row = auctionRow(store, p);
  if (!row) return { ok: false as const, status: 400, body: { detail: "فعّل «مزاد» على المنتج أولاً." } };
  const bids = bidsOf(store, p);
  const highest = bids.length ? Number(bids[bids.length - 1]!.amount) : null;
  return {
    ok: true as const,
    data: {
      ...row,
      end_at: row.end_at ? new Date(row.end_at).toISOString() : null,
      bids_count: bids.length,
      display_highest_bid: highest !== null ? money(p, highest) : null,
      reserve_met: row.reserve && highest !== null ? highest >= Number(row.reserve) : null,
    },
  };
}

export function putAuction(store: string | null, id: number, body: Body, actor: string): MockResult<Record<string, unknown>> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  const row = auctionRow(store, p);
  if (!row) return { ok: false, status: 400, body: { detail: "فعّل «مزاد» على المنتج أولاً." } };
  const e: Record<string, string[]> = {};
  const status = str(body.status) as AuctionStatus;
  if (!(AUCTION_STATUSES as readonly string[]).includes(status)) e.status = ["اختر حالة المزاد."];
  const dec = (k: string, required: boolean) => {
    const v = str(body[k]);
    if (!v) {
      if (required) e[k] = ["هذا الحقل مطلوب."];
      return null;
    }
    if (!DEC.test(v) || Number(v) <= 0) {
      e[k] = ["أدخل مبلغاً صحيحاً."];
      return null;
    }
    return Number(v).toFixed(2);
  };
  const start = dec("start_bid", true);
  const step = dec("bid_step", true);
  const reserve = dec("reserve", false);
  const buyNow = dec("buy_now", false);
  const endRaw = str(body.end_at);
  const end = endRaw ? Date.parse(endRaw) : null;
  if (endRaw && !Number.isFinite(end)) e.end_at = ["تاريخ غير صالح."];
  else if (status === "active" && end !== null && end <= Date.now()) e.end_at = ["يجب أن ينتهي المزاد في المستقبل."];
  const anti = Number(body.anti_sniping_seconds ?? 0);
  if (!Number.isInteger(anti) || anti < 0 || anti > 3600) e.anti_sniping_seconds = ["أدخل ثوانيَ بين 0 و3600."];
  if (start && buyNow && Number(buyNow) <= Number(start)) e.buy_now = ["سعر الشراء الفوري يجب أن يتجاوز سعر البداية."];
  if (start && reserve && Number(reserve) < Number(start)) e.reserve = ["السعر الاحتياطي لا يقل عن سعر البداية."];
  if (bidsOf(store, p).length && start && start !== row.start_bid) e.start_bid = ["لا يتغيّر سعر البداية بعد أول مزايدة."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const before = row.status;
  Object.assign(row, { status, start_bid: start!, bid_step: step!, reserve, buy_now: buyNow, end_at: end, anti_sniping_seconds: anti });
  p.auction_status = status;
  p.stock = "1.000";
  if (before !== status) logChange(state, p, "auction_status", before, status, actor);
  const view = merchantAuction(store, id);
  return view.ok ? { ok: true, data: view.data } : view;
}

export function merchantBids(store: string | null, id: number) {
  const { p } = product(store, id);
  if (!p) return notFound;
  return {
    ok: true as const,
    data: [...bidsOf(store, p)].reverse().map((b) => ({ bidder_name: b.bidder_name, bidder_phone: b.bidder_phone, display_amount: money(p, Number(b.amount)), created_at: new Date(b.created_at).toISOString() })),
  };
}

// ── Serials (`InventoryItem`) ────────────────────────────────────────────────────────
export function serialsView(rows: SerialRow[]) {
  const count = (s: SerialRow["status"]) => rows.filter((r) => r.status === s).length;
  return { counts: { available: count("available"), reserved: count("reserved"), sold: count("sold") }, results: rows };
}

export function listSerials(store: string | null, id: number) {
  const { p } = product(store, id);
  if (!p) return notFound;
  return { ok: true as const, data: { ...serialsView(extras(store).serials.get(p.id) ?? []), stock: p.stock } };
}

export function addSerials(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof serialsView> & { stock: string }> {
  const { state, p } = product(store, id);
  if (!p) return notFound;
  if (!p.is_serialized) return { ok: false, status: 400, body: { detail: "فعّل «أرقام تسلسلية» على المنتج أولاً." } };
  const codes = Array.isArray(body.codes) ? body.codes.map((c) => str(c)).filter(Boolean) : [];
  if (!codes.length) return { ok: false, status: 400, body: { codes: ["ألصق كوداً واحداً على الأقل."] } };
  const rows = extras(store).serials.get(p.id) ?? [];
  const seen = new Set<string>();
  const dup = codes.filter((c) => (seen.has(c) ? true : (seen.add(c), false)));
  const existing = codes.filter((c) => rows.some((r) => r.code === c));
  if (dup.length || existing.length) return { ok: false, status: 400, body: { codes: [`أكواد مكررة: ${[...new Set([...dup, ...existing])].join("، ")}`], duplicates: [...new Set([...dup, ...existing])] } };
  for (const c of codes) rows.push({ code: c, status: "available" });
  extras(store).serials.set(p.id, rows);
  p.serial_available = rows.filter((r) => r.status === "available").length;
  logChange(state, p, "serial_codes", null, `+${codes.length}`, actor);
  return { ok: true, status: 201, data: { ...serialsView(rows), stock: p.stock } };
}

// ── Formula preview (`calculate_formula_unit_price`) ─────────────────────────────────
export function formulaPreview(body: Body, currency: Currency) {
  const u = str(body.formula_unit_price);
  const c = str(body.formula_coefficient);
  const f = str(body.formula_fixed_extra) || "0";
  const e: Record<string, string[]> = {};
  if (!/^\d+(\.\d{1,4})?$/.test(u)) e.formula_unit_price = ["أدخل سعر الوحدة (حتى 4 منازل)."];
  if (!/^\d+(\.\d{1,4})?$/.test(c)) e.formula_coefficient = ["أدخل المعامل (حتى 4 منازل)."];
  if (!DEC.test(f)) e.formula_fixed_extra = ["أدخل مبلغاً صحيحاً."];
  if (Object.keys(e).length) return { ok: false as const, status: 400, body: e };
  const price = Number(u) * Number(c) + Number(f);
  return { ok: true as const, data: { price: price.toFixed(2), display_price: fmt(price, currency), expression: `${u} × ${c} + ${f}` } };
}
