"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import type { Currency } from "@/lib/schemas/money";
import { z } from "zod";
import { fetchCart } from "@/features/cart/api";
import { useStorefront, visiblePath } from "@/features/storefront/components/storefront-provider";

/**
 * Switch the display currency (M09 US-09.3.1, FR-09.07, M11 FR-11.08):
 *  1. wait for any queued cart action (M11 §8: a switch during a pending add waits for it);
 *  2. pin it in the Django session — `GET /api/v1/cart/?currency=` (the cart re-prices);
 *  3. store the display preference (server-set cookie) and keep `?currency=` in the URL in
 *     sync if it is there;
 *  4. re-render the server components so every product price comes back in that currency.
 * No conversion happens in the browser.
 */
export function useSwitchCurrency() {
  const { store } = useStorefront();
  const client = useQueryClient();
  const router = useRouter();
  const pathname = visiblePath(usePathname());
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function switchTo(currency: Currency) {
    setBusy(true);
    try {
      for (let i = 0; i < 60 && client.isMutating({ mutationKey: ["store", store, "cart", "action"] }) > 0; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      await fetchCart(store, client, currency);
      await apiFetch("/api/bff/storefront/currency", z.object({ currency: z.string() }), { method: "POST", json: { currency } });
      startTransition(() => {
        if (params.has("currency")) {
          const next = new URLSearchParams(params);
          next.set("currency", currency);
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        } else {
          router.refresh();
        }
      });
    } catch (e) {
      toast.error("تعذّر تغيير العملة", { description: isApiError(e) ? e.userMessage : undefined });
    } finally {
      setBusy(false);
    }
  }

  return { switchTo, pending: pending || busy };
}
