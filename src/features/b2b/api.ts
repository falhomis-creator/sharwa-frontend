"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { orderKeys } from "@/features/orders/api";
import { b2bCreatedSchema, b2bDraftListSchema, b2bOptionsSchema, b2bResolvedSchema, type B2bDecision } from "@/features/b2b/schemas";

/**
 * M36 hooks — keys `[tenant, 'b2b', …]`. The drafts are READY (`/api/v1/orders/b2b-*`,
 * transparent passthrough); only the form's choices come from `/api/bff/b2b/options`.
 */
export function b2bKeys(store: string) {
  return { all: storeKey(store, "b2b"), drafts: storeKey(store, "b2b", "drafts"), options: storeKey(store, "b2b", "options") };
}

/** FR-36.03: refreshed every 60 s and when the window regains focus. */
export function useB2bDrafts(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: b2bKeys(store).drafts,
    queryFn: ({ signal }) => apiFetch("/api/v1/orders/b2b-drafts/", b2bDraftListSchema, { signal }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useB2bOptions(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: b2bKeys(store).options, queryFn: ({ signal }) => apiFetch("/api/bff/b2b/options", b2bOptionsSchema, { signal }), staleTime: 60_000, enabled });
}

export interface B2bDraftPayload {
  customer_name: string;
  customer_phone: string;
  address: string;
  /** Ids and quantities only — no price ever leaves the browser (FR-36.01). */
  items: Array<{ product_id: number; quantity: number }>;
  approver_role_id?: number;
  location_id?: number;
  currency?: string;
}

export function useCreateB2bDraft() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: B2bDraftPayload) => apiFetch("/api/v1/orders/b2b-draft/", b2bCreatedSchema, { method: "POST", json: body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: b2bKeys(store).all });
      void client.invalidateQueries({ queryKey: orderKeys(store).all });
    },
  });
}

/** FR-36.04: `approval_id` + `approval_version` from the list — never the order id. */
export function useResolveB2b() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ approvalId, decision, version }: { approvalId: number; decision: B2bDecision; version: number }) =>
      apiFetch(`/api/v1/orders/b2b-draft/${approvalId}/resolve/`, b2bResolvedSchema, { method: "POST", json: { decision, version } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: b2bKeys(store).all });
      void client.invalidateQueries({ queryKey: orderKeys(store).all });
      void client.invalidateQueries({ queryKey: storeKey(store, "staff", "approvals") });
    },
  });
}
