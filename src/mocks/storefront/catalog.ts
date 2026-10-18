import type { Currency } from "@/lib/schemas/money";
import { includesNormalized } from "@/lib/i18n/normalize";
import { UNIT_LABELS } from "@/features/products/schemas/enums";
import type {
  CategoryNode,
  Facets,
  Offer,
  ProductCard,
  ProductDetail,
  ProductPage,
  VariantAttribute,
} from "@/features/storefront/schemas/catalog";
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from "@/features/storefront/schemas/catalog";
import { seeded, int, pick, fullName } from "@/mocks/_fixtures";
import { effectivePrice, productStatus } from "@/mocks/catalog/products";
import type { MockProduct } from "@/mocks/catalog/seed";
import { catalog, type CatalogState } from "@/mocks/catalog/state";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";
import {
  AUCTIONS,
  BUNDLES,
  LEGACY_OPTIONS,
  OFFERS,
  PERSONALIZATION,
  REVIEW_TEXTS,
  SERVICE_HOURS,
  TIER_PRICES,
} from "@/mocks/storefront/extensions";
import { convert, fmt, storeRates, type Rates } from "@/mocks/storefront/money";

/**
 * The mock SERVER behind the storefront catalogue (ready-api-v1 #2–#4 and the M09/M10
 * `[NEEDS BACKEND]` rows). It projects the SAME per-store catalogue the M04/M05 dashboard
 * edits (`src/mocks/catalog/state.ts`), so a product a merchant publishes appears on the
 * store, a draft or scheduled one 404s (M10 §8), and checkout stock is shared.
 */
const LOW_STOCK_DEFAULT = 3;

export function nowMs(): number {
  return Math.max(Date.now(), FIXTURE_NOW);
}

export function isVisible(p: MockProduct): boolean {
  return productStatus(p) === "published";
}

export function visibleProducts(store: string | null): MockProduct[] {
  return catalog(store).products.filter(isVisible);
}

export function findVisible(store: string | null, id: number): MockProduct | undefined {
  const p = catalog(store).products.find((x) => x.id === id);
  return p && isVisible(p) ? p : undefined;
}

export function variantsOf(state: CatalogState, productId: number) {
  return state.variants.filter((v) => v.product_id === productId);
}

/** Stock as the storefront sees it: variant sum when the product has variants. */
export function stockOf(state: CatalogState, p: MockProduct): number {
  const vs = variantsOf(state, p.id);
  if (vs.length === 0) return Number(p.stock);
  return vs.reduce((acc, v) => acc + Number(v.stock), 0);
}

function saleActive(p: MockProduct): boolean {
  if (!p.old_price || Number(p.old_price) <= Number(p.price)) return false;
  const t = nowMs();
  if (p.sale_start_at && new Date(p.sale_start_at).getTime() > t) return false;
  if (p.sale_end_at && new Date(p.sale_end_at).getTime() < t) return false;
  return true;
}

/** Unit price (product currency) for a quantity — the tier table wins (`get_tier_price`). */
export function unitPrice(p: MockProduct, quantity = 1, variantExtra = "0"): number {
  const tiers = TIER_PRICES[p.name];
  if (tiers) {
    const tier = [...tiers].reverse().find((t) => quantity >= t.min_quantity);
    if (tier) return Number(tier.price) + Number(variantExtra);
  }
  return Number(effectivePrice(p)) + Number(variantExtra);
}

function categoryName(state: CatalogState, id: number | null): string | null {
  if (id === null) return null;
  return state.categories.find((c) => c.id === id)?.name ?? null;
}

