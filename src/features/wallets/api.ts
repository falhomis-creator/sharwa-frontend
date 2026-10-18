"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  loyaltyProgramSchema,
  pointsListResponseSchema,
  pointsTransactionsResponseSchema,
  topupResponseSchema,
  walletDetailSchema,
  walletListResponseSchema,
  walletTransactionsResponseSchema,
  type ManualReason,
  type WalletDetail,
} from "@/features/wallets/schemas";

/** M35 data hooks — tenant-prefixed keys `[store, 'wallets', …]` (constitution IX), Zod on every response. */
export type ListParams = Record<string, string | number | undefined>;

export function walletKeys(store: string) {
  return {
    all: storeKey(store, "wallets"),
    list: (params: ListParams) => storeKey(store, "wallets", "list", params),
    detail: (id: number) => storeKey(store, "wallets", "detail", id),
    transactions: (id: number, params: ListParams) => storeKey(store, "wallets", "detail", id, "transactions", params),
    points: (params: ListParams) => storeKey(store, "wallets", "points", params),
    pointsOf: (phone: string, params: ListParams) => storeKey(store, "wallets", "points", phone, params),
    program: storeKey(store, "wallets", "loyalty-program"),
  };
}

export function useWallets(params: ListParams, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: walletKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/customers/wallets", walletListResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useWallet(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: walletKeys(store).detail(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/bff/customers/wallets/${id}`, walletDetailSchema, { signal }),
    enabled: id !== null,
  });
}

export function useWalletTransactions(id: number | null, params: ListParams) {
  const store = useStore();
  return useQuery({
    queryKey: walletKeys(store).transactions(id ?? 0, params),
    queryFn: ({ signal }) => apiFetch(`/api/bff/customers/wallets/${id}/transactions`, walletTransactionsResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: id !== null,
  });
}

export function useLoyaltyProgram(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: walletKeys(store).program,
    queryFn: ({ signal }) => apiFetch("/api/bff/loyalty/program", loyaltyProgramSchema, { signal }),
    staleTime: 60_000,
    enabled,
  });
}

export function usePointsList(params: ListParams, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: walletKeys(store).points(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/loyalty/points", pointsListResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function usePointsOf(phone: string | null, params: ListParams, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: walletKeys(store).pointsOf(phone ?? "", params),
    queryFn: ({ signal }) => apiFetch(`/api/bff/loyalty/points/${encodeURIComponent(phone ?? "")}/transactions`, pointsTransactionsResponseSchema, { query: params, signal }),
    enabled: enabled && Boolean(phone),
  });
}

export function useCreateWallet() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { customer_phone: string; customer_name?: string }) => apiFetch("/api/bff/customers/wallets", walletDetailSchema, { method: "POST", json: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: walletKeys(store).all }),
  });
}

/** Top-up / reward / adjustment: idempotent per opening of the form (FR-35.09). */
export function useTopup(walletId: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: string; reason: ManualReason; note?: string; idempotency_key: string }) =>
      apiFetch(`/api/bff/customers/wallets/${walletId}/topup`, topupResponseSchema, { method: "POST", json: input, idempotencyKey: input.idempotency_key }),
    onSuccess: (data) => {
      client.setQueryData<WalletDetail>(walletKeys(store).detail(walletId), (prev) => (prev ? { ...prev, display_balance: data.display_balance } : prev));
      void client.invalidateQueries({ queryKey: walletKeys(store).all });
    },
  });
}
