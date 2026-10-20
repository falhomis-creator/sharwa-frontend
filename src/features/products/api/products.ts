"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch, apiFetchRaw } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  applyGlobalResultSchema,
  applyTemplateResultSchema,
  bulkResultSchema,
  changeListSchema,
  globalTemplateListSchema,
  importStatusSchema,
  importUploadSchema,
  productDetailSchema,
  productImageSchema,
  productListResponseSchema,
  productTemplateListSchema,
  productTemplateSchema,
  productVariantListSchema,
  quickAddResponseSchema,
  stockResponseSchema,
  variantAttributeListSchema,
  variantAttributeSchema,
  variantOptionSchema,
  type ProductBulkAction,
  type ProductListResponse,
} from "@/features/products/schemas";

/**
 * M04 data hooks. Every key is tenant-prefixed (`storeKey`, constitution VIII); every
 * response is Zod-validated by `apiFetch` (IX). Lists keep the previous page while the next
 * one loads, so the table never collapses to a skeleton on a filter change.
 */
const BASE = "/api/bff/products";

export type ProductListParams = Record<string, string | number | undefined>;

export function productKeys(store: string) {
  return {
    all: storeKey(store, "products"),
    list: (params: ProductListParams) => storeKey(store, "products", "list", params),
    detail: (id: number) => storeKey(store, "products", "detail", id),
    changes: (id: number, page: number) => storeKey(store, "products", "changes", id, page),
    attributes: storeKey(store, "products", "attributes"),
    templates: storeKey(store, "products", "templates"),
    globals: storeKey(store, "products", "global-templates"),
  };
}

export function useProducts(params: ProductListParams, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: productKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch(BASE, productListResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useProduct(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: productKeys(store).detail(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`${BASE}/${id}`, productDetailSchema, { signal }),
    enabled: id !== null,
  });
}

export function useProductChanges(id: number, page: number) {
  const store = useStore();
  return useQuery({
    queryKey: productKeys(store).changes(id, page),
    queryFn: ({ signal }) => apiFetch(`${BASE}/${id}/changes`, changeListSchema, { query: { page }, signal }),
    placeholderData: keepPreviousData,
  });
}

function invalidateProducts(qc: QueryClient, store: string) {
  return qc.invalidateQueries({ queryKey: productKeys(store).all });
}

export function useInvalidateProducts() {
  const store = useStore();
  const qc = useQueryClient();
  return () => invalidateProducts(qc, store);
}

export function useQuickAdd() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch(`${BASE}/quick`, quickAddResponseSchema, { method: "POST", json: body }),
    onSuccess: () => invalidateProducts(qc, store),
  });
}

export function useSaveProduct(id: number | null) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      id === null
        ? apiFetch(BASE, productDetailSchema, { method: "POST", json: body })
        : apiFetch(`${BASE}/${id}`, productDetailSchema, { method: "PATCH", json: body }),
    onSuccess: (data) => {
      qc.setQueryData(productKeys(store).detail(data.id), data);
      void invalidateProducts(qc, store);
    },
  });
}

export function useDeleteProduct() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, z.object({ archived: z.boolean() }).nullable(), { method: "DELETE" }),
    onSuccess: () => invalidateProducts(qc, store),
  });
}

/** In-place stock edit (FR-04.11): optimistic on every cached list page, rolled back on failure. */
export function useSetStock() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: string }) =>
      apiFetch(`${BASE}/${id}/stock`, stockResponseSchema, { method: "POST", json: { stock, reason: "manual_adjust" } }),
    onMutate: async ({ id, stock }) => {
      const key = storeKey(store, "products", "list");
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueriesData<ProductListResponse>({ queryKey: key });
      qc.setQueriesData<ProductListResponse>({ queryKey: key }, (old) =>
        old ? { ...old, results: old.results.map((r) => (r.id === id ? { ...r, stock } : r)) } : old,
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => invalidateProducts(qc, store),
  });
}

/** In-place price edit — a PATCH with `{price}`, optimistic like the stock cell. */
export function useSetPrice() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }: { id: number; price: string }) =>
      apiFetch(`${BASE}/${id}`, productDetailSchema, { method: "PATCH", json: { price } }),
    onMutate: async ({ id, price }) => {
      const key = storeKey(store, "products", "list");
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueriesData<ProductListResponse>({ queryKey: key });
      qc.setQueriesData<ProductListResponse>({ queryKey: key }, (old) =>
        old ? { ...old, results: old.results.map((r) => (r.id === id ? { ...r, price } : r)) } : old,
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => invalidateProducts(qc, store),
  });
}

export function bulkProducts(ids: number[], action: ProductBulkAction, payload?: Record<string, unknown>) {
  return apiFetch(`${BASE}/bulk`, bulkResultSchema, { method: "POST", json: { ids, action, payload } });
}