export function cardOf(store: string | null, p: MockProduct, currency: Currency, rates?: Rates): ProductCard {
  const state = catalog(store);
  const r = rates ?? storeRates(store);
  const badges = p.badge_ids
    .map((id) => state.badges.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map((b) => ({ name: b.name, color: b.color }));
  return {
    id: p.id,
    name: p.name,
    image: p.images[0]?.url ?? null,
    // The M04 fixture's `cdn.example.invalid` link is deliberately dead (it exercises the
    // editor's «رابط» item); the storefront mock does not hand it to buyers.
    image_url: p.image_url && !/\.invalid(\/|$)/.test(new URL(p.image_url, "https://x").hostname + "/") ? p.image_url : null,
    category: categoryName(state, p.category_id),
    display_price: fmt(convert(unitPrice(p), p.currency, currency, r), currency),
    display_old_price: saleActive(p) ? fmt(convert(Number(p.old_price), p.currency, currency, r), currency) : null,
    stock: stockOf(state, p),
    is_featured: p.is_featured,
    is_free_shipping: p.is_free_shipping,
    payment_policy: p.payment_policy,
    badges,
    slug: p.slug,
  };
}

// ── #2 categories ─────────────────────────────────────────────────────────────────────
export function categoryTree(store: string | null): CategoryNode[] {
  const state = catalog(store);
  const build = (parent: number | null): CategoryNode[] =>
    state.categories
      .filter((c) => c.parent_id === parent)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ id: c.id, name: c.name, image: c.image, subcategories: build(c.id) }));
  return build(null);
}

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

function intParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function filtered(store: string | null, params: URLSearchParams, omit?: "brand" | "tag" | "collection"): MockProduct[] {
  const state = catalog(store);
  let rows = visibleProducts(store);
  const category = intParam(params, "category");
  if (category !== null) {
    const ids = descendants(state, category);
    rows = rows.filter((p) => p.category_id !== null && ids.has(p.category_id));
  }
  const brand = intParam(params, "brand");
  if (brand !== null && omit !== "brand") rows = rows.filter((p) => p.brand_id === brand);
  const tag = intParam(params, "tag");
  if (tag !== null && omit !== "tag") rows = rows.filter((p) => p.tag_ids.includes(tag));
  const collection = intParam(params, "collection");
  if (collection !== null && omit !== "collection") {
    const c = state.collections.find((x) => x.id === collection);
    rows = c ? rows.filter((p) => c.product_ids.includes(p.id)) : [];
  }
  const search = (params.get("search") ?? "").trim();
  if (search) rows = rows.filter((p) => includesNormalized(p.name, search) || includesNormalized(p.name_en, search));
  if (params.get("is_featured") === "true") rows = rows.filter((p) => p.is_featured);
  return rows;
}

export type ListResult = { ok: true; data: ProductPage } | { ok: false; status: 404; body: { detail: string } };

/** #3 — DRF `PageNumberPagination` (20 default, 50 max on the storefront). */
export function listPublicProducts(store: string | null, params: URLSearchParams, currency: Currency): ListResult {
  const rows = filtered(store, params);
  const ordering = params.get("ordering") ?? "-created_at";
  const sorted = [...rows].sort((a, b) => {
    if (ordering === "price") return unitPrice(a) - unitPrice(b);
    if (ordering === "-price") return unitPrice(b) - unitPrice(a);
    return b.created_at.localeCompare(a.created_at);
  });
  const size = Math.min(PAGE_SIZE_MAX, Math.max(1, intParam(params, "page_size") ?? PAGE_SIZE_DEFAULT));
  const page = Math.max(1, intParam(params, "page") ?? 1);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  if (page > pages) return { ok: false, status: 404, body: { detail: "صفحة غير صالحة." } };
  const rates = storeRates(store);
  const results = sorted.slice((page - 1) * size, page * size).map((p) => cardOf(store, p, currency, rates));
  const link = (n: number) => {
    const sp = new URLSearchParams(params);
    sp.set("page", String(n));
    return `?${sp.toString()}`;
  };
  return {
    ok: true,
    data: {
      count: sorted.length,
      next: page < pages ? link(page + 1) : null,
      previous: page > 1 ? link(page - 1) : null,
      results,
    },
  };
}

