import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney } from "@/mocks/_fixtures";
import { FIXTURE_NOW } from "@/mocks/store-state";
import {
  BADGE_DEFAULT_COLOR,
  BADGE_NAME_MAX,
  CATEGORY_NAME_MAX,
  HEX_RE,
  SEO_LIMITS,
  TAG_NAME_MAX,
  slugify,
  type Badge,
  type Brand,
  type Category,
  type Collection,
  type CollectionDetail,
  type Tag,
} from "@/features/organization/schemas";
import { effectivePrice } from "@/mocks/catalog/products";
import { catalog, nextCatalogId } from "@/mocks/catalog/state";

/**
 * M05 operations (all rows `[NEEDS BACKEND]`): category tree with reorder/nesting and cycle
 * rejection, `reassign_to` on delete, brand/tag/collection/badge CRUD, tag merge, manual
 * collections with ordered products. Counts are derived from the catalogue every time, so
 * a product created in M04 shows up here without a reload (SC-05.5).
 */
type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const now = () => new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString();

// ── Categories ────────────────────────────────────────────────────────────────────────
export function listCategories(store: string | null): Category[] {
  const state = catalog(store);
  return [...state.categories]
    .sort((a, b) => (a.parent_id ?? 0) - (b.parent_id ?? 0) || a.sort_order - b.sort_order)
    .map((c) => ({ ...c, products_count: state.products.filter((p) => p.category_id === c.id).length }));
}

function seoErrors(body: Body): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  for (const [k, max] of Object.entries(SEO_LIMITS)) {
    if (str(body[k]).length > max) e[k] = [`${max} حرفاً على الأكثر.`];
  }
  return e;
}

function isDescendant(state: ReturnType<typeof catalog>, candidate: number, of: number): boolean {
  let cur = state.categories.find((c) => c.id === candidate);
  const seen = new Set<number>();
  while (cur && cur.parent_id !== null && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.parent_id === of) return true;
    cur = state.categories.find((c) => c.id === cur!.parent_id);
  }
  return false;
}