export async function downloadProductsCsv(params: ProductListParams) {
  const res = await apiFetchRaw(`${BASE}/export.csv`, { query: params });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "products.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Images ────────────────────────────────────────────────────────────────────────────
const imagesSchema = z.array(productImageSchema);

export function uploadImages(id: number, files: File[]) {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  return apiFetch(`${BASE}/${id}/images`, imagesSchema, { method: "POST", body: fd });
}

export function deleteImage(id: number, imageId: number) {
  return apiFetch(`${BASE}/${id}/images/${imageId}`, imagesSchema, { method: "DELETE" });
}

export function reorderImages(id: number, ordered: number[]) {
  return apiFetch(`${BASE}/${id}/images/reorder`, imagesSchema, { method: "POST", json: { ordered_ids: ordered } });
}

// ── Variants ──────────────────────────────────────────────────────────────────────────
export function generateVariants(id: number, body: { attribute_ids: number[]; option_ids: number[]; exclude: number[][] }) {
  return apiFetch(`${BASE}/${id}/variants/generate`, productVariantListSchema, { method: "POST", json: body });
}

export function saveVariants(id: number, variants: Array<{ id: number; sku?: string; extra_price?: string; stock?: string }>) {
  return apiFetch(`${BASE}/${id}/variants/bulk`, productVariantListSchema, { method: "POST", json: { variants } });
}

// ── Dictionary ────────────────────────────────────────────────────────────────────────
export function useVariantAttributes() {
  const store = useStore();
  return useQuery({
    queryKey: productKeys(store).attributes,
    queryFn: ({ signal }) => apiFetch(`${BASE}/variant-attributes`, variantAttributeListSchema, { signal }),
  });
}

export const attributeApi = {
  create: (body: Record<string, unknown>) =>
    apiFetch(`${BASE}/variant-attributes`, variantAttributeSchema, { method: "POST", json: body }),
  update: (id: number, body: Record<string, unknown>) =>
    apiFetch(`${BASE}/variant-attributes/${id}`, variantAttributeSchema, { method: "PATCH", json: body }),
  remove: (id: number) => apiFetch(`${BASE}/variant-attributes/${id}`, z.undefined(), { method: "DELETE" }),
  addOption: (attributeId: number, body: Record<string, unknown>) =>
    apiFetch(`${BASE}/variant-attributes/${attributeId}/options`, variantOptionSchema, { method: "POST", json: body }),
  updateOption: (optionId: number, body: Record<string, unknown>) =>
    apiFetch(`${BASE}/variant-attributes/options/${optionId}`, variantOptionSchema, { method: "PATCH", json: body }),
  removeOption: (optionId: number) =>
    apiFetch(`${BASE}/variant-attributes/options/${optionId}`, z.undefined(), { method: "DELETE" }),
};

// ── Templates ─────────────────────────────────────────────────────────────────────────
export function useTemplates(opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: productKeys(store).templates,
    queryFn: ({ signal }) => apiFetch(`${BASE}/templates`, productTemplateListSchema, { signal }),
    enabled: opts.enabled ?? true,
  });
}

export function useGlobalTemplates(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: productKeys(store).globals,
    queryFn: ({ signal }) => apiFetch(`${BASE}/global-templates`, globalTemplateListSchema, { signal }),
    staleTime: 10 * 60_000,
    enabled,
  });
}

export const templateApi = {
  create: (body: Record<string, unknown>) =>
    apiFetch(`${BASE}/templates`, productTemplateSchema, { method: "POST", json: body }),
  update: (id: number, body: Record<string, unknown>) =>
    apiFetch(`${BASE}/templates/${id}`, productTemplateSchema, { method: "PATCH", json: body }),
  remove: (id: number) => apiFetch(`${BASE}/templates/${id}`, z.undefined(), { method: "DELETE" }),
  apply: (id: number, productIds: number[]) =>
    apiFetch(`${BASE}/templates/${id}/apply`, applyTemplateResultSchema, { method: "POST", json: { product_ids: productIds } }),
  applyGlobal: (id: number, globalId: number) =>
    apiFetch(`${BASE}/templates/${id}/apply-global`, applyGlobalResultSchema, {
      method: "POST",
      json: { global_template_id: globalId },
    }),
};

// ── Import ────────────────────────────────────────────────────────────────────────────
export const importApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch(`${BASE}/import`, importUploadSchema, { method: "POST", body: fd });
  },
  run: (jobId: string, mapping: Record<string, string>) =>
    apiFetch(`${BASE}/import/${jobId}/run`, importStatusSchema, { method: "POST", json: { mapping } }),
  status: (jobId: string) => apiFetch(`${BASE}/import/${jobId}`, importStatusSchema),
};
