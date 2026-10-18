"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { orderKeys } from "@/features/orders/api";
import {
  RETURN_STATUSES,
  orderRefundListSchema,
  returnDetailSchema,
  returnListSchema,
  returnOptionsSchema,
  returnableItemsSchema,
  rmaListSchema,
  rmaSchema,
  type QaDecision,
  type ReturnDetail,
  type ReturnRefundMethod,
  type Rma,
} from "@/features/returns/schemas";

/**
 * M24 data hooks — keys `[tenant, 'returns', …]` (§11 IX), Zod on every response.
 * Ready rows go through the transparent `/api/v1/*` passthrough; `[NEEDS BACKEND]` rows
 * (RMA list/detail, the OrderRefund log) through `/api/bff/*`.
 */
export type Params = Record<string, string | number | undefined>;

export function returnKeys(store: string) {
  return {
    all: storeKey(store, "returns"),
    lists: storeKey(store, "returns", "list"),
    list: (params: Params) => storeKey(store, "returns", "list", params),
    count: (status: string) => storeKey(store, "returns", "list", "count", status),
    detail: (id: number) => storeKey(store, "returns", "detail", id),
    items: (orderId: number) => storeKey(store, "returns", "items", orderId),
    rmas: (params: Params) => storeKey(store, "returns", "rma", "list", params),
    rma: (id: number) => storeKey(store, "returns", "rma", "detail", id),
    refunds: (params: Params) => storeKey(store, "returns", "refunds", params),
    options: storeKey(store, "returns", "options"),
  };
}

export function useReturns(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/v1/returns/", returnListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

/** The five counts of the text strip: one `?status=` request each, reading DRF's `count`. */
export function useReturnCounts(enabled: boolean) {
  const store = useStore();
  const results = useQueries({
    queries: RETURN_STATUSES.map((status) => ({
      queryKey: returnKeys(store).count(status),
      queryFn: ({ signal }: { signal: AbortSignal }) => apiFetch("/api/v1/returns/", returnListSchema, { query: { status }, signal }),
      enabled,
      staleTime: 15_000,
    })),
  });
  return Object.fromEntries(RETURN_STATUSES.map((s, i) => [s, results[i]?.data?.count])) as Record<(typeof RETURN_STATUSES)[number], number | undefined>;
}

export function useReturn(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).detail(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/v1/returns/${id}/`, returnDetailSchema, { signal }),
    enabled: id !== null && id > 0,
  });
}

export function useReturnableItems(orderId: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).items(orderId ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/v1/returns/order/${orderId}/items/`, returnableItemsSchema, { signal }),
    enabled: orderId !== null && orderId > 0,
    retry: false,
  });
}

export function useReturnOptions() {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).options,
    queryFn: ({ signal }) => apiFetch("/api/bff/returns/options", returnOptionsSchema, { signal }),
    staleTime: 60_000,
  });
}

export interface CreateReturnPayload {
  order_id: number;
  reason: string;
  refund_method: ReturnRefundMethod;
  line_items: Array<{ fulfillment_item_id: number; quantity_returned: number; restock: boolean }>;
}

export function useCreateReturn() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => apiFetch("/api/v1/returns/", returnDetailSchema, { method: "POST", json: payload }),
    onSuccess: (data: ReturnDetail) => {
      client.setQueryData(returnKeys(store).detail(data.id), data);
      void client.invalidateQueries({ queryKey: returnKeys(store).lists });
      void client.invalidateQueries({ queryKey: returnKeys(store).items(data.order_id) });
      void client.invalidateQueries({ queryKey: orderKeys(store).detail(data.order_id) });
    },
  });
}

export interface DecisionPayload {
  decision: "approve" | "reject";
  version: number;
  location_id?: number;
  note?: string;
}

/** FR-24.03 — never retried automatically (React Query mutations do not retry by default). */
export function useDecideReturn(id: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: DecisionPayload) => apiFetch(`/api/v1/returns/${id}/approve/`, returnDetailSchema, { method: "POST", json: payload }),
    onSuccess: (data: ReturnDetail) => {
      client.setQueryData(returnKeys(store).detail(id), data);
      void client.invalidateQueries({ queryKey: returnKeys(store).lists });
      // §11 IX: the M06 order detail (its timeline and amounts) after a decision.
      void client.invalidateQueries({ queryKey: orderKeys(store).detail(data.order_id) });
      void client.invalidateQueries({ queryKey: storeKey(store, "inventory") });
    },
  });
}

export function useRmas(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).rmas(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/returns/rma", rmaListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useRma(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).rma(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/bff/returns/rma/${id}`, rmaSchema, { signal }),
    enabled: id !== null && id > 0,
  });
}

function useRmaWrite() {
  const store = useStore();
  const client = useQueryClient();
  return (data: Rma) => {
    client.setQueryData(returnKeys(store).rma(data.id), data);
    void client.invalidateQueries({ queryKey: storeKey(store, "returns", "rma", "list") });
  };
}

export function useCreateRma() {
  const apply = useRmaWrite();
  return useMutation({
    mutationFn: (payload: { order_id: number; fulfillment_item_id: number; destination_location_id: number; quantity?: number; reason: string }) =>
      apiFetch("/api/v1/returns/rma/create/", rmaSchema, { method: "POST", json: payload }),
    onSuccess: apply,
  });
}

export function useScanRma() {
  const apply = useRmaWrite();
  return useMutation({
    mutationFn: (payload: { rma_id: number; location_id: number }) => apiFetch("/api/v1/warehouse/returns/scan/", rmaSchema, { method: "POST", json: payload }),
    onSuccess: apply,
  });
}

export function useQaDecision() {
  const store = useStore();
  const client = useQueryClient();
  const apply = useRmaWrite();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: QaDecision }) =>
      apiFetch(`/api/v1/warehouse/returns/${id}/qa-decision/`, rmaSchema, { method: "POST", json: { decision } }),
    onSuccess: (data: Rma) => {
      apply(data);
      void client.invalidateQueries({ queryKey: storeKey(store, "inventory") });
    },
  });
}

export function useOrderRefunds(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: returnKeys(store).refunds(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/orders/refunds", orderRefundListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}