// ── #4 detail ─────────────────────────────────────────────────────────────────────────
function attributesOf(state: CatalogState, p: MockProduct): VariantAttribute[] {
  const vs = variantsOf(state, p.id);
  if (vs.length === 0) return [];
  const used = new Set(vs.flatMap((v) => v.option_ids));
  return state.attributes
    .filter((a) => a.options.some((o) => used.has(o.id)))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => ({
      id: a.id,
      name: a.name,
      field_type: a.field_type,
      is_required: true,
      options: a.options.filter((o) => used.has(o.id)).map((o) => ({ id: o.id, value: o.value, image: o.image, color: o.color })),
    }));
}

function isoCurrency(c: Currency): string {
  return c === "YER_OLD" || c === "YER_NEW" ? "YER" : c;
}

export function productDetail(store: string | null, id: number, currency: Currency): ProductDetail | null {
  const state = catalog(store);
  const p = findVisible(store, id);
  if (!p) return null;
  const rates = storeRates(store);
  const card = cardOf(store, p, currency, rates);
  const money = (amount: string | number) => fmt(convert(Number(amount), p.currency, currency, rates), currency);
  const vs = variantsOf(state, p.id);
  const category = p.category_id === null ? undefined : state.categories.find((c) => c.id === p.category_id);
  const parent = category?.parent_id ? state.categories.find((c) => c.id === category.parent_id) : undefined;
  const brand = p.brand_id === null ? undefined : state.brands.find((b) => b.id === p.brand_id);
  const legacy = LEGACY_OPTIONS[p.name];
  const tiers = TIER_PRICES[p.name];
  const bundle = p.is_bundle ? BUNDLES[p.name] : undefined;
  const fields = p.is_personalizable ? PERSONALIZATION[p.name] : undefined;
  const summary = reviewsSummary(store, p.id);
  const stock = card.stock;

  const peers = visibleProducts(store).filter((x) => x.id !== p.id);
  const sameCategory = peers.filter((x) => x.category_id === p.category_id);
  const collectionPeers = new Set(
    state.collections.filter((c) => c.product_ids.includes(p.id)).flatMap((c) => c.product_ids),
  );
  const cards = (rows: MockProduct[]) => rows.map((x) => cardOf(store, x, currency, rates));
  const related = {
    related: cards(sameCategory.slice(0, 8)),
    upsell: cards(sameCategory.filter((x) => unitPrice(x) > unitPrice(p)).slice(0, 4)),
    cross_sell: cards(peers.filter((x) => collectionPeers.has(x.id) && x.category_id !== p.category_id).slice(0, 4)),
  };

  return {
    ...card,
    description: p.description,
    sizes_list: legacy?.sizes ?? [],
    colors_list: legacy?.colors ?? [],
    deposit_required: p.deposit_required,
    display_deposit: p.payment_policy === "deposit" && p.deposit_required ? money(p.deposit_required) : null,
    name_en: p.name_en || null,
    description_en: p.description_en || null,
    images: p.images.map((img) => ({ url: img.url, alt: p.name, sort_order: img.sort_order })),
    video_url: p.video_url || null,
    unit: p.unit,
    min_quantity: p.min_quantity,
    max_quantity: p.max_quantity,
    allow_variable_quantity: p.allow_variable_quantity,
    low_stock_threshold: p.low_stock_threshold ?? LOW_STOCK_DEFAULT,
    allow_backorder: p.allow_backorder,
    delivery_duration: p.delivery_duration || null,
    product_template: p.product_template,
    product_type: p.product_type,
    variant_display_style: p.variant_display_style,
    attributes: attributesOf(state, p),
    variants: vs.map((v) => ({
      id: v.id,
      option_ids: v.option_ids,
      display_effective_price: fmt(convert(unitPrice(p, 1, v.extra_price), p.currency, currency, rates), currency),
      stock: Number(v.stock),
      sku: v.sku,
      image: v.image,
    })),
    tier_prices: tiers?.map((t) => ({ min_quantity: t.min_quantity, display_price: money(t.price) })) ?? [],
    pricing_type: p.pricing_type,
    formula:
      p.pricing_type === "formula" && p.formula_unit_price && p.formula_coefficient
        ? {
            unit: UNIT_LABELS[p.unit],
            display_unit_price: money(p.formula_unit_price),
            coefficient: Number(p.formula_coefficient).toString(),
            display_fixed_extra: p.formula_fixed_extra && Number(p.formula_fixed_extra) > 0 ? money(p.formula_fixed_extra) : null,
          }
        : null,
    is_bundle: p.is_bundle,
    bundle: bundle
      ? {
          display_build_fee: p.bundle_build_fee ? money(p.bundle_build_fee) : null,
          components: bundle.flatMap((c) => {
            const comp = state.products.find((x) => x.name === c.name);
            return comp
              ? [{ product_id: comp.id, name: comp.name, image: comp.images[0]?.url ?? null, quantity: c.quantity, is_optional: c.is_optional }]
              : [];
          }),
        }
      : null,
    is_personalizable: p.is_personalizable,
    personalization_fields:
      fields?.map((f) => ({ ...f, display_price_add: f.price_add ? money(f.price_add) : null })) ?? [],
    is_auction: p.is_auction,
    is_bookable: p.is_bookable,
    booking_duration_minutes: p.booking_duration_minutes,
    category_path: [parent, category].filter((c): c is NonNullable<typeof c> => Boolean(c)).map((c) => ({ id: c.id, name: c.name })),
    brand: brand ? { id: brand.id, name: brand.name } : null,
    related,
    reviews_summary: summary.count > 0 ? summary : null,
    meta_title: p.meta_title || null,
    meta_description: p.meta_description || null,
    structured: {
      price: convert(unitPrice(p), p.currency, currency, rates).toFixed(2),
      currency: isoCurrency(currency),
      sku: p.sku,
      brand: brand?.name ?? null,
      availability: stock > 0 ? "InStock" : p.allow_backorder ? "PreOrder" : "OutOfStock",
    },
  };
}

