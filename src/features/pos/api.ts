"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch, type ApiFetchInit } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { usePosStore } from "@/features/pos/components/pos-provider";
import {
  approvalCreatedSchema,
  closeResultSchema,
  createOrderResultSchema,
  currentShiftSchema,
  posContextSchema,
  productSearchSchema,
  quoteSchema,
  receiptListSchema,
  receiptSchema,
  registersSchema,
  shiftSchema,
  type CartLineInput,
  type PosPaymentMethod,
} from "@/features/pos/schemas";

/**
 * M16 data hooks — keys `[tenant, 'pos', …]`, Zod on every response, every write carries
 * an `idempotency_key` and is re-sent ONCE on a network failure with the same key
 * (FR-16.10, SC-16.3): the server answers the replay with the first result, never a second order.
 */
const BASE = "/api/bff/pos";

export function posKeys(store: string) {
  return {
    all: storeKey(store, "pos"),
    context: storeKey(store, "pos", "context"),
    registers: (location: number | null) => storeKey(store, "pos", "registers", location),
    current: storeKey(store, "pos", "shift", "current"),
    pending: storeKey(store, "pos", "shift", "pending"),
    search: (q: string) => storeKey(store, "pos", "products", q),
    quote: (body: Record<string, unknown>) => storeKey(store, "pos", "quote", body),
    receipts: (q: string) => storeKey(store, "pos", "receipts", q),
    receipt: (id: number) => storeKey(store, "pos", "receipt", id),
  };
}

export function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** A thrown `TypeError` from `fetch` = the request never got an answer (offline, reset). */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

export async function sendOnceRetried<T>(path: string, schema: z.ZodType<T>, init: ApiFetchInit): Promise<T> {
  try {
    return await apiFetch(path, schema, init);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    await new Promise((r) => setTimeout(r, 800));
    return apiFetch(path, schema, init);
  }
}

export function usePosContext() {
  const store = usePosStore();
  return useQuery({ queryKey: posKeys(store).context, queryFn: ({ signal }) => apiFetch(`${BASE}/context`, posContextSchema, { signal }), staleTime: 60_000 });
}

export function useRegisters(location: number | null) {
  const store = usePosStore();
  return useQuery({
    queryKey: posKeys(store).registers(location),
    queryFn: ({ signal }) => apiFetch(`${BASE}/registers`, registersSchema, { query: { location: location ?? undefined }, signal }),
    enabled: location !== null,
  });
}

export function useCurrentShift() {
  const store = usePosStore();
  return useQuery({
    queryKey: posKeys(store).current,
    queryFn: ({ signal }) => apiFetch(`${BASE}/shifts/current`, currentShiftSchema, { signal }),
    select: (d) => d.shift,
    // A pending shift may be settled by a manager from the M18 queue: keep it fresh.
    refetchInterval: (q) => (q.state.data?.shift?.status === "pending_manager_approval" ? 10_000 : false),
  });
}

export function usePendingShifts(enabled: boolean) {
  const store = usePosStore();
  return useQuery({ queryKey: posKeys(store).pending, queryFn: ({ signal }) => apiFetch(`${BASE}/shifts/pending`, z.array(shiftSchema), { signal }), enabled });
}

function useInvalidate() {
  const store = usePosStore();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: posKeys(store).all });
}

export function useOpenShift() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { register_id: number; opening_float: string }) => sendOnceRetried(`${BASE}/shifts`, shiftSchema, { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useAddMovement(shiftId: number | undefined) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { movement_type: "cash_in" | "cash_out"; amount: string; note: string; idempotency_key: string }) =>
      sendOnceRetried(`${BASE}/shifts/${shiftId}/movements`, shiftSchema, { method: "POST", json: input, idempotencyKey: input.idempotency_key }),
    onSuccess: invalidate,
  });
}

export function useCloseShift(shiftId: number | undefined) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { actual_closing: string }) => sendOnceRetried(`${BASE}/shifts/${shiftId}/close`, closeResultSchema, { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useResolveVariance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { shiftId: number; decision: "approved" | "rejected"; version: number; note?: string }) =>
      apiFetch(`${BASE}/shifts/${input.shiftId}/resolve-variance`, shiftSchema, { method: "POST", json: { decision: input.decision, version: input.version, note: input.note } }),
    onSuccess: invalidate,
  });
}

export function useProductSearch(q: string) {
  const store = usePosStore();
  return useQuery({
    queryKey: posKeys(store).search(q),
    queryFn: ({ signal }) => apiFetch(`${BASE}/products`, productSearchSchema, { query: { q }, signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function lookupBarcode(barcode: string) {
  return apiFetch(`${BASE}/products`, productSearchSchema, { query: { barcode } });
}

export function useQuote(items: CartLineInput[], cartDiscount: string) {
  const store = usePosStore();
  const body = { items, cart_discount_percent: cartDiscount || undefined };
  return useQuery({
    queryKey: posKeys(store).quote(body),
    queryFn: ({ signal }) => apiFetch(`${BASE}/quote`, quoteSchema, { method: "POST", json: body, signal }),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useCreateOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    // Not TanStack's default «pause while offline»: a paused mutation dies with the tab. The
    // attempt fails visibly, the key stays persisted in the cart, and the till re-sends it on
    // reconnect (or after a reload) — same key, so never a second order (US-16.5.1).
    networkMode: "always",
    mutationFn: (input: {
      register_id: number;
      items: CartLineInput[];
      cart_discount_percent?: string;
      payment_method: PosPaymentMethod;
      idempotency_key: string;
      manager_code?: string;
      approval_id?: number;
    }) => sendOnceRetried(`${BASE}/orders`, createOrderResultSchema, { method: "POST", json: input, idempotencyKey: input.idempotency_key }),
    onSuccess: invalidate,
  });
}

export function useRequestDiscountApproval() {
  return useMutation({
    mutationFn: (input: { discount_percent: string; display_total?: string }) => apiFetch(`${BASE}/discount-approvals`, approvalCreatedSchema, { method: "POST", json: input }),
  });
}

export function useReceipts(q: string) {
  const store = usePosStore();
  return useQuery({ queryKey: posKeys(store).receipts(q), queryFn: ({ signal }) => apiFetch(`${BASE}/orders`, receiptListSchema, { query: { q }, signal }), placeholderData: keepPreviousData });
}

export function useReceipt(id: number) {
  const store = usePosStore();
  return useQuery({ queryKey: posKeys(store).receipt(id), queryFn: ({ signal }) => apiFetch(`${BASE}/orders/${id}`, receiptSchema, { signal }) });
}

export function useRefund(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { amount: string; otp_code?: string; idempotency_key: string }) =>
      sendOnceRetried(`${BASE}/orders/${id}/refund`, receiptSchema, { method: "POST", json: input, idempotencyKey: input.idempotency_key }),
    onSuccess: invalidate,
  });
}
