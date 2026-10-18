import { isEmptyStore } from "@/mocks/empty-store";
import { storeState } from "@/mocks/store-state";
import type { ProductTemplate, VariantAttribute } from "@/features/products/schemas";
import type { Brand, Category, Tag } from "@/features/organization/schemas";
import {
  ATTRIBUTE_SEED,
  BADGE_SEED,
  BRAND_SEED,
  CATEGORY_SEED,
  COLLECTION_SEED,
  TAG_SEED,
  TEMPLATE_SEED,
  seedChanges,
  seedProducts,
  type MockBadge,
  type MockChange,
  type MockCollection,
  type MockProduct,
  type MockVariant,
} from "@/mocks/catalog/seed";

/**
 * The whole catalogue of one store (M04 + M05), created on first access. A working store
 * (`noor`) gets the full fixture; an empty store (`shop`, or one the onboarding wizard just
 * created) starts with no products and no organization — the «أضف منتجك الأول» state —
 * but keeps the variant dictionary, which is a store default.
 */
export interface ImportJob {
  id: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  status: "uploaded" | "previewed" | "running" | "done" | "failed";
  done: number;
  failed: Array<{ row: number; msg: string }>;
  mapping: Record<string, string>;
  startedAt: number;
}

export interface CatalogState {
  categories: Omit<Category, "products_count">[];
  brands: Omit<Brand, "products_count">[];
  tags: Array<Omit<Tag, "products_count" | "last_used_at">>;
  collections: MockCollection[];
  badges: MockBadge[];
  products: MockProduct[];
  variants: MockVariant[];
  attributes: Array<Omit<VariantAttribute, "products_count">>;
  templates: Array<Omit<ProductTemplate, "products_count">>;
  changes: MockChange[];
  imports: Map<string, ImportJob>;
  /** Monotonic ids per entity (one store never reuses an id). */
  ids: Record<string, number>;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function seed(store: string | null): CatalogState {
  const empty = isEmptyStore(store);
  const { products, variants } = empty ? { products: [], variants: [] } : seedProducts();
  return {
    categories: empty ? [] : clone(CATEGORY_SEED),
    brands: empty ? [] : clone(BRAND_SEED),
    tags: empty ? [] : clone(TAG_SEED),
    collections: empty ? [] : clone(COLLECTION_SEED),
    badges: empty ? [] : clone(BADGE_SEED),
    products,
    variants,
    attributes: clone(ATTRIBUTE_SEED),
    templates: empty ? [] : clone(TEMPLATE_SEED),
    changes: empty ? [] : seedChanges(products),
    imports: new Map(),
    ids: {
      category: 100,
      brand: 100,
      tag: 100,
      collection: 100,
      badge: 100,
      product: 2000,
      variant: 9000,
      attribute: 100,
      option: 500,
      template: 100,
      change: 1000,
      image: 1,
    },
  };
}

export function catalog(store: string | null): CatalogState {
  return storeState(store, "catalog", () => seed(store));
}

export function nextCatalogId(state: CatalogState, entity: keyof CatalogState["ids"] | string): number {
  state.ids[entity] = (state.ids[entity] ?? 100) + 1;
  return state.ids[entity];
}
