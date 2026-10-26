"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { PushStatsSchema, PushTestResultSchema } from "@/features/pwa/schemas";

/** M44 US-44.5 merchant hooks (INT-016) — BFF `push/stats`, `push/test` (module `pwa`). */
export function usePushStats() {
  const store = useStore();
  return useQuery({
    queryKey: storeKey(store, "push", "stats"),
    queryFn: ({ signal }) => apiFetch("/api/bff/push/stats", PushStatsSchema, { signal }),
    staleTime: 60_000,
  });
}

export function useSendTestPush() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; body: string }) => apiFetch("/api/bff/push/test", PushTestResultSchema, { method: "POST", json: body }),
    onSuccess: () => client.invalidateQueries({ queryKey: storeKey(store, "push", "stats") }),
  });
}