// ── Facets & offers ───────────────────────────────────────────────────────────────────
export function facets(store: string | null, params: URLSearchParams): Facets {
  const state = catalog(store);
  const count = (rows: MockProduct[], test: (p: MockProduct) => boolean) => rows.filter(test).length;
  const forBrands = filtered(store, params, "brand");
  const forTags = filtered(store, params, "tag");
  const forCollections = filtered(store, params, "collection");
  return {
    brands: state.brands
      .map((b) => ({ id: b.id, name: b.name, slug: b.slug, count: count(forBrands, (p) => p.brand_id === b.id) }))
      .filter((f) => f.count > 0),
    tags: state.tags
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug, count: count(forTags, (p) => p.tag_ids.includes(t.id)) }))
      .filter((f) => f.count > 0),
    collections: state.collections
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: count(forCollections, (p) => c.product_ids.includes(p.id)) }))
      .filter((f) => f.count > 0),
  };
}

export function offers(store: string | null): Offer[] {
  const rows = store ? (OFFERS[store] ?? []) : [];
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    offer_type: o.offer_type,
    description: o.description,
    image: null,
    cta_text: o.cta_text,
    link: o.link,
    valid_until: new Date(FIXTURE_NOW + o.days_left * 86_400_000).toISOString(),
  }));
}

// ── Reviews (`ProductReview`, approved only) ──────────────────────────────────────────
interface MockReview {
  id: number;
  product_id: number;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
  admin_reply: string | null;
  approved: boolean;
}

