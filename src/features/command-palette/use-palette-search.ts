"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { normalizeArabic } from "@/lib/i18n/normalize";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { searchResultSchema } from "@/features/command-palette/schemas";

/**
 * Server search (FR-48.04): starts after 2 characters, 150ms debounce, the previous request
 * cancelled (TanStack aborts the `signal` of an abandoned key), `limit=5` per group, and
 * only the groups this member may see are requested at all (US-48.2.5). Query text is
 * never logged by the client (FR-48.12).
 */
export function usePaletteSearch(query: string, enabled: boolean) {
  const store = useStore();
  const { canPermission } = useAccess();
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const q = normalizeArabic(debounced).replace(/^#/, "").trim();
  const types = ["products", canPermission("orders.view") ? "orders" : null, canPermission("customers.view") ? "customers" : null]
    .filter(Boolean)
    .join(",");
  const active = enabled && q.replace(/\s/g, "").length >= 2 && !q.startsWith(">");
  const result = useQuery({
    queryKey: storeKey(store, "search", q, types),
    queryFn: ({ signal }) => apiFetch("/api/bff/search", searchResultSchema, { query: { q, types, limit: 5 }, signal }),
    enabled: active,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
  return { ...result, active, pending: active && (debounced !== query || result.isFetching) };
}
