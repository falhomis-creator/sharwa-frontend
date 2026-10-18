import type { MockResult } from "@/lib/bff/mock-route";
import { seeded, pick, int, fullName } from "@/mocks/_fixtures";
import { catalog } from "@/mocks/catalog/state";
import { isEmptyStore } from "@/mocks/empty-store";
import { cardOf, findVisible, isVisible, stockOf } from "@/mocks/storefront/catalog";
import type { Currency } from "@/lib/schemas/money";
import { normalizeBuyerPhone } from "@/mocks/storefront/otp";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";

/**
 * M42 `[NEEDS BACKEND]` state: the shopper's phone bound to the (mock) session cookie
 * (`POST /api/v1/shopper/phone/`), `WishlistItem` rows keyed by phone (`engagement:wishlist-items`,
 * replacing the Phase 4 local list), `BackInStockNotification`
 * (idempotent per phone × product) and `StoreReview`. The M07 customer profile reads the
 * wishlist and back-in-stock rows by phone through `wishlistByPhone`/`backInStockByPhone`.
 */
export interface MockWishlistItem {
  product_id: number;
  created_at: string;
}

export interface MockStoreReview {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

const shoppers = (store: string | null) => storeState(store, "engagement:shoppers", () => new Map<string, string>());
/** The demo number (`0770841802`) starts with a list that shows the three states (M42 §5). */
const DEMO_PHONE = "967770841802";
const wishlists = (store: string | null) =>
  storeState(store, "engagement:wishlist-items", () => {
    const all = new Map<string, Map<number, string>>();
    if (!isEmptyStore(store)) {
      const day = 86_400_000;
      all.set(
        DEMO_PHONE,
        new Map([
          [1003, new Date(FIXTURE_NOW - 2 * day).toISOString()], // available
          [1016, new Date(FIXTURE_NOW - 5 * day).toISOString()], // sold out
          [1008, new Date(FIXTURE_NOW - 9 * day).toISOString()], // unpublished since → «لم يعد متاحاً»
        ]),
      );
    }
    return all;
  });
const backInStock = (store: string | null) => storeState(store, "engagement:back-in-stock", () => new Map<string, Set<number>>());

function storeReviews(store: string | null): MockStoreReview[] {
  return storeState(store, "engagement:store-reviews", () => {
    if (isEmptyStore(store)) return [];
    const rnd = seeded(42);
    const texts = [
      "تغليف أنيق وتوصيل في الموعد، سأعود للشراء.",
      "الجودة ممتازة والأسعار مناسبة.",
      "الرد على واتساب سريع والمنتجات كما في الصور.",
      "تأخر التوصيل يوماً لكن المنتج رائع.",
      "تجربة شراء مريحة من أول مرة.",
    ];
    return Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      customer_name: fullName(rnd).split(" ")[0]!,
      rating: Math.min(5, Math.max(2, Math.round(5 - rnd() * rnd() * 3))),
      comment: pick(rnd, texts),
      created_at: new Date(FIXTURE_NOW - int(rnd, 2, 120) * 86_400_000).toISOString(),
    }));
  });
}

// ── Shopper identity ────────────────────────────────────────────────────────────────
export function shopperPhone(store: string | null, cartId: string): string | null {
  return shoppers(store).get(cartId) ?? null;
}

/** `POST /api/v1/shopper/phone/` `{phone}` → `{phone_normalized}` (normalised like Django: `0770841802 → 967770841802`). */
export function setShopperPhone(store: string | null, cartId: string, raw: unknown): MockResult<{ phone_normalized: string }> {
  const phone = normalizeBuyerPhone(raw);
  if (!phone) return { ok: false, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  shoppers(store).set(cartId, phone);
  return { ok: true, data: { phone_normalized: phone } };
}

// ── Wishlist ────────────────────────────────────────────────────────────────────────
export function wishlistIds(store: string | null, phone: string): number[] {
  const list = wishlists(store).get(phone);
  if (!list) return [];
  return [...list.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id);
}

export function toggleWishlist(store: string | null, phone: string, productId: number): MockResult<{ saved: boolean }> {
  const all = wishlists(store);
  const list = all.get(phone) ?? new Map<number, string>();
  const saved = !list.has(productId);
  // Saving needs a published product; removing a «لم يعد متاحاً» row must always work.
  if (saved && !findVisible(store, productId)) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  if (saved) list.set(productId, new Date().toISOString());
  else list.delete(productId);
  all.set(phone, list);
  return { ok: true, data: { saved } };
}

/** `GET /api/v1/wishlist/` — the current prices from the catalogue, never a snapshot (FR-42.04). */
export function wishlistView(store: string | null, phone: string | null, currency: Currency) {
  if (!phone) return { phone_normalized: null, items: [] };
  const state = catalog(store);
  const list = wishlists(store).get(phone) ?? new Map<number, string>();
  const items = [...list.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .flatMap(([id, created_at]) => {
      const p = state.products.find((x) => x.id === id);
      // A product deleted for good is left out (M42 §8); an unpublished one stays as «لم يعد متاحاً».
      if (!p || p.archived_at) return [];
      const card = cardOf(store, p, currency);
      return [{ product: { ...card, stock: stockOf(state, p), allow_backorder: p.allow_backorder, is_available: isVisible(p) && p.is_available }, created_at }];
    });
  return { phone_normalized: phone, items };
}

/** For the merchant side (M07): the rows by phone, product ids with dates. */
export function wishlistByPhone(store: string | null, phone: string): MockWishlistItem[] {
  const list = wishlists(store).get(phone) ?? new Map<number, string>();
  return [...list.entries()].map(([product_id, created_at]) => ({ product_id, created_at }));
}

// ── Back in stock ───────────────────────────────────────────────────────────────────
/** `POST …/back-in-stock/` `{phone}` → 201 the first time, 200 afterwards (idempotent, US-42.5.1). */
export function subscribeBackInStock(store: string | null, productId: number, raw: unknown): MockResult<{ subscribed: true; already: boolean }> {
  if (!findVisible(store, productId)) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  const phone = normalizeBuyerPhone(raw);
  if (!phone) return { ok: false, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  const all = backInStock(store);
  const set = all.get(phone) ?? new Set<number>();
  const already = set.has(productId);
  set.add(productId);
  all.set(phone, set);
  return { ok: true, status: already ? 200 : 201, data: { subscribed: true, already } };
}

export function backInStockByPhone(store: string | null, phone: string): number[] {
  return [...(backInStock(store).get(phone) ?? [])];
}

export function isSubscribedBackInStock(store: string | null, phone: string | null, productId: number): boolean {
  return Boolean(phone && backInStock(store).get(phone)?.has(productId));
}

// ── Store reviews ───────────────────────────────────────────────────────────────────
export function storeReviewsView(store: string | null) {
  const rows = [...storeReviews(store)].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { average_rating: average, count, results: rows.slice(0, 10) };
}

export function addStoreReview(store: string | null, body: Record<string, unknown>): MockResult<{ status: "published" }> {
  const e: Record<string, string[]> = {};
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) e.rating = ["اختر تقييماً من 1 إلى 5."];
  const comment = String(body.comment ?? "").trim();
  if (comment.length > 1000) e.comment = ["التعليق طويل جداً (1000 حرف كحد أقصى)."];
  const name = String(body.customer_name ?? "").trim();
  if (!name) e.customer_name = ["اكتب اسمك."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const rows = storeReviews(store);
  rows.push({ id: rows.length + 1, customer_name: name, rating, comment, created_at: new Date().toISOString() });
  return { ok: true, status: 201, data: { status: "published" } };
}
