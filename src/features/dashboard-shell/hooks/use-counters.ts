"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { countersSchema, type Counters } from "@/features/dashboard-shell/schemas";
import type { CounterKey } from "@/features/dashboard-shell/navigation";

/**
 * The four sidebar badges in ONE request every 60s, never while the tab is hidden
 * (M03 FR-03.12, constitution IX). The key is tenant-prefixed, so switching stores
 * cannot show another store's counts (FR-03.14).
 */
export function useCounters(store: string) {
  return useQuery({
    queryKey: storeKey(store, "dashboard", "counters"),
    queryFn: () => apiFetch("/api/bff/dashboard/counters", countersSchema),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 55_000,
    retry: false,
  });
}

export function counterValue(counters: Counters | undefined, key: CounterKey | undefined): number {
  if (!counters || !key) return 0;
  return counters[key] ?? 0;
}
