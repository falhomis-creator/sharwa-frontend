"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { PLATFORM_STORE, storeKey } from "@/lib/query-keys";
import {
  otpSentSchema,
  otpVerifiedSchema,
  requestsSchema,
  topupCreatedSchema,
  transactionListSchema,
  walletSchema,
  withdrawalCreatedSchema,
} from "@/features/sharwa-pay/schemas";
import { z } from "zod";

/**
 * M40 hooks on the PLATFORM origin: keys `["store", "platform", "sharwa-pay", …]`, and
 * `gcTime: 0` on every financial read (§11 IX) — leaving a screen drops its numbers, and
 * nothing financial is ever persisted in the browser.
 */
export const payKeys = {
  all: storeKey(PLATFORM_STORE, "sharwa-pay"),
  wallet: storeKey(PLATFORM_STORE, "sharwa-pay", "wallet"),
  transactions: (p: Record<string, string>) => storeKey(PLATFORM_STORE, "sharwa-pay", "transactions", p),
  requests: storeKey(PLATFORM_STORE, "sharwa-pay", "requests"),
};

const financial = { gcTime: 0, staleTime: 0, networkMode: "always" as const };

export function useWallet() {
  return useQuery({ queryKey: payKeys.wallet, queryFn: ({ signal }) => apiFetch("/api/bff/sharwa-pay/wallet", walletSchema, { signal }), ...financial });
}

export function useTransactions(params: Record<string, string>, enabled = true) {
  return useQuery({ queryKey: payKeys.transactions(params), queryFn: ({ signal }) => apiFetch("/api/bff/sharwa-pay/transactions", transactionListSchema, { query: params, signal }), enabled, ...financial });
}

export function useRequests() {
  return useQuery({ queryKey: payKeys.requests, queryFn: ({ signal }) => apiFetch("/api/bff/sharwa-pay/requests", requestsSchema, { signal }), ...financial });
}

export function useSendOtp() {
  return useMutation({ mutationFn: (phone: string) => apiFetch("/api/bff/sharwa-pay/otp/send", otpSentSchema, { method: "POST", json: { phone } }) });
}

export function useVerifyOtp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (b: { phone: string; code: string }) => apiFetch("/api/bff/sharwa-pay/otp/verify", otpVerifiedSchema, { method: "POST", json: b }),
    onSuccess: () => void client.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function useTopup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => apiFetch("/api/bff/sharwa-pay/topups", topupCreatedSchema, { method: "POST", body: form }),
    onSuccess: () => void client.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function useWithdraw() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (b: { amount: string; currency: string; payout_destination: string }) => apiFetch("/api/bff/sharwa-pay/withdrawals", withdrawalCreatedSchema, { method: "POST", json: b }),
    onSuccess: () => void client.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/bff/sharwa-pay/logout", z.unknown(), { method: "POST" }),
    onSettled: () => client.removeQueries({ queryKey: payKeys.all }),
  });
}