function reviewState(store: string | null): MockReview[] {
  return storeState(store, "storefront:reviews", () => {
    const rows: MockReview[] = [];
    let id = 1;
    for (const p of catalog(store).products) {
      const rnd = seeded(p.id * 7 + 3);
      if (p.id % 3 === 2) continue; // a third of the products have no review yet («كن أول من يقيّم»)
      const n = int(rnd, 2, 9);
      for (let i = 0; i < n; i++) {
        const rating = Math.min(5, Math.max(1, Math.round(5 - rnd() * rnd() * 4)));
        rows.push({
          id: id++,
          product_id: p.id,
          rating,
          comment: pick(rnd, REVIEW_TEXTS),
          customer_name: fullName(rnd).split(" ")[0]!,
          created_at: new Date(FIXTURE_NOW - int(rnd, 1, 90) * 86_400_000).toISOString(),
          admin_reply: rating <= 3 && i % 2 === 0 ? "نعتذر عن ذلك، تواصلنا معك عبر واتساب لحلّ الملاحظة." : null,
          approved: true,
        });
      }
    }
    return rows;
  });
}

export function reviewsSummary(store: string | null, productId: number) {
  const rows = reviewState(store).filter((r) => r.product_id === productId && r.approved);
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of rows) distribution[String(r.rating)] = (distribution[String(r.rating)] ?? 0) + 1;
  const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;
  return { average_rating: Math.round(avg * 10) / 10, count: rows.length, rating_distribution: distribution };
}

export function listReviews(store: string | null, productId: number, page: number) {
  const rows = reviewState(store)
    .filter((r) => r.product_id === productId && r.approved)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const size = 5;
  const slice = rows.slice((page - 1) * size, page * size);
  return {
    ...reviewsSummary(store, productId),
    next: page * size < rows.length ? `?page=${page + 1}` : null,
    results: slice.map(({ id, rating, comment, customer_name, created_at, admin_reply }) => ({
      id,
      rating,
      comment,
      customer_name,
      created_at,
      admin_reply,
    })),
  };
}

/** A submitted review waits for moderation (US-10.6.2) — stored, never listed until approved. */
export function addReview(store: string | null, productId: number, rating: number, comment: string, name: string) {
  const rows = reviewState(store);
  rows.push({
    id: rows.length + 1,
    product_id: productId,
    rating,
    comment,
    customer_name: name,
    created_at: new Date(nowMs()).toISOString(),
    admin_reply: null,
    approved: false,
  });
}

// ── Auction (`Auction`, `AuctionBid`) ────────────────────────────────────────────────
interface AuctionState {
  bids: string[];
  end_at: number;
}

function auctionState(store: string | null, p: MockProduct): AuctionState | null {
  const spec = AUCTIONS[p.name];
  if (!p.is_auction || !spec) return null;
  return storeState(store, `storefront:auction:${p.id}`, () => ({
    bids: [...spec.seed_bids],
    end_at: Date.now() + spec.hours_left * 3_600_000 + 14 * 60_000,
  }));
}

export function auctionView(store: string | null, p: MockProduct, currency: Currency) {
  const spec = AUCTIONS[p.name];
  const st = auctionState(store, p);
  if (!spec || !st) return null;
  const rates = storeRates(store);
  const current = st.bids.length ? Number(st.bids[st.bids.length - 1]) : Number(spec.start_bid);
  const next = st.bids.length ? current + Number(spec.bid_step) : Number(spec.start_bid);
  const status = p.auction_status === "draft" ? "draft" : st.end_at <= Date.now() ? "ended" : (p.auction_status ?? "active");
  const money = (n: number) => fmt(convert(n, p.currency, currency, rates), currency);
  return {
    status,
    display_current_bid: money(current),
    display_bid_step: money(Number(spec.bid_step)),
    display_buy_now: spec.buy_now ? money(Number(spec.buy_now)) : null,
    next_bid_amount: convert(next, p.currency, currency, rates).toFixed(2),
    display_next_bid: money(next),
    end_at: new Date(st.end_at).toISOString(),
    anti_sniping_seconds: spec.anti_sniping_seconds,
    bids_count: st.bids.length,
  } as const;
}

