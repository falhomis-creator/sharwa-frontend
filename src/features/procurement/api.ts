"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  formOptionsSchema,
  lineProductSchema,
  poDetailSchema,
  poListSchema,
  submitResultSchema,
  supplierListSchema,
  supplierSchema,
  type PoDetail,
  type SupplierForm,
} from "@/features/procurement/schemas";

/**
 * M23 data hooks — keys `[tenant, 'procurement', …]`; Zod on every response. All rows are
 * `[NEEDS BACKEND]` → `/api/bff/{suppliers,purchase-orders}/*` (one catch-all each).
 */
export type Params = Record<string, string | number | undefined>;

export function procurementKeys(store: string) {
  return {
    all: storeKey(store, "procurement"),
    suppliers: (params: Params) => storeKey(store, "procurement", "suppliers", params),
    supplier: (id: number) => storeKey(store, "procurement", "supplier", id),
    orders: (params: Params) => storeKey(store, "procurement", "orders", params),
    order: (id: number) => storeKey(store, "procurement", "order", id),
    options: storeKey(store, "procurement", "options"),
    products: (q: string) => storeKey(store, "procurement", "products", q),
  };
}

export function useSuppliers(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: procurementKeys(store).suppliers(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/suppliers", supplierListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useSupplier(id: number) {
  const store = useStore();
  return useQuery({
    queryKey: procurementKeys(store).supplier(id),
    queryFn: ({ signal }) => apiFetch(`/api/bff/suppliers/${id}`, supplierSchema, { signal }),
    enabled: id > 0,
  });
}

export function useSaveSupplier(id: number | null) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: SupplierForm) =>
      apiFetch(id ? `/api/bff/suppliers/${id}` : "/api/bff/suppliers", supplierSchema, { method: id ? "PATCH" : "POST", json: values }),
    onSuccess: (data) => {
      client.setQueryData(procurementKeys(store).supplier(data.id), data);
      void client.invalidateQueries({ queryKey: procurementKeys(store).all });
    },
  });
}

export function useDeleteSupplier() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/suppliers/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: procurementKeys(store).all }),
  });
}

export function usePurchaseOrders(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: procurementKeys(store).orders(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/purchase-orders", poListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function usePurchaseOrder(id: number) {
  const store = useStore();
  return useQuery({
    queryKey: procurementKeys(store).order(id),
    queryFn: ({ signal }) => apiFetch(`/api/bff/purchase-orders/${id}`, poDetailSchema, { signal }),
    enabled: id > 0,
  });
}

export function usePoFormOptions() {
  const store = useStore();
  return useQuery({
    queryKey: procurementKeys(store).options,
    queryFn: ({ signal }) => apiFetch("/api/bff/purchase-orders/form-options", formOptionsSchema, { signal }),
    staleTime: 60_000,
  });
}

export function useLineProducts(q: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: procurementKeys(store).products(q),
    queryFn: ({ signal }) => apiFetch("/api/bff/purchase-orders/products", z.array(lineProductSchema), { query: { q }, signal }),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

function useApply() {
  const store = useStore();
  const client = useQueryClient();
  return (data: PoDetail) => {
    client.setQueryData(procurementKeys(store).order(data.id), data);
    void client.invalidateQueries({ queryKey: storeKey(store, "procurement", "orders") });
    void client.invalidateQueries({ queryKey: storeKey(store, "procurement", "suppliers") });
  };
}

export function useSavePo(id: number | null) {
  const apply = useApply();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch(id ? `/api/bff/purchase-orders/${id}` : "/api/bff/purchase-orders", poDetailSchema, { method: id ? "PATCH" : "POST", json: payload }),
    onSuccess: apply,
  });
}

export function useSubmitPo() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) => apiFetch(`/api/bff/purchase-orders/${id}/submit`, submitResultSchema, { method: "POST", json: { version } }),
    onSuccess: (d, v) => {
      // Patch the cached detail first so the order page never flashes the stale draft.
      client.setQueryData<PoDetail>(procurementKeys(store).order(v.id), (old) => (old ? { ...old, status: d.status, version: d.version, approval: { id: d.approval_id, status: "pending", approver: null, approver_role: old.approval?.approver_role ?? "" } } : old));
      void client.invalidateQueries({ queryKey: procurementKeys(store).all });
      void client.invalidateQueries({ queryKey: storeKey(store, "approvals") });
      void client.invalidateQueries({ queryKey: procurementKeys(store).order(v.id) });
    },
  });
}

/** FR-23.05 — `version` always sent; 409 handled by the caller (never auto-retried). */
export function usePoAction(action: "resolve" | "receive" | "cancel") {
  const store = useStore();
  const client = useQueryClient();
  const apply = useApply();
  return useMutation({
    mutationFn: ({ id, ...json }: { id: number; version: number } & Record<string, unknown>) =>
      apiFetch(`/api/bff/purchase-orders/${id}/${action}`, poDetailSchema, { method: "POST", json }),
    onSuccess: (data) => {
      apply(data);
      if (action === "receive") void client.invalidateQueries({ queryKey: storeKey(store, "inventory") });
      void client.invalidateQueries({ queryKey: storeKey(store, "approvals") });
    },
  });
}
