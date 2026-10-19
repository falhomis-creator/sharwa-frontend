"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  catalogListSchema,
  connectionDetailSchema,
  connectionSchema,
  connectionsSchema,
  feedSchema,
  isLive,
  jobListSchema,
  jobRefSchema,

  metaSchema,
  previewSchema,
  ruleSchema,
  simulationSchema,
  supplierOrderListSchema,
  supplierOrderSchema,
  type SupplierCode,
} from "@/features/dropshipping/schemas";

/** M29 hooks — keys `[tenant, 'dropshipping', …]`; `/api/bff/dropshipping/*` (one catch-all). */
export type Params = Record<string, string | number | undefined>;
const BASE = "/api/bff/dropshipping";
const POLL_MS = 10_000;
const k = (store: string, ...p: Array<string | number | Params>) => storeKey(store, "dropshipping", ...p);

function useInvalidate() {
  const store = useStore();
  const client = useQueryClient();
  return () => void client.invalidateQueries({ queryKey: k(store) });
}

export function useDropMeta() {
  const store = useStore();
  return useQuery({ queryKey: k(store, "meta"), queryFn: ({ signal }) => apiFetch(`${BASE}/meta`, metaSchema, { signal }), staleTime: Infinity });
}

export function useConnections() {
  const store = useStore();
  return useQuery({ queryKey: k(store, "suppliers"), queryFn: ({ signal }) => apiFetch(`${BASE}/suppliers`, connectionsSchema, { signal }) });
}

export function useConnection(code: SupplierCode) {
  const store = useStore();
  return useQuery({ queryKey: k(store, "supplier", code), queryFn: ({ signal }) => apiFetch(`${BASE}/suppliers/${code}`, connectionDetailSchema, { signal }) });
}

export function useConnect(code: SupplierCode) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (credentials: Record<string, string>) => apiFetch(`${BASE}/suppliers/${code}/connect`, connectionSchema, { method: "POST", json: { credentials } }), onSuccess: invalidate });
}

export function useDisconnectSupplier(code: SupplierCode) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => apiFetch(`${BASE}/suppliers/${code}/disconnect`, connectionSchema, { method: "POST" }), onSuccess: invalidate });
}

export function useSaveSyncSettings(code: SupplierCode) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (json: Record<string, unknown>) => apiFetch(`${BASE}/suppliers/${code}/settings`, connectionSchema, { method: "PUT", json }), onSuccess: invalidate });
}

export function useSyncInventory() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (code: SupplierCode) => apiFetch(`${BASE}/suppliers/${code}/sync-inventory`, jobRefSchema, { method: "POST" }), onSuccess: invalidate });
}

export function useRotateWebhook(code: SupplierCode) {
  return useMutation({ mutationFn: () => apiFetch(`${BASE}/suppliers/${code}/webhook/rotate`, z.object({ webhook_url: z.string() }), { method: "POST" }) });
}

export function useRules() {
  const store = useStore();
  return useQuery({ queryKey: k(store, "rules"), queryFn: ({ signal }) => apiFetch(`${BASE}/pricing-rules`, z.array(ruleSchema), { signal }) });
}

export function useSaveRule(id: number | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (json: Record<string, unknown>) => apiFetch(id ? `${BASE}/pricing-rules/${id}` : `${BASE}/pricing-rules`, ruleSchema, { method: id ? "PATCH" : "POST", json }),
    onSuccess: invalidate,
  });
}

export function useDeleteRule() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/pricing-rules/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: invalidate });
}

export function useSimulateRule() {
  return useMutation({ mutationFn: (rule: Record<string, unknown>) => apiFetch(`${BASE}/pricing-rules/simulate`, simulationSchema, { method: "POST", json: { rule, id: rule.id } }) });
}

