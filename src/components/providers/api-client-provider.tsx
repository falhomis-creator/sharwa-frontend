"use client";

import { useEffect, type ReactNode } from "react";
import { setCsrfToken } from "@/lib/api-client";

/**
 * Hands the server-resolved CSRF token to the browser API client (T017, M47 FR-47.06).
 * The token arrives as a prop from an RSC and is kept in a module variable — never read
 * from `document.cookie` (the cookie is `HttpOnly`) and never written to storage.
 */
export function ApiClientProvider({ csrfToken, children }: { csrfToken?: string | null; children: ReactNode }) {
  // The first write must happen before any child effect fires a mutation, so it is also
  // done inline on the module variable rather than only in the effect.
  if (typeof window !== "undefined") setCsrfToken(csrfToken ?? null);

  useEffect(() => {
    setCsrfToken(csrfToken ?? null);
  }, [csrfToken]);

  return children;
}
