"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  accessSchema,
  catalogSyncSchema,
  channelListSchema,
  keywordListSchema,
  keywordSchema,
  mappingListSchema,
  syncProductListSchema,
  telegramResultSchema,
  templateListSchema,
  templateSchema,
  tiktokCategoryListSchema,
  type AccessRow,
  type ConnectionCode,
  type KeywordForm,
  type StaffAccess,
  type TemplateForm,
} from "@/features/channels/schemas";

/** M27 channel-settings hooks — keys `[tenant, 'channels', …]`. */
export function channelKeys(store: string) {
  return {
    all: storeKey(store, "channels"),
    list: storeKey(store, "channels", "list"),
    keywords: storeKey(store, "channels", "keywords"),
    templates: storeKey(store, "channels", "templates"),
    sync: (code: string) => storeKey(store, "channels", "sync", code),
    products: (code: string, p: Record<string, unknown>) => storeKey(store, "channels", "products", code, p),
    tiktokCats: storeKey(store, "channels", "tiktok", "categories"),
    mapping: storeKey(store, "channels", "tiktok", "mapping"),
    access: storeKey(store, "channels", "access"),
  };
}

export function useChannels() {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).list, queryFn: ({ signal }) => apiFetch("/api/bff/channels", channelListSchema, { signal }) });
}

export function useConnectTelegram() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bot_token: string) => apiFetch("/api/bff/channels/telegram/connect", telegramResultSchema, { method: "POST", json: { bot_token } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: channelKeys(store).list }),
  });
}

export function useDisconnect() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: ConnectionCode) => apiFetch(`/api/bff/channels/${code}/disconnect`, z.object({ ok: z.literal(true) }), { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: channelKeys(store).list });
      void qc.invalidateQueries({ queryKey: storeKey(store, "inbox") });
    },
  });
}

export function useKeywords() {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).keywords, queryFn: ({ signal }) => apiFetch("/api/bff/channels/keywords", keywordListSchema, { signal }) });
}

export function useSaveKeyword() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: Partial<KeywordForm> & { is_active?: boolean } }) =>
      apiFetch(id ? `/api/bff/channels/keywords/${id}` : "/api/bff/channels/keywords", keywordSchema, { method: id ? "PATCH" : "POST", json: body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: channelKeys(store).keywords }),
  });
}

export function useDeleteKeyword() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/channels/keywords/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: channelKeys(store).keywords }),
  });
}

export function useTemplates(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).templates, queryFn: ({ signal }) => apiFetch("/api/bff/channels/templates", templateListSchema, { signal }), enabled, staleTime: 60_000 });
}

export function useSaveTemplate() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: TemplateForm }) =>
      apiFetch(id ? `/api/bff/channels/templates/${id}` : "/api/bff/channels/templates", templateSchema, { method: id ? "PATCH" : "POST", json: body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: channelKeys(store).templates }),
  });
}

export function useDeleteTemplate() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/channels/templates/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: channelKeys(store).templates }),
  });
}

export function useCatalogSync(code: "meta" | "tiktok") {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).sync(code), queryFn: ({ signal }) => apiFetch(`/api/bff/channels/${code}/catalog-sync`, catalogSyncSchema, { signal }) });
}

export function useSaveCatalogSync(code: "meta" | "tiktok") {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { scope: "all" | "selected_categories"; category_ids: number[]; price_adjustment_percent: string; stock_shield_enabled: boolean }) =>
      apiFetch(`/api/bff/channels/${code}/catalog-sync`, catalogSyncSchema, { method: "PUT", json: body }),
    onSuccess: (data) => qc.setQueryData(channelKeys(store).sync(code), data),
  });
}

export function useRunCatalogSync(code: "meta" | "tiktok") {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/bff/channels/${code}/catalog-sync/run`, catalogSyncSchema, { method: "POST" }),
    onSuccess: (data) => {
      qc.setQueryData(channelKeys(store).sync(code), data);
      void qc.invalidateQueries({ queryKey: storeKey(store, "channels", "products", code) });
    },
  });
}

export function useSyncProducts(code: "meta" | "tiktok", params: { sync_status?: string; page: number; page_size: number }) {
  const store = useStore();
  return useQuery({
    queryKey: channelKeys(store).products(code, params),
    queryFn: ({ signal }) => apiFetch(`/api/bff/channels/${code}/products`, syncProductListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useResyncProduct(code: "meta" | "tiktok") {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => apiFetch(`/api/bff/channels/${code}/products/${productId}/resync`, z.object({ product_id: z.number(), sync_status: z.string() }), { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: storeKey(store, "channels", "products", code) });
      void qc.invalidateQueries({ queryKey: channelKeys(store).sync(code) });
    },
  });
}

export function useTiktokCategories() {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).tiktokCats, queryFn: ({ signal }) => apiFetch("/api/bff/channels/tiktok/categories", tiktokCategoryListSchema, { signal }), staleTime: 300_000 });
}

export function useCategoryMapping() {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).mapping, queryFn: ({ signal }) => apiFetch("/api/bff/channels/tiktok/category-mapping", mappingListSchema, { signal }) });
}

export function useSaveMapping() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<{ category_id: number; external_category_id: string | null }>) =>
      apiFetch("/api/bff/channels/tiktok/category-mapping", mappingListSchema, { method: "PUT", json: rows }),
    onSuccess: (data) => qc.setQueryData(channelKeys(store).mapping, data),
  });
}

export function useStaffAccess() {
  const store = useStore();
  return useQuery({ queryKey: channelKeys(store).access, queryFn: ({ signal }) => apiFetch("/api/bff/channels/staff-access", accessSchema, { signal }) });
}

/** US-27.6: every toggle autosaves; the cache flips first and rolls back on failure. */
export function useSaveAccess() {
  const store = useStore();
  const qc = useQueryClient();
  const key = channelKeys(store).access;
  return useMutation({
    mutationFn: (rows: AccessRow[]) => apiFetch("/api/bff/channels/staff-access", accessSchema, { method: "PUT", json: rows }),
    onMutate: (rows) => {
      const prev = qc.getQueryData<StaffAccess>(key);
      qc.setQueryData<StaffAccess>(key, (old) =>
        old ? { ...old, rows: old.rows.map((r) => rows.find((x) => x.staff_id === r.staff_id && x.channel_code === r.channel_code) ?? r) } : old,
      );
      return { prev };
    },
    onError: (_e, _rows, ctx) => qc.setQueryData(key, ctx?.prev),
    onSuccess: (data) => {
      qc.setQueryData(key, data);
      void qc.invalidateQueries({ queryKey: storeKey(store, "inbox") });
    },
  });
}
