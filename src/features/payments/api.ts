"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  duesResponseSchema,
  gatewaySchema,
  gatewaysResponseSchema,
  payoutAccountSchema,
  payoutAccountsResponseSchema,
  storePaymentsSchema,
  walletSchema,
  walletTransactionsResponseSchema,
  withdrawalCreatedSchema,
  withdrawalsResponseSchema,
  type AccountType,
  type Gateway,
  type PayoutAccount,
  type StorePayments,
} from "@/features/payments/schemas";

/** M14 data hooks — tenant-prefixed keys `[store, 'payments', …]`, Zod on every response. */
export type ListParams = Record<string, string | number | undefined>;

export function paymentKeys(store: string) {
  return {
    all: storeKey(store, "payments"),
    gateways: storeKey(store, "payments", "gateways"),
    store: storeKey(store, "payments", "store"),
    accounts: storeKey(store, "payments", "accounts"),
    accountsOf: (type: AccountType | "all") => storeKey(store, "payments", "accounts", type),
    wallet: storeKey(store, "payments", "wallet"),
    transactions: (params: ListParams) => storeKey(store, "payments", "wallet", "transactions", params),
    withdrawals: (params: ListParams) => storeKey(store, "payments", "wallet", "withdrawals", params),
    dues: (params: ListParams) => storeKey(store, "payments", "dues", params),
  };
}

export function useGateways() {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).gateways,
    queryFn: ({ signal }) => apiFetch("/api/bff/payments/gateways", gatewaysResponseSchema, { signal }),
  });
}

export function useStorePayments() {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).store,
    queryFn: ({ signal }) => apiFetch("/api/bff/store/payments", storePaymentsSchema, { signal }),
  });
}

export function usePatchStorePayments() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<StorePayments, "enable_sharwa_pay" | "enable_manual_payment">>) =>
      apiFetch("/api/bff/store/payments", storePaymentsSchema, { method: "PATCH", json: patch }),
    onSuccess: (data) => {
      client.setQueryData(paymentKeys(store).store, data);
      // The M34 settings section reads the same row.
      void client.invalidateQueries({ queryKey: storeKey(store, "settings") });
    },
  });
}

export function useSetGatewayEnabled() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ code, is_enabled }: { code: string; is_enabled: boolean }) =>
      apiFetch(`/api/bff/payments/gateways/${encodeURIComponent(code)}`, gatewaySchema, { method: "PATCH", json: { is_enabled } }),
    onSuccess: (g) => client.setQueryData<Gateway[]>(paymentKeys(store).gateways, (prev) => prev?.map((x) => (x.gateway_code === g.gateway_code ? g : x))),
  });
}

export function useSaveCredentials(code: string) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string>) =>
      apiFetch(`/api/bff/payments/gateways/${encodeURIComponent(code)}/credentials`, z.unknown(), { method: "PUT", json: values }),
    onSuccess: () => client.invalidateQueries({ queryKey: paymentKeys(store).gateways }),
  });
}

export function usePayoutAccounts(type: AccountType | "all") {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).accountsOf(type),
    queryFn: ({ signal }) =>
      apiFetch("/api/bff/payments/payout-accounts", payoutAccountsResponseSchema, { query: { account_type: type === "all" ? undefined : type }, signal }),
  });
}

function useInvalidateAccounts() {
  const store = useStore();
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: paymentKeys(store).accounts });
    void client.invalidateQueries({ queryKey: paymentKeys(store).store });
  };
}

export function useSaveAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, values }: { id: number | null; values: Partial<Omit<PayoutAccount, "id" | "sort_order">> }) =>
      id === null
        ? apiFetch("/api/bff/payments/payout-accounts", payoutAccountSchema, { method: "POST", json: values })
        : apiFetch(`/api/bff/payments/payout-accounts/${id}`, payoutAccountSchema, { method: "PATCH", json: values }),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/payments/payout-accounts/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export const paymentsApi = {
  reorderAccounts: (ordered_ids: number[]) =>
    apiFetch("/api/bff/payments/payout-accounts/reorder", z.array(payoutAccountSchema), { method: "POST", json: { ordered_ids } }),
};

export function useMerchantWallet() {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).wallet,
    queryFn: ({ signal }) => apiFetch("/api/bff/wallet", walletSchema, { signal }),
  });
}

export function useWalletTransactions(params: ListParams) {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).transactions(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/wallet/transactions", walletTransactionsResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useWithdrawals(params: ListParams) {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).withdrawals(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/wallet/withdrawals", withdrawalsResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateWithdrawal() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { currency: string; amount: string; payout_account_id: number; idempotency_key: string }) =>
      apiFetch("/api/bff/wallet/withdrawals", withdrawalCreatedSchema, {
        method: "POST",
        json: { currency: input.currency, amount: input.amount, payout_account_id: input.payout_account_id },
        idempotencyKey: input.idempotency_key,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: paymentKeys(store).wallet }),
  });
}

export function useDues(params: ListParams) {
  const store = useStore();
  return useQuery({
    queryKey: paymentKeys(store).dues(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/wallet/dues", duesResponseSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}