export function useApplyRule() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/pricing-rules/${id}/apply`, z.object({ updated: z.number() }), { method: "POST" }), onSuccess: invalidate });
}

/** FR-29.05: polls while any visible row is `importing`. */
export function useSupplierCatalog(code: SupplierCode, params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: k(store, "catalog", code, params),
    queryFn: ({ signal }) => apiFetch(`${BASE}/suppliers/${code}/catalog`, catalogListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.results.some((r) => r.import_status === "importing") ? POLL_MS : false),
  });
}

export function useImportProducts(code: SupplierCode) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (ids: number[]) => apiFetch(`${BASE}/suppliers/${code}/import`, z.object({ job_id: z.number(), count: z.number() }), { method: "POST", json: { supplier_product_ids: ids } }),
    onSuccess: invalidate,
  });
}

export function useFeeds() {
  const store = useStore();
  return useQuery({
    queryKey: k(store, "feeds"),
    queryFn: ({ signal }) => apiFetch(`${BASE}/feeds`, z.array(feedSchema), { signal }),
    refetchInterval: (q) => (q.state.data?.some((f) => f.status === "running") ? POLL_MS : false),
  });
}

export function useFeed(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: k(store, "feed", id ?? 0),
    queryFn: ({ signal }) => apiFetch(`${BASE}/feeds/${id}`, feedSchema, { signal }),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.status === "running" || (q.state.data?.last_job && isLive(q.state.data.last_job.status)) ? 3_000 : false),
  });
}

export function useCreateFeed() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { file: File; name?: string } | { url: string; name?: string }) => {
      if ("file" in input) {
        const form = new FormData();
        form.set("file", input.file);
        if (input.name) form.set("name", input.name);
        return apiFetch(`${BASE}/feeds`, feedSchema, { method: "POST", body: form });
      }
      return apiFetch(`${BASE}/feeds`, feedSchema, { method: "POST", json: input });
    },
    onSuccess: invalidate,
  });
}

export function useFeedAction() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, json }: { id: number; action: "mapping" | "approve" | "run" | "patch"; json?: Record<string, unknown> }) => {
      if (action === "mapping") return apiFetch(`${BASE}/feeds/${id}/mapping`, feedSchema, { method: "PUT", json });
      if (action === "approve") return apiFetch(`${BASE}/feeds/${id}/approve`, feedSchema, { method: "POST" });
      if (action === "patch") return apiFetch(`${BASE}/feeds/${id}`, feedSchema, { method: "PATCH", json });
      return apiFetch(`${BASE}/feeds/${id}/run`, jobRefSchema, { method: "POST" });
    },
    onSuccess: (_d, v) => {
      void client.invalidateQueries({ queryKey: k(store, "feed", v.id) });
      void client.invalidateQueries({ queryKey: k(store, "feeds") });
      void client.invalidateQueries({ queryKey: k(store, "preview", v.id) });
      void client.invalidateQueries({ queryKey: k(store, "jobs") });
    },
  });
}

export function useFeedPreview(id: number | null, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: k(store, "preview", id ?? 0), queryFn: ({ signal }) => apiFetch(`${BASE}/feeds/${id}/preview`, previewSchema, { signal }), enabled: Boolean(id) && enabled, retry: false });
}

export function useSupplierOrders(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: k(store, "orders", params),
    queryFn: ({ signal }) => apiFetch(`${BASE}/orders`, supplierOrderListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useResubmitOrder() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/orders/${id}/resubmit`, supplierOrderSchema, { method: "POST" }), onSuccess: invalidate });
}

/** FR-29.09: 10s polling while a job is live; React Query pauses in a hidden tab. */
export function useDropJobs(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: k(store, "jobs", params),
    queryFn: ({ signal }) => apiFetch(`${BASE}/jobs`, jobListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.results.some((j) => isLive(j.status)) ? POLL_MS : false),
  });
}

export function useRetryJob() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/jobs/${id}/retry`, jobRefSchema, { method: "POST" }), onSuccess: invalidate });
}

