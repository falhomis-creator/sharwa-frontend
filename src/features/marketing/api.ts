"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  abandonedCartListSchema,
  abandonedCartSchema,
  abandonedSettingsSchema,
  campaignListSchema,
  campaignPreviewSchema,
  campaignSchema,
  channelStatusListSchema,
  couponListSchema,
  couponSchema,
  eventListSchema,
  eventSchema,
  giftSchema,
  loyaltySchema,
  offerListSchema,
  offerSchema,
  summarySchema,
} from "@/features/marketing/schemas";

/**
 * M13 data hooks — tenant-prefixed keys, Zod-parsed responses, invalidation per entity.
 * Every write is an `ApiError` on failure; forms map `.fields` onto RHF (FR-13.02).
 */
type Params = Record<string, string | number | undefined>;
const BASE = "/api/bff/marketing";

export function marketingKeys(store: string) {
  const k = (...parts: Array<string | number | Params>) => storeKey(store, "marketing", ...parts);
  return {
    all: storeKey(store, "marketing"),
    summary: k("summary"),
    coupons: k("coupons"),
    couponList: (p: Params) => k("coupons", "list", p),
    coupon: (id: number) => k("coupons", "detail", id),
    offers: k("offers"),
    offerList: (p: Params) => k("offers", "list", p),
    offer: (id: number) => k("offers", "detail", id),
    carts: k("carts"),
    cartList: (p: Params) => k("carts", "list", p),
    cart: (id: number) => k("carts", "detail", id),
    cartSettings: k("carts", "settings"),
    campaigns: k("campaigns"),
    campaignList: (p: Params) => k("campaigns", "list", p),
    campaign: (id: number) => k("campaigns", "detail", id),
    campaignPreview: (id: number) => k("campaigns", "preview", id),
    channels: k("campaigns", "channels"),
    events: k("timeline"),
    eventList: (p: Params) => k("timeline", "list", p),
    loyalty: k("loyalty"),
    gifting: k("gifting"),
  };
}

function useInvalidate() {
  const qc = useQueryClient();
  const store = useStore();
  return (...keys: ReadonlyArray<readonly unknown[]>) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))).then(() => void qc.invalidateQueries({ queryKey: marketingKeys(store).summary }));
}

// ── Hub ─────────────────────────────────────────────────────────────────────
export function useMarketingSummary(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).summary, queryFn: ({ signal }) => apiFetch(`${BASE}/summary`, summarySchema, { signal }), enabled });
}

// ── Coupons ─────────────────────────────────────────────────────────────────
export function useCoupons(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).couponList(params), queryFn: ({ signal }) => apiFetch(`${BASE}/coupons`, couponListSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled: opts.enabled ?? true });
}
export function useCoupon(id: number | null) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).coupon(id ?? 0), queryFn: ({ signal }) => apiFetch(`${BASE}/coupons/${id}`, couponSchema, { signal }), enabled: id !== null });
}
export function useSaveCoupon(id: number | null) {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (json: Record<string, unknown>) => (id === null ? apiFetch(`${BASE}/coupons`, couponSchema, { method: "POST", json }) : apiFetch(`${BASE}/coupons/${id}`, couponSchema, { method: "PATCH", json })),
    onSuccess: () => invalidate(marketingKeys(store).coupons),
  });
}
export function useDeleteCoupon() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/coupons/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => invalidate(marketingKeys(store).coupons) });
}

// ── Offers ──────────────────────────────────────────────────────────────────
export function useOffers(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).offerList(params), queryFn: ({ signal }) => apiFetch(`${BASE}/offers`, offerListSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled: opts.enabled ?? true });
}
export function useOffer(id: number | null) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).offer(id ?? 0), queryFn: ({ signal }) => apiFetch(`${BASE}/offers/${id}`, offerSchema, { signal }), enabled: id !== null });
}
/** JSON normally; multipart `FormData` when an image file is attached (US-13.2.2). */
export function useSaveOffer(id: number | null) {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> | FormData) => {
      const init = payload instanceof FormData ? { body: payload } : { json: payload };
      return id === null ? apiFetch(`${BASE}/offers`, offerSchema, { method: "POST", ...init }) : apiFetch(`${BASE}/offers/${id}`, offerSchema, { method: "PATCH", ...init });
    },
    onSuccess: () => invalidate(marketingKeys(store).offers, marketingKeys(store).events),
  });
}
export function useDeleteOffer() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/offers/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => invalidate(marketingKeys(store).offers, marketingKeys(store).events) });
}

