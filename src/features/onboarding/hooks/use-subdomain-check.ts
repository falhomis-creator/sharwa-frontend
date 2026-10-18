"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { validateSubdomain } from "@/lib/tenant";
import { checkSubdomainSchema } from "@/features/onboarding/schemas";

export const SUBDOMAIN_DEBOUNCE_MS = 400;

export type SubdomainCheck =
  | { state: "empty" }
  | { state: "invalid"; reason: string }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; reason: string }
  /** The live check failed on the network: submission stays allowed (US-02.2.4). */
  | { state: "unknown" };

export function subdomainCheckKey(subdomain: string) {
  return storeKey(null, "onboarding", "subdomain-check", subdomain);
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Live subdomain check (FR-02.03/04).
 *
 * - Local rules first — reserved names and bad characters never reach the network
 *   (US-02.2.3).
 * - `GET /api/bff/public/check-subdomain` 400ms after the last keystroke. The query
 *   function consumes TanStack's `signal`, so a request whose key has been superseded is
 *   aborted rather than raced.
 */
export function useSubdomainCheck(value: string): SubdomainCheck {
  const debounced = useDebounced(value, SUBDOMAIN_DEBOUNCE_MS);
  const local = validateSubdomain(value);
  const debouncedOk = validateSubdomain(debounced).ok;

  const query = useQuery({
    queryKey: subdomainCheckKey(debounced),
    queryFn: ({ signal }) =>
      apiFetch("/api/bff/public/check-subdomain", checkSubdomainSchema, { query: { subdomain: debounced }, signal }),
    enabled: debouncedOk,
    staleTime: 30_000,
    retry: false,
  });

  if (!value) return { state: "empty" };
  if (!local.ok) return { state: "invalid", reason: local.reason };
  if (debounced !== value || query.isPending || query.isFetching) return { state: "checking" };
  if (query.isError) return { state: "unknown" };
  return query.data.available
    ? { state: "available" }
    : { state: "taken", reason: query.data.reason || "مستخدم بالفعل" };
}
