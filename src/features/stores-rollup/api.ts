"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { rollupSchema } from "@/features/stores-rollup/schemas";

/**
 * M43 hooks. Keys are prefixed with the CURRENT tenant (constitution VIII): each store's
 * dashboard caches its own copy, nothing is shared across origins.
 */
export function rollupKeys(store: string) {
  return {
    all: storeKey(store, "merchant", "stores"),
    range: (from: string, to: string) => storeKey(store, "merchant", "stores", { from, to }),
  };
}

export function useRollup(range: { from: string; to: string }) {
  const store = useStore();
  return useQuery({
    queryKey: rollupKeys(store).range(range.from, range.to),
    queryFn: ({ signal }) => apiFetch("/api/bff/merchant/stores", rollupSchema, { query: { from: range.from, to: range.to }, signal }),
    placeholderData: keepPreviousData,
  });
}

/** The switcher's read (no date filter), cached under the tenant for 5 minutes (§7). */
export function useLinkedStores() {
  const store = useStore();
  const session = useSession();
  return useQuery({
    queryKey: rollupKeys(store).range("", ""),
    queryFn: ({ signal }) => apiFetch("/api/bff/merchant/stores", rollupSchema, { signal }),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: session.kind === "merchant",
  });
}
