"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  affiliateListSchema,
  affiliateSchema,
  influencerListSchema,
  influencerSchema,
  markPaidResultSchema,
  partnerSummarySchema,
  saleListSchema,
  type Affiliate,
  type Influencer,
  type PartnerKind,
  type PayoutStatus,
} from "@/features/affiliates/schemas";

/**
 * M17 hooks — keys `[tenant, 'partners', kind, …]`, Zod on every response (§11 IX).
 * Through `/api/bff/{affiliates,influencers}/*` (one catch-all each; live module `affiliates`).
 */
export interface PartnerListParams {
  q?: string;
  sort?: string;
  has_pending?: "true";
  [key: string]: string | number | undefined;
}

export function partnerKeys(store: string, kind: PartnerKind) {
  return {
    all: storeKey(store, "partners", kind),
    list: (p: PartnerListParams) => storeKey(store, "partners", kind, "list", p),
    summary: storeKey(store, "partners", kind, "summary"),
    detail: (id: number) => storeKey(store, "partners", kind, "detail", id),
    sales: (id: number, status?: PayoutStatus) => storeKey(store, "partners", kind, "sales", id, status ?? "all"),
  };
}

const base = (kind: PartnerKind) => `/api/bff/${kind}`;

export function useAffiliates(params: PartnerListParams, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: partnerKeys(store, "affiliates").list(params),
    queryFn: ({ signal }) => apiFetch(base("affiliates"), affiliateListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInfluencers(params: PartnerListParams, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: partnerKeys(store, "influencers").list(params),
    queryFn: ({ signal }) => apiFetch(base("influencers"), influencerListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePartnerSummary(kind: PartnerKind, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: partnerKeys(store, kind).summary,
    queryFn: ({ signal }) => apiFetch(`${base(kind)}/summary/`, partnerSummarySchema, { signal }),
    enabled,
    staleTime: 15_000,
  });
}

export function useAffiliate(id: number) {
  const store = useStore();
  return useQuery({ queryKey: partnerKeys(store, "affiliates").detail(id), queryFn: ({ signal }) => apiFetch(`${base("affiliates")}/${id}/`, affiliateSchema, { signal }) });
}

export function useInfluencer(id: number) {
  const store = useStore();
  return useQuery({ queryKey: partnerKeys(store, "influencers").detail(id), queryFn: ({ signal }) => apiFetch(`${base("influencers")}/${id}/`, influencerSchema, { signal }) });
}

export function usePartnerSales(kind: PartnerKind, id: number, status?: PayoutStatus) {
  const store = useStore();
  return useQuery({
    queryKey: partnerKeys(store, kind).sales(id, status),
    queryFn: ({ signal }) => apiFetch(`${base(kind)}/${id}/sales/`, saleListSchema, { query: { payout_status: status }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useSavePartner(kind: PartnerKind, id: number | null) {
  const store = useStore();
  const client = useQueryClient();
  const schema = kind === "affiliates" ? affiliateSchema : influencerSchema;
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(id === null ? `${base(kind)}/` : `${base(kind)}/${id}/`, schema as typeof affiliateSchema, { method: id === null ? "POST" : "PATCH", json: body }) as Promise<Affiliate | Influencer>,
    onSuccess: (data) => {
      client.setQueryData(partnerKeys(store, kind).detail(data.id), data);
      void client.invalidateQueries({ queryKey: partnerKeys(store, kind).all });
    },
  });
}

/** Preview (`dry_run`) and the write share one endpoint — the server totals both (FR-17.05). */
export function useMarkPaid(kind: PartnerKind, id: number) {
  const store = useStore();
  const client = useQueryClient();
  const commit = useMutation({
    mutationFn: (sale_ids: number[]) => apiFetch(`${base(kind)}/${id}/sales/mark-paid/`, markPaidResultSchema, { method: "POST", json: { sale_ids } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: partnerKeys(store, kind).all }),
  });
  const preview = (sale_ids: number[]) => apiFetch(`${base(kind)}/${id}/sales/mark-paid/`, markPaidResultSchema, { method: "POST", json: { sale_ids, dry_run: true } });
  return { preview, commit };
}
