"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { orderListResponseSchema } from "@/features/orders/schemas";
import {
  customerDetailSchema,
  customerListResponseSchema,
  noteSchema,
  notesSchema,
  pointsTabSchema,
  productOptionsSchema,
  reviewSchema,
  reviewsTabSchema,
  segmentCountSchema,
  storeReliabilitySchema,
  walletTabSchema,
  wishlistTabSchema,
} from "@/features/customers/schemas";

/**
 * M07 hooks. Keys are tenant-prefixed and carry the NORMALISED phone (constitution IX);
 * every response is Zod-parsed. The phone travels in the path (`/customers/<phone>/…`),
 * never in a query string except the user's own `q`.
 */
export type CustomerListParams = Record<string, string | number | undefined>;

export function customerKeys(store: string) {
  return {
    all: storeKey(store, "customers"),
    lists: storeKey(store, "customers", "list"),
    list: (params: CustomerListParams) => storeKey(store, "customers", "list", params),
    segment: (segment: string, productId: string) => storeKey(store, "customers", "segment-count", segment, productId),
    detail: (phone: string) => storeKey(store, "customers", "detail", phone),
    tab: (phone: string, tab: string) => storeKey(store, "customers", "detail", phone, tab),
  };
}

const path = (phone: string, rest = "") => `/api/bff/customers/${encodeURIComponent(phone)}${rest}`;

export function useCustomers(params: CustomerListParams, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/customers", customerListResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSegmentCount(segment: string, productId: string, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).segment(segment, productId),
    queryFn: ({ signal }) => apiFetch("/api/bff/customers/segments/count", segmentCountSchema, { query: { segment, product_id: productId || undefined }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCustomer(phone: string | null) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).detail(phone ?? ""),
    queryFn: ({ signal }) => apiFetch(path(phone!), customerDetailSchema, { signal }),
    enabled: Boolean(phone),
    retry: (count, err) => !(err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) && count < 2,
  });
}

export function useCustomerOrders(phone: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).tab(phone, "orders"),
    queryFn: ({ signal }) => apiFetch(path(phone, "/orders"), orderListResponseSchema, { query: { page_size: 20 }, signal }),
    enabled,
  });
}

export function useCustomerWallet(phone: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).tab(phone, "wallet"),
    queryFn: ({ signal }) => apiFetch(path(phone, "/wallet/transactions"), walletTabSchema, { signal }),
    enabled,
  });
}

export function useCustomerPoints(phone: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).tab(phone, "points"),
    queryFn: ({ signal }) => apiFetch(path(phone, "/points"), pointsTabSchema, { signal }),
    enabled,
  });
}

export function useCustomerWishlist(phone: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).tab(phone, "wishlist"),
    queryFn: ({ signal }) => apiFetch(path(phone, "/wishlist"), wishlistTabSchema, { signal }),
    enabled,
  });
}

export function useCustomerReviews(phone: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).tab(phone, "reviews"),
    queryFn: ({ signal }) => apiFetch(path(phone, "/reviews"), reviewsTabSchema, { signal }),
    enabled,
  });
}

export function useCustomerNotes(phone: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: customerKeys(store).tab(phone, "notes"),
    queryFn: ({ signal }) => apiFetch(path(phone, "/notes"), notesSchema, { signal }),
    enabled,
  });
}

export function useProductOptions(q: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: storeKey(store, "customers", "product-options", q),
    queryFn: ({ signal }) => apiFetch("/api/bff/products", productOptionsSchema, { query: { q, page_size: 8 }, signal }),
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30_000,
  });
}

/** Writes refresh the profile (all tabs) and the list (COD flag, counts). */
function useInvalidateCustomer(phone: string) {
  const store = useStore();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: customerKeys(store).detail(phone) });
    void qc.invalidateQueries({ queryKey: customerKeys(store).lists });
  };
}

export function useSetCod(phone: string) {
  const invalidate = useInvalidateCustomer(phone);
  return useMutation({
    mutationFn: (body: { cod_disabled: boolean; reason: string }) => apiFetch(path(phone, "/cod"), storeReliabilitySchema, { method: "POST", json: body }),
    onSuccess: invalidate,
  });
}

export function useAddNote(phone: string) {
  const invalidate = useInvalidateCustomer(phone);
  return useMutation({
    mutationFn: (body: { body: string }) => apiFetch(path(phone, "/notes"), noteSchema, { method: "POST", json: body }),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(phone: string) {
  const invalidate = useInvalidateCustomer(phone);
  return useMutation({
    mutationFn: (id: number) => apiFetch(path(phone, `/notes/${id}`), z.unknown(), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/** INT-029 (M42): a storefront review waits for the merchant's approval before it is listed. */
export function useApproveReview(phone: string) {
  const invalidate = useInvalidateCustomer(phone);
  return useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) => apiFetch(`/api/bff/reviews/${id}`, reviewSchema, { method: "PATCH", json: { approved } }),
    onSuccess: invalidate,
  });
}

export function useReplyReview(phone: string) {
  const invalidate = useInvalidateCustomer(phone);
  return useMutation({
    mutationFn: ({ id, admin_reply }: { id: number; admin_reply: string }) => apiFetch(`/api/bff/reviews/${id}`, reviewSchema, { method: "PATCH", json: { admin_reply } }),
    onSuccess: invalidate,
  });
}