export function createCategory(store: string | null, body: Body): MockResult<Category> {
  const state = catalog(store);
  const name = str(body.name).trim();
  const e = seoErrors(body);
  if (!name) e.name = ["أدخل اسم التصنيف."];
  else if (name.length > CATEGORY_NAME_MAX) e.name = [`الاسم ${CATEGORY_NAME_MAX} حرفاً على الأكثر.`];
  const parent = body.parent_id === null || body.parent_id === undefined || body.parent_id === "" ? null : Number(body.parent_id);
  if (parent !== null && !state.categories.some((c) => c.id === parent)) e.parent_id = ["التصنيف الأب غير موجود."];
  if (state.categories.some((c) => c.name === name && c.parent_id === parent)) e.name = ["تصنيف بهذا الاسم موجود في نفس المستوى."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const siblings = state.categories.filter((c) => c.parent_id === parent);
  const cat = {
    id: nextCatalogId(state, "category"),
    name,
    parent_id: parent,
    sort_order: siblings.length,
    image: typeof body.image === "string" && body.image ? body.image : null,
    meta_title: str(body.meta_title),
    meta_description: str(body.meta_description),
    meta_keywords: str(body.meta_keywords),
    og_image: typeof body.og_image === "string" && body.og_image ? body.og_image : null,
  };
  state.categories.push(cat);
  return { ok: true, status: 201, data: { ...cat, products_count: 0 } };
}

export function updateCategory(store: string | null, id: number, body: Body): MockResult<Category> {
  const state = catalog(store);
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return { ok: false, status: 404, body: { detail: "التصنيف غير موجود." } };
  const e = seoErrors(body);
  if ("name" in body) {
    const name = str(body.name).trim();
    if (!name) e.name = ["أدخل اسم التصنيف."];
    else if (name.length > CATEGORY_NAME_MAX) e.name = [`الاسم ${CATEGORY_NAME_MAX} حرفاً على الأكثر.`];
  }
  if ("parent_id" in body) {
    const parent = body.parent_id === null || body.parent_id === "" ? null : Number(body.parent_id);
    if (parent === id || (parent !== null && isDescendant(state, parent, id))) {
      e.parent_id = ["لا يمكن نقل التصنيف داخل أحد فروعه."];
    }
  }
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  if ("name" in body) cat.name = str(body.name).trim();
  if ("parent_id" in body) cat.parent_id = body.parent_id === null || body.parent_id === "" ? null : Number(body.parent_id);
  if ("image" in body) cat.image = typeof body.image === "string" && body.image ? body.image : null;
  if ("og_image" in body) cat.og_image = typeof body.og_image === "string" && body.og_image ? body.og_image : null;
  for (const k of ["meta_title", "meta_description", "meta_keywords"] as const) if (k in body) cat[k] = str(body[k]);
  return { ok: true, data: { ...cat, products_count: state.products.filter((p) => p.category_id === id).length } };
}

/**
 * `DELETE /categories/<id>/?reassign_to=<id>|none&children=lift|grandparent`.
 * Products move to `reassign_to` (or stay uncategorized); children rise to the parent.
 */
export function deleteCategory(store: string | null, id: number, params: URLSearchParams): MockResult<{ moved_products: number }> {
  const state = catalog(store);
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return { ok: false, status: 404, body: { detail: "التصنيف غير موجود." } };
  const affected = state.products.filter((p) => p.category_id === id);
  const reassignRaw = params.get("reassign_to");
  if (affected.length > 0 && reassignRaw === null) {
    return {
      ok: false,
      status: 409,
      body: { detail: "للتصنيف منتجات؛ اختر نقلها أو إبقاءها بلا تصنيف.", products_count: affected.length },
    };
  }
  const target = reassignRaw && reassignRaw !== "none" ? Number(reassignRaw) : null;
  if (target === id) return { ok: false, status: 400, body: { reassign_to: ["اختر تصنيفاً آخر."] } };
  const childMode = params.get("children") === "root" ? "root" : "grandparent";
  for (const p of affected) p.category_id = target;
  for (const child of state.categories.filter((c) => c.parent_id === id)) {
    child.parent_id = childMode === "root" ? null : cat.parent_id;
  }
  state.categories = state.categories.filter((c) => c.id !== id);
  return { ok: true, data: { moved_products: affected.length } };
}

export function reorderCategories(store: string | null, body: Body): MockResult<Category[]> {
  const state = catalog(store);
  const moves = Array.isArray(body.moves) ? (body.moves as Array<Record<string, unknown>>) : [];
  // Validate against the post-move tree: no category may become its own ancestor.
  const parentOf = new Map(state.categories.map((c) => [c.id, c.parent_id]));
  for (const m of moves) {
    const id = Number(m.id);
    if (!parentOf.has(id)) return { ok: false, status: 400, body: { detail: "تصنيف غير موجود في الترتيب." } };
    parentOf.set(id, m.parent_id === null || m.parent_id === undefined ? null : Number(m.parent_id));
  }
  for (const start of parentOf.keys()) {
    const seen = new Set<number>();
    let cur: number | null | undefined = start;
    while (cur !== null && cur !== undefined) {
      if (seen.has(cur)) return { ok: false, status: 400, body: { detail: "الترتيب يُنشئ دورة: لا يمكن وضع تصنيف داخل أحد فروعه." } };
      seen.add(cur);
      cur = parentOf.get(cur);
    }
  }
  for (const m of moves) {
    const cat = state.categories.find((c) => c.id === Number(m.id))!;
    cat.parent_id = m.parent_id === null || m.parent_id === undefined ? null : Number(m.parent_id);
    cat.sort_order = Number(m.sort_order) || 0;
  }
  return { ok: true, data: listCategories(store) };
}

// ── Brands ────────────────────────────────────────────────────────────────────────────
export function listBrands(store: string | null): Brand[] {
  const state = catalog(store);
  return state.brands.map((b) => ({ ...b, products_count: state.products.filter((p) => p.brand_id === b.id).length }));
}

export function saveBrand(store: string | null, id: number | null, body: Body): MockResult<Brand> {
  const state = catalog(store);
  const existing = id === null ? undefined : state.brands.find((b) => b.id === id);
  if (id !== null && !existing) return { ok: false, status: 404, body: { detail: "الماركة غير موجودة." } };
  const name = "name" in body ? str(body.name).trim() : (existing?.name ?? "");
  const slug = "slug" in body ? slugify(str(body.slug)) : (existing?.slug ?? "");
  const e: Record<string, string[]> = {};
  if (!name) e.name = ["أدخل اسم الماركة."];
  if (state.brands.some((b) => b.name === name && b.id !== id)) e.name = ["ماركة بهذا الاسم موجودة."];
  const finalSlug = slug || slugify(name) || `brand-${state.ids.brand + 1}`;
  if (state.brands.some((b) => b.slug === finalSlug && b.id !== id)) e.slug = ["هذا الـ slug مستخدم؛ جرّب لاحقة مختلفة."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const logo = "logo" in body ? (typeof body.logo === "string" && body.logo ? body.logo : null) : (existing?.logo ?? null);
  if (existing) {
    Object.assign(existing, { name, slug: finalSlug, logo });
    return { ok: true, data: { ...existing, products_count: state.products.filter((p) => p.brand_id === existing.id).length } };
  }
  const brand = { id: nextCatalogId(state, "brand"), name, slug: finalSlug, logo };
  state.brands.push(brand);
  return { ok: true, status: 201, data: { ...brand, products_count: 0 } };
}

export function deleteBrand(store: string | null, id: number): MockResult<{ cleared: number }> {
  const state = catalog(store);
  let cleared = 0;
  for (const p of state.products) {
    if (p.brand_id === id) {
      p.brand_id = null;
      cleared++;
    }
  }
  state.brands = state.brands.filter((b) => b.id !== id);
  return { ok: true, data: { cleared } };
}

// ── Tags ──────────────────────────────────────────────────────────────────────────────
export function listTags(store: string | null): Tag[] {
  const state = catalog(store);
  return state.tags.map((t) => {
    const products = state.products.filter((p) => p.tag_ids.includes(t.id));
    const last = products.map((p) => p.updated_at).sort().at(-1) ?? null;
    return { ...t, products_count: products.length, last_used_at: last };
  });
}

export function saveTag(store: string | null, id: number | null, body: Body): MockResult<Tag> {
  const state = catalog(store);
  const existing = id === null ? undefined : state.tags.find((t) => t.id === id);
  if (id !== null && !existing) return { ok: false, status: 404, body: { detail: "الوسم غير موجود." } };
  const name = str(body.name).trim();
  if (!name) return { ok: false, status: 400, body: { name: ["أدخل اسم الوسم."] } };
  if (name.length > TAG_NAME_MAX) return { ok: false, status: 400, body: { name: [`الاسم ${TAG_NAME_MAX} حرفاً على الأكثر.`] } };
  if (state.tags.some((t) => t.name === name && t.id !== id)) return { ok: false, status: 400, body: { name: ["وسم بهذا الاسم موجود."] } };
  const slug = slugify(str(body.slug)) || existing?.slug || slugify(name) || `tag-${state.ids.tag + 1}`;
  if (existing) {
    Object.assign(existing, { name, slug });
    return { ok: true, data: listTags(store).find((t) => t.id === existing.id)! };
  }
  const tag = { id: nextCatalogId(state, "tag"), name, slug };
  state.tags.push(tag);
  return { ok: true, status: 201, data: { ...tag, products_count: 0, last_used_at: null } };
}

export function deleteTag(store: string | null, id: number): MockResult<{ cleared: number }> {
  const state = catalog(store);
  let cleared = 0;
  for (const p of state.products) {
    if (p.tag_ids.includes(id)) {
      p.tag_ids = p.tag_ids.filter((t) => t !== id);
      cleared++;
    }
  }
  state.tags = state.tags.filter((t) => t.id !== id);
  return { ok: true, data: { cleared } };
}

export function mergeTags(store: string | null, fromId: number, intoId: number): MockResult<{ moved: number }> {
  const state = catalog(store);
  if (fromId === intoId) return { ok: false, status: 400, body: { into_id: ["اختر وسماً مختلفاً."] } };
  if (!state.tags.some((t) => t.id === fromId) || !state.tags.some((t) => t.id === intoId)) {
    return { ok: false, status: 404, body: { detail: "الوسم غير موجود." } };
  }
  let moved = 0;
  for (const p of state.products) {
    if (p.tag_ids.includes(fromId)) {
      p.tag_ids = p.tag_ids.filter((t) => t !== fromId);
      if (!p.tag_ids.includes(intoId)) p.tag_ids.push(intoId);
      moved++;
    }
  }
  state.tags = state.tags.filter((t) => t.id !== fromId);
  return { ok: true, data: { moved } };
}

// ── Collections ───────────────────────────────────────────────────────────────────────
export function listCollections(store: string | null): Collection[] {
  const state = catalog(store);
  return state.collections.map(({ product_ids, ...c }) => ({ ...c, products_count: product_ids.length }));
}

export function collectionDetail(store: string | null, id: number): CollectionDetail | null {
  const state = catalog(store);
  const c = state.collections.find((x) => x.id === id);
  if (!c) return null;
  const { product_ids, ...rest } = c;
  return {
    ...rest,
    products_count: product_ids.length,
    products: product_ids
      .map((pid) => state.products.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        image: p.images[0]?.url ?? null,
        display_price: displayMoney(Number(effectivePrice(p)), p.currency),
        is_archived: Boolean(p.archived_at),
      })),
  };
}

