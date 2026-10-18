"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  badgeListSchema,
  badgeSchema,
  brandListSchema,
  brandSchema,
  categoryListSchema,
  categorySchema,
  collectionDetailSchema,
  collectionListSchema,
  collectionSchema,
  tagListSchema,
  tagSchema,
  type ReorderMoves,
} from "@/features/organization/schemas";

/**
 * M05 data hooks — ONE cache source for the organization screens and for every picker in
 * M04 (FR-05.12), so an entity created here is selectable in the product editor without a
 * reload (SC-05.5).
 */
export function orgKeys(store: string) {
  return {
    all: storeKey(store, "organization"),
    categories: storeKey(store, "organization", "categories"),
    brands: storeKey(store, "organization", "brands"),
    tags: storeKey(store, "organization", "tags"),
    collections: storeKey(store, "organization", "collections"),
    collection: (id: number) => storeKey(store, "organization", "collections", id),
    badges: storeKey(store, "organization", "badges"),
  };
}

export function useCategories() {
  const store = useStore();
  return useQuery({
    queryKey: orgKeys(store).categories,
    queryFn: ({ signal }) => apiFetch("/api/bff/categories", categoryListSchema, { signal }),
  });
}

export function useBrands() {
  const store = useStore();
  return useQuery({ queryKey: orgKeys(store).brands, queryFn: ({ signal }) => apiFetch("/api/bff/brands", brandListSchema, { signal }) });
}

export function useTags() {
  const store = useStore();
  return useQuery({ queryKey: orgKeys(store).tags, queryFn: ({ signal }) => apiFetch("/api/bff/tags", tagListSchema, { signal }) });
}

export function useCollections() {
  const store = useStore();
  return useQuery({
    queryKey: orgKeys(store).collections,
    queryFn: ({ signal }) => apiFetch("/api/bff/collections", collectionListSchema, { signal }),
  });
}

export function useCollection(id: number) {
  const store = useStore();
  return useQuery({
    queryKey: orgKeys(store).collection(id),
    queryFn: ({ signal }) => apiFetch(`/api/bff/collections/${id}`, collectionDetailSchema, { signal }),
  });
}

export function useBadges() {
  const store = useStore();
  return useQuery({ queryKey: orgKeys(store).badges, queryFn: ({ signal }) => apiFetch("/api/bff/badges", badgeListSchema, { signal }) });
}

/** Invalidate organization AND products (counts and pickers move together). */
export function useInvalidateOrganization() {
  const store = useStore();
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: orgKeys(store).all }),
      qc.invalidateQueries({ queryKey: storeKey(store, "products") }),
    ]);
}

const moved = z.object({ moved_products: z.number().int() });
const cleared = z.object({ cleared: z.number().int() });

export const orgApi = {
  createCategory: (body: Record<string, unknown>) => apiFetch("/api/bff/categories", categorySchema, { method: "POST", json: body }),
  updateCategory: (id: number, body: Record<string, unknown>) =>
    apiFetch(`/api/bff/categories/${id}`, categorySchema, { method: "PATCH", json: body }),
  deleteCategory: (id: number, reassignTo: number | "none" | null, children: "grandparent" | "root") =>
    apiFetch(`/api/bff/categories/${id}`, moved, {
      method: "DELETE",
      query: { reassign_to: reassignTo === null ? undefined : String(reassignTo), children },
    }),
  reorderCategories: (moves: ReorderMoves["moves"]) =>
    apiFetch("/api/bff/categories/reorder", categoryListSchema, { method: "POST", json: { moves } }),
  saveBrand: (id: number | null, body: Record<string, unknown>) =>
    apiFetch(id === null ? "/api/bff/brands" : `/api/bff/brands/${id}`, brandSchema, { method: id === null ? "POST" : "PATCH", json: body }),
  deleteBrand: (id: number) => apiFetch(`/api/bff/brands/${id}`, cleared, { method: "DELETE" }),
  saveTag: (id: number | null, body: Record<string, unknown>) =>
    apiFetch(id === null ? "/api/bff/tags" : `/api/bff/tags/${id}`, tagSchema, { method: id === null ? "POST" : "PATCH", json: body }),
  deleteTag: (id: number) => apiFetch(`/api/bff/tags/${id}`, cleared, { method: "DELETE" }),
  mergeTags: (fromId: number, intoId: number) =>
    apiFetch("/api/bff/tags/merge", z.object({ moved: z.number().int() }), { method: "POST", json: { from_id: fromId, into_id: intoId } }),
  saveCollection: (id: number | null, body: Record<string, unknown>) =>
    apiFetch(id === null ? "/api/bff/collections" : `/api/bff/collections/${id}`, collectionSchema, {
      method: id === null ? "POST" : "PATCH",
      json: body,
    }),
  deleteCollection: (id: number) => apiFetch(`/api/bff/collections/${id}`, z.undefined(), { method: "DELETE" }),
  addToCollection: (id: number, productIds: number[]) =>
    apiFetch(`/api/bff/collections/${id}/products`, collectionDetailSchema, { method: "POST", json: { product_ids: productIds } }),
  removeFromCollection: (id: number, productId: number) =>
    apiFetch(`/api/bff/collections/${id}/products/${productId}`, collectionDetailSchema, { method: "DELETE" }),
  reorderCollection: (id: number, ordered: number[]) =>
    apiFetch(`/api/bff/collections/${id}/products/reorder`, collectionDetailSchema, { method: "POST", json: { ordered_ids: ordered } }),
  saveBadge: (id: number | null, body: Record<string, unknown>) =>
    apiFetch(id === null ? "/api/bff/badges" : `/api/bff/badges/${id}`, badgeSchema, { method: id === null ? "POST" : "PATCH", json: body }),
  deleteBadge: (id: number) => apiFetch(`/api/bff/badges/${id}`, cleared, { method: "DELETE" }),
};