export type BidResult =
  | { ok: true; data: NonNullable<ReturnType<typeof auctionView>> }
  | { ok: false; status: number; body: Record<string, unknown> };

export function placeBid(store: string | null, p: MockProduct, amount: string, currency: Currency): BidResult {
  const spec = AUCTIONS[p.name];
  const st = auctionState(store, p);
  if (!spec || !st) return { ok: false, status: 404, body: { detail: "لا يوجد مزاد على هذا المنتج." } };
  if (st.end_at <= Date.now()) return { ok: false, status: 409, body: { detail: "انتهى المزاد." } };
  const rates = storeRates(store);
  const inProductCurrency = convert(Number(amount), currency, p.currency, rates);
  const current = st.bids.length ? Number(st.bids[st.bids.length - 1]) : 0;
  const min = st.bids.length ? current + Number(spec.bid_step) : Number(spec.start_bid);
  if (!(inProductCurrency + 0.005 >= min)) {
    const view = auctionView(store, p, currency)!;
    return {
      ok: false,
      status: 409,
      body: { detail: `سبقتك مزايدة أخرى؛ أقل مبلغ مقبول الآن ${view.display_next_bid}.`, auction: view },
    };
  }
  st.bids.push(inProductCurrency.toFixed(2));
  // Anti-sniping: a bid in the last window extends the end (US-10.4.2).
  if (st.end_at - Date.now() < spec.anti_sniping_seconds * 1000) st.end_at = Date.now() + spec.anti_sniping_seconds * 1000;
  return { ok: true, data: auctionView(store, p, currency)! };
}

// ── Booking slots (`ServiceAvailability`, `BookingSlot`) ─────────────────────────────
const STORE_OFFSET_HOURS = 3; // Asia/Aden — the fixture timezone (M34 DEFAULT_TIMEZONE)

function isoLocal(date: string, hour: number, minute = 0): string {
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+0${STORE_OFFSET_HOURS}:00`;
}

/** Django weekday (0 = Monday) of a `YYYY-MM-DD`. */
function djangoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function availableSlots(store: string | null, p: MockProduct, date: string) {
  const hours = SERVICE_HOURS[p.name];
  if (!p.is_bookable || !hours || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const duration = p.booking_duration_minutes ?? 60;
  const open = (d: string) => hours.weekdays.includes(djangoWeekday(d));
  const slots: Array<{ start_datetime: string; end_datetime: string; status: "available" | "held" | "booked" }> = [];
  if (open(date)) {
    for (let m = hours.from * 60; m + duration <= hours.to * 60; m += duration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const end = m + duration;
      const seed = Number(date.replaceAll("-", "")) + m;
      const status = seed % 5 === 0 ? "booked" : seed % 7 === 0 ? "held" : "available";
      slots.push({ start_datetime: isoLocal(date, h, min), end_datetime: isoLocal(date, Math.floor(end / 60), end % 60), status });
    }
  }
  let next: string | null = null;
  if (!slots.some((s) => s.status === "available")) {
    for (let i = 1; i <= 14; i++) {
      const d = addDays(date, i);
      if (open(d)) {
        next = d;
        break;
      }
    }
  }
  return { date, slots, next_available_date: next };
}

/** The formula quote (`GET …/quote/?value=`) — price for `value` units, server-side. */
export function formulaQuote(store: string | null, p: MockProduct, value: number, currency: Currency) {
  if (p.pricing_type !== "formula" || !p.formula_unit_price || !p.formula_coefficient) return null;
  const perUnit = Number(p.formula_unit_price) * Number(p.formula_coefficient);
  const total = perUnit * value + Number(p.formula_fixed_extra ?? "0");
  return { display_price: fmt(convert(total, p.currency, currency, storeRates(store)), currency) };
}