export function saveCollection(store: string | null, id: number | null, body: Body): MockResult<Collection> {
  const state = catalog(store);
  const existing = id === null ? undefined : state.collections.find((c) => c.id === id);
  if (id !== null && !existing) return { ok: false, status: 404, body: { detail: "المجموعة غير موجودة." } };
  const name = "name" in body ? str(body.name).trim() : (existing?.name ?? "");
  if (!name) return { ok: false, status: 400, body: { name: ["أدخل اسم المجموعة."] } };
  const slug = slugify(str(body.slug)) || existing?.slug || slugify(name) || `collection-${state.ids.collection + 1}`;
  if (state.collections.some((c) => c.slug === slug && c.id !== id)) return { ok: false, status: 400, body: { slug: ["هذا الـ slug مستخدم."] } };
  const description = "description" in body ? str(body.description) : (existing?.description ?? "");
  if (existing) {
    Object.assign(existing, { name, slug, description });
    return { ok: true, data: listCollections(store).find((c) => c.id === existing.id)! };
  }
  const coll = { id: nextCatalogId(state, "collection"), name, slug, description, product_ids: [] as number[] };
  state.collections.push(coll);
  return { ok: true, status: 201, data: { id: coll.id, name, slug, description, products_count: 0 } };
}

export function deleteCollection(store: string | null, id: number): MockResult<null> {
  const state = catalog(store);
  state.collections = state.collections.filter((c) => c.id !== id);
  return { ok: true, status: 204, data: null };
}

