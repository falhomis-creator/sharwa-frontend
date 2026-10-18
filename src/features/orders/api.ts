"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  createOrderResponseSchema,
  orderCountersSchema,
  orderDetailSchema,
  orderFormOptionsSchema,
  orderListResponseSchema,
  orderStatusDefListSchema,
  orderStatusDefSchema,
  type OrderDetail,
  type OrderStatus,
} from "@/features/orders/schemas";

/**
 * M06 data hooks. Every key is tenant-prefixed (`storeKey`), every response Zod-parsed.
 * Writes carry the order's `version` (FR-06.06); a 409 surfaces as an `ApiError` with
 * status 409 that `useOrderWrite` turns into the conflict panel.
 */
export type OrderListParams = Record<string, string | number | undefined>;

export function orderKeys(store: string) {
  return {
    all: storeKey(store, "orders"),
    list: (params: OrderListParams) => storeKey(store, "orders", "list", params),
    lists: storeKey(store, "orders", "list"),
    detail: (id: number) => storeKey(store, "orders", "detail", id),
    counters: storeKey(store, "orders", "counters"),
    statuses: storeKey(store, "orders", "statuses"),
    formOptions: storeKey(store, "orders", "form-options"),
  };
}

export function useOrders(params: OrderListParams, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: orderKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/orders", orderListResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useOrder(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: orderKeys(store).detail(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/bff/orders/${id}`, orderDetailSchema, { signal }),
    enabled: id !== null,
  });
}

/** The «جديد / بانتظار دفع / …» strip — refreshed every 60s while visible (FR-06.12). */
export function useOrderCounters(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: orderKeys(store).counters,
    queryFn: ({ signal }) => apiFetch("/api/bff/orders/counters", orderCountersSchema, { signal }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled,
  });
}

export function useOrderStatuses() {
  const store = useStore();
  return useQuery({
    queryKey: orderKeys(store).statuses,
    queryFn: ({ signal }) => apiFetch("/api/bff/order-statuses", orderStatusDefListSchema, { signal }),
    staleTime: 60_000,
  });
}

export function useOrderFormOptions(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: orderKeys(store).formOptions,
    queryFn: ({ signal }) => apiFetch("/api/bff/orders/form-options", orderFormOptionsSchema, { signal }),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** After any write: put the fresh detail in the cache and refresh lists + counters + sidebar badge. */
export function useApplyOrder() {
  const store = useStore();
  const qc = useQueryClient();
  return (order: OrderDetail) => {
    qc.setQueryData(orderKeys(store).detail(order.id), order);
    void qc.invalidateQueries({ queryKey: orderKeys(store).lists });
    void qc.invalidateQueries({ queryKey: orderKeys(store).counters });
    void qc.invalidateQueries({ queryKey: storeKey(store, "dashboard") });
  };
}

const moved = z.object({ moved: z.number().int() });

export const ordersApi = {
  setFulfillment: (id: number, statusId: number, version: number) =>
    apiFetch(`/api/bff/orders/${id}/fulfillment-status`, orderDetailSchema, { method: "POST", json: { status_id: statusId, version } }),
  setStatus: (id: number, status: OrderStatus, version: number) =>
    apiFetch(`/api/bff/orders/${id}/status`, orderDetailSchema, { method: "POST", json: { status, version } }),
  payment: (id: number, action: "confirm" | "approve" | "reject", version: number) =>
    apiFetch(`/api/bff/orders/${id}/payment/${action}`, orderDetailSchema, { method: "POST", json: { version } }),
  refund: (id: number, body: { amount: string; method: string; reason: string }, version: number) =>
    apiFetch(`/api/bff/orders/${id}/refunds`, orderDetailSchema, { method: "POST", json: { ...body, version } }),
  patch: (id: number, body: Record<string, unknown>, version: number) =>
    apiFetch(`/api/bff/orders/${id}`, orderDetailSchema, { method: "PATCH", json: { ...body, version } }),
  create: (body: Record<string, unknown>) => apiFetch("/api/bff/orders", createOrderResponseSchema, { method: "POST", json: body }),
  saveStatus: (id: number | null, body: Record<string, unknown>) =>
    apiFetch(id === null ? "/api/bff/order-statuses" : `/api/bff/order-statuses/${id}`, orderStatusDefSchema, {
      method: id === null ? "POST" : "PATCH",
      json: body,
    }),
  deleteStatus: (id: number) => apiFetch(`/api/bff/order-statuses/${id}`, moved, { method: "DELETE" }),
  reorderStatuses: (ordered: number[]) =>
    apiFetch("/api/bff/order-statuses/reorder", orderStatusDefListSchema, { method: "POST", json: { ordered_ids: ordered } }),
};
