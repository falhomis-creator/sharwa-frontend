"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  isLive,
  jobListSchema,
  jobRefSchema,
  jobSchema,
  listingListSchema,
  listingSchema,
  marketOrderListSchema,
  marketOrderSchema,
  marketRowSchema,
  settingsSchema,
  type Market,
} from "@/features/marketplaces/schemas";

/** M28 hooks — keys `[tenant, 'marketplaces', …]`; `/api/bff/marketplaces/*` (one catch-all). */
export type Params = Record<string, string | number | undefined>;
const BASE = "/api/bff/marketplaces";
const POLL_MS = 10_000;

export const mkKeys = (store: string) => ({
  all: storeKey(store, "marketplaces"),
  hub: storeKey(store, "marketplaces", "hub"),
  settings: (m: Market) => storeKey(store, "marketplaces", "settings", m),
  listings: (m: Market, p: Params) => storeKey(store, "marketplaces", "listings", m, p),
  jobs: (p: Params) => storeKey(store, "marketplaces", "jobs", p),
  job: (id: number) => storeKey(store, "marketplaces", "job", id),
  orders: (p: Params) => storeKey(store, "marketplaces", "orders", p),
});

export function useMarketHub() {
  const store = useStore();
  return useQuery({ queryKey: mkKeys(store).hub, queryFn: ({ signal }) => apiFetch(BASE, z.array(marketRowSchema), { signal }) });
}

export function useMarketSettings(m: Market) {
  const store = useStore();
  return useQuery({ queryKey: mkKeys(store).settings(m), queryFn: ({ signal }) => apiFetch(`${BASE}/${m}/settings`, settingsSchema, { signal }) });
}

function useInvalidate() {
  const store = useStore();
  const client = useQueryClient();
  return () => void client.invalidateQueries({ queryKey: mkKeys(store).all });
}

export function useSaveMarketSettings(m: Market) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (json: Record<string, unknown>) => apiFetch(`${BASE}/${m}/settings`, settingsSchema, { method: "PUT", json }),
    onSuccess: (data) => {
      client.setQueryData(mkKeys(store).settings(m), data);
      void client.invalidateQueries({ queryKey: storeKey(store, "marketplaces", "listings", m) });
    },
  });
}

export function useConnectNoon() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (json: { api_key: string; seller_id: string; marketplace_country: "SA" | "AE" }) => apiFetch(`${BASE}/noon/connect`, marketRowSchema, { method: "POST", json }),
    onSuccess: invalidate,
  });
}

export function useDisconnect() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (m: Market) => apiFetch(`${BASE}/${m}/disconnect`, marketRowSchema, { method: "POST" }), onSuccess: invalidate });
}

export function useListings(m: Market, params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: mkKeys(store).listings(m, params),
    queryFn: ({ signal }) => apiFetch(`${BASE}/${m}/listings`, listingListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function usePatchListing(m: Market) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...json }: { id: number } & Record<string, unknown>) => apiFetch(`${BASE}/${m}/listings/${id}`, listingSchema, { method: "PATCH", json }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: storeKey(store, "marketplaces", "listings", m) });
      void client.invalidateQueries({ queryKey: mkKeys(store).hub });
    },
  });
}

export function usePushListings(m: Market) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (ids: number[]) => apiFetch(`${BASE}/${m}/listings/push`, z.object({ job_id: z.number(), count: z.number() }), { method: "POST", json: { listing_ids: ids } }),
    onSuccess: invalidate,
  });
}

export function useTriggerJob() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ market, job_type }: { market: Market; job_type: "order_pull" | "fba_inventory" }) => apiFetch(`${BASE}/${market}/jobs`, jobRefSchema, { method: "POST", json: { job_type } }),
    onSuccess: invalidate,
  });
}

/** FR-28.07: polls every 10s while any visible job is queued/running; paused in a hidden tab. */
export function useJobs(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: mkKeys(store).jobs(params),
    queryFn: ({ signal }) => apiFetch(`${BASE}/jobs`, jobListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.results.some((j) => isLive(j.status)) ? POLL_MS : false),
  });
}

export function useJob(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: mkKeys(store).job(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`${BASE}/jobs/${id}`, jobSchema, { signal }),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data && isLive(q.state.data.status) ? POLL_MS : false),
  });
}

export function useMarketOrders(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: mkKeys(store).orders(params),
    queryFn: ({ signal }) => apiFetch(`${BASE}/orders`, marketOrderListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useConfirmShipment() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (orderId: number) => apiFetch(`${BASE}/orders/${orderId}/confirm-shipment`, marketOrderSchema, { method: "POST" }), onSuccess: invalidate });
}