export function collectionAdd(store: string | null, id: number, productIds: number[]): MockResult<CollectionDetail> {
  const state = catalog(store);
  const c = state.collections.find((x) => x.id === id);
  if (!c) return { ok: false, status: 404, body: { detail: "المجموعة غير موجودة." } };
  for (const pid of productIds) if (!c.product_ids.includes(pid) && state.products.some((p) => p.id === pid)) c.product_ids.push(pid);
  return { ok: true, data: collectionDetail(store, id)! };
}

export function collectionRemove(store: string | null, id: number, productId: number): MockResult<CollectionDetail> {
  const state = catalog(store);
  const c = state.collections.find((x) => x.id === id);
  if (!c) return { ok: false, status: 404, body: { detail: "المجموعة غير موجودة." } };
  c.product_ids = c.product_ids.filter((p) => p !== productId);
  return { ok: true, data: collectionDetail(store, id)! };
}

export function collectionReorder(store: string | null, id: number, ordered: number[]): MockResult<CollectionDetail> {
  const state = catalog(store);
  const c = state.collections.find((x) => x.id === id);
  if (!c) return { ok: false, status: 404, body: { detail: "المجموعة غير موجودة." } };
  const kept = ordered.filter((pid) => c.product_ids.includes(pid));
  c.product_ids = [...kept, ...c.product_ids.filter((pid) => !kept.includes(pid))];
  return { ok: true, data: collectionDetail(store, id)! };
}

// ── Badges ────────────────────────────────────────────────────────────────────────────
export function listBadges(store: string | null): Badge[] {
  const state = catalog(store);
  return state.badges.map((b) => ({ ...b, products_count: state.products.filter((p) => p.badge_ids.includes(b.id)).length }));
}

export function saveBadge(store: string | null, id: number | null, body: Body): MockResult<Badge> {
  const state = catalog(store);
  const existing = id === null ? undefined : state.badges.find((b) => b.id === id);
  if (id !== null && !existing) return { ok: false, status: 404, body: { detail: "الشارة غير موجودة." } };
  const name = "name" in body ? str(body.name).trim() : (existing?.name ?? "");
  const color = "color" in body ? str(body.color) : (existing?.color ?? BADGE_DEFAULT_COLOR);
  const e: Record<string, string[]> = {};
  if (!name) e.name = ["أدخل اسم الشارة."];
  else if (name.length > BADGE_NAME_MAX) e.name = [`الاسم ${BADGE_NAME_MAX} حرفاً على الأكثر.`];
  if (!HEX_RE.test(color)) e.color = ["لون بصيغة #RRGGBB."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  if (existing) {
    Object.assign(existing, { name, color });
    return { ok: true, data: listBadges(store).find((b) => b.id === existing.id)! };
  }
  const badge = { id: nextCatalogId(state, "badge"), name, color };
  state.badges.push(badge);
  return { ok: true, status: 201, data: { ...badge, products_count: 0 } };
}

export function deleteBadge(store: string | null, id: number): MockResult<{ cleared: number }> {
  const state = catalog(store);
  let cleared = 0;
  for (const p of state.products) {
    if (p.badge_ids.includes(id)) {
      p.badge_ids = p.badge_ids.filter((b) => b !== id);
      cleared++;
    }
  }
  state.badges = state.badges.filter((b) => b.id !== id);
  return { ok: true, data: { cleared } };
}

export { now as organizationNow };
