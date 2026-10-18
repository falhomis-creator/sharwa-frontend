import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { storeTag } from "@/lib/cache";
import type { Currency } from "@/lib/schemas/money";
import { isMocksOn } from "@/mocks/runtime";
import { categoryTree, facets, listPublicProducts, offers, productDetail } from "@/mocks/storefront/catalog";
import {
  CategoryTreeSchema,
  FacetsSchema,
  OffersSchema,
  PRODUCT_QUERY_KEYS,
  ProductDetailSchema,
  ProductPageSchema,
  type CategoryNode,
  type Facets,
  type Offer,
  type ProductDetail,
  type ProductPage,
  type ProductQuery,
} from "@/features/storefront/schemas/catalog";
import { StorefrontUnavailableError, getPublicJson } from "@/features/storefront/api/upstream";

/**
 * Cached public catalogue reads (ready-api-v1 #2–#4, T087). Same rules as `getStoreConfig`:
 * `'use cache'` + `cacheLife('minutes')` + `cacheTag(storeTag(store))`, `store` first, no
 * cookie, Zod at the boundary, fixtures only while Django has no row for the tenant.
 */
function queryString(query: ProductQuery, currency: Currency): string {
  const sp = new URLSearchParams();
  for (const key of PRODUCT_QUERY_KEYS) {
    const v = query[key];
    if (v) sp.set(key, v);
  }
  sp.set("currency", currency);
  return sp.toString();
}

export async function getCategories(store: string, storeHost: string): Promise<CategoryNode[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeTag(store));

  const res = await getPublicJson("/api/v1/catalog/categories/", storeHost);
  if (res?.status === 200) {
    const parsed = CategoryTreeSchema.safeParse(res.data);
    if (parsed.success) return parsed.data;
  }
  if ((!res || res.isMockable) && isMocksOn()) return CategoryTreeSchema.parse(categoryTree(store));
  if (res?.status === 200) throw new StorefrontUnavailableError("/api/v1/catalog/categories/", 502);
  return [];
}

export type ProductPageResult = { ok: true; page: ProductPage } | { ok: false; status: 404 };

/** #3 — a 404 (page past the end) is a RESULT, so the listing can correct the URL (M09 §8). */
export async function getProducts(
  store: string,
  storeHost: string,
  query: ProductQuery,
  currency: Currency,
): Promise<ProductPageResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeTag(store));

  const qs = queryString(query, currency);
  const res = await getPublicJson(`/api/v1/catalog/products/?${qs}`, storeHost);
  if (res?.status === 200) {
    const parsed = ProductPageSchema.safeParse(res.data);
    if (parsed.success) return { ok: true, page: parsed.data };
    throw new StorefrontUnavailableError("/api/v1/catalog/products/", 502);
  }
  if ((!res || res.isMockable) && isMocksOn()) {
    const result = listPublicProducts(store, new URLSearchParams(qs), currency);
    return result.ok ? { ok: true, page: ProductPageSchema.parse(result.data) } : { ok: false, status: 404 };
  }
  if (res?.status === 404) return { ok: false, status: 404 };
  throw new StorefrontUnavailableError("/api/v1/catalog/products/", res?.status ?? 502);
}

/** #4 — `null` when the product is not sold (404: draft, archived, scheduled — M10 §8). */
export async function getProduct(store: string, storeHost: string, id: number, currency: Currency): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeTag(store));

  const res = await getPublicJson(`/api/v1/catalog/products/${id}/?currency=${currency}`, storeHost);
  if (res?.status === 200) {
    const parsed = ProductDetailSchema.safeParse(res.data);
    if (parsed.success) return parsed.data;
    throw new StorefrontUnavailableError(`/api/v1/catalog/products/${id}/`, 502);
  }
  if ((!res || res.isMockable) && isMocksOn()) {
    const detail = productDetail(store, id, currency);
    return detail ? ProductDetailSchema.parse(detail) : null;
  }
  if (res?.status === 404) return null;
  throw new StorefrontUnavailableError(`/api/v1/catalog/products/${id}/`, res?.status ?? 502);
}

/** `[NEEDS BACKEND]` `GET /api/v1/catalog/facets/?category=` (M09 §7) — empty until it ships. */
export async function getFacets(store: string, storeHost: string, query: ProductQuery): Promise<Facets> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeTag(store));

  const sp = new URLSearchParams();
  for (const key of ["category", "brand", "tag", "collection", "search", "is_featured"] as const) {
    if (query[key]) sp.set(key, query[key]!);
  }
  const res = await getPublicJson(`/api/v1/catalog/facets/?${sp.toString()}`, storeHost);
  if (res?.status === 200) {
    const parsed = FacetsSchema.safeParse(res.data);
    if (parsed.success) return parsed.data;
  }
  if ((!res || res.isMockable) && isMocksOn()) return FacetsSchema.parse(facets(store, sp));
  return { brands: [], tags: [], collections: [] };
}

/** `[NEEDS BACKEND]` `GET /api/v1/catalog/offers/` (M09 §7) — the `promotional_offers` section hides when empty. */
export async function getOffers(store: string, storeHost: string): Promise<Offer[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeTag(store));

  const res = await getPublicJson("/api/v1/catalog/offers/", storeHost);
  if (res?.status === 200) {
    const parsed = OffersSchema.safeParse(res.data);
    if (parsed.success) return parsed.data;
  }
  if ((!res || res.isMockable) && isMocksOn()) return OffersSchema.parse(offers(store));
  return [];
}