// ── Abandoned carts ─────────────────────────────────────────────────────────
export function useAbandonedCarts(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).cartList(params), queryFn: ({ signal }) => apiFetch(`${BASE}/abandoned-carts`, abandonedCartListSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled: opts.enabled ?? true });
}
export function useAbandonedCart(id: number | null) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).cart(id ?? 0), queryFn: ({ signal }) => apiFetch(`${BASE}/abandoned-carts/${id}`, abandonedCartSchema, { signal }), enabled: id !== null });
}
export function useRemindCart() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/abandoned-carts/${id}/remind`, abandonedCartSchema, { method: "POST", json: {} }), onSuccess: () => invalidate(marketingKeys(store).carts) });
}
export function useAbandonedSettings(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).cartSettings, queryFn: ({ signal }) => apiFetch(`${BASE}/abandoned-carts/settings`, abandonedSettingsSchema, { signal }), enabled });
}
export function useSaveAbandonedSettings() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (json: Record<string, unknown>) => apiFetch(`${BASE}/abandoned-carts/settings`, abandonedSettingsSchema, { method: "PATCH", json }), onSuccess: () => invalidate(marketingKeys(store).cartSettings) });
}

// ── Campaigns ───────────────────────────────────────────────────────────────
export function useCampaigns(params: Params, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).campaignList(params), queryFn: ({ signal }) => apiFetch(`${BASE}/campaigns`, campaignListSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled: opts.enabled ?? true });
}
export function useCampaign(id: number | null) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).campaign(id ?? 0), queryFn: ({ signal }) => apiFetch(`${BASE}/campaigns/${id}`, campaignSchema, { signal }), enabled: id !== null });
}
export function useCampaignPreview(id: number | null, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).campaignPreview(id ?? 0), queryFn: ({ signal }) => apiFetch(`${BASE}/campaigns/${id}/preview`, campaignPreviewSchema, { signal }), enabled: enabled && id !== null, staleTime: 0 });
}
export function useChannelStatuses(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).channels, queryFn: ({ signal }) => apiFetch(`${BASE}/campaigns/channels`, channelStatusListSchema, { signal }), enabled, staleTime: 5 * 60_000 });
}
export function useSaveCampaign(id: number | null) {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (json: Record<string, unknown>) => (id === null ? apiFetch(`${BASE}/campaigns`, campaignSchema, { method: "POST", json }) : apiFetch(`${BASE}/campaigns/${id}`, campaignSchema, { method: "PATCH", json })),
    onSuccess: () => invalidate(marketingKeys(store).campaigns, marketingKeys(store).events),
  });
}
export function useSendCampaign(id: number) {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (json: { schedule_at?: string }) => apiFetch(`${BASE}/campaigns/${id}/send`, campaignSchema, { method: "POST", json }), onSuccess: () => invalidate(marketingKeys(store).campaigns, marketingKeys(store).events) });
}

// ── Timeline ────────────────────────────────────────────────────────────────
export function useTimeline(params: Params = {}) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).eventList(params), queryFn: ({ signal }) => apiFetch(`${BASE}/timeline`, eventListSchema, { query: params, signal }), placeholderData: keepPreviousData });
}
export function useSaveEvent() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, json }: { id: number | null; json: Record<string, unknown> }) => (id === null ? apiFetch(`${BASE}/timeline`, eventSchema, { method: "POST", json }) : apiFetch(`${BASE}/timeline/${id}`, eventSchema, { method: "PATCH", json })),
    onSuccess: () => invalidate(marketingKeys(store).events),
  });
}
export function useDeleteEvent() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/timeline/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => invalidate(marketingKeys(store).events) });
}

// ── Loyalty · gifting ───────────────────────────────────────────────────────
export function useLoyaltySettings(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).loyalty, queryFn: ({ signal }) => apiFetch(`${BASE}/loyalty`, loyaltySchema, { signal }), enabled });
}
export function useSaveLoyalty() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (json: Record<string, unknown>) => apiFetch(`${BASE}/loyalty`, loyaltySchema, { method: "PATCH", json }), onSuccess: () => invalidate(marketingKeys(store).loyalty) });
}
export function useGifting(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: marketingKeys(store).gifting, queryFn: ({ signal }) => apiFetch(`${BASE}/gifting`, giftSchema, { signal }), enabled });
}
export function useSaveGifting() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (json: { is_enabled: boolean }) => apiFetch(`${BASE}/gifting`, giftSchema, { method: "PATCH", json }), onSuccess: () => invalidate(marketingKeys(store).gifting) });
}
