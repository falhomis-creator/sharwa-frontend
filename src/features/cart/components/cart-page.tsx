"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { CartSchema } from "@/features/storefront/schemas/cart";
import { cartKey } from "@/features/cart/api";
import { CartPanel } from "@/features/cart/components/cart-panel";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * `/cart` — the full-page cart. `?restore=<token>` (the reminder's `cart_url`, M11 US-11.5.2)
 * restores the abandoned cart into this session first, says «استعدنا سلتك», then drops the
 * token from the URL.
 */
export function CartPage() {
  const { store } = useStorefront();
  const client = useQueryClient();
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("restore");
  const done = useRef(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!token || done.current) return;
    done.current = true;
    apiFetch("/api/bff/cart/restore", CartSchema, { method: "POST", json: { token } })
      .then((cart) => {
        client.setQueryData(cartKey(store), cart);
        toast.success("استعدنا سلتك", { description: cart.coupon_code ? `وطبّقنا كود الخصم ${cart.coupon_code}.` : undefined });
      })
      .catch((e) => setFailed(isApiError(e) ? e.userMessage : "تعذّر استرداد السلة."))
      .finally(() => router.replace("/cart", { scroll: false }));
  }, [token, client, store, router]);

  return (
    <>
      {failed ? <p className="mb-4 text-sm text-destructive">{failed}</p> : null}
      <CartPanel variant="page" />
    </>
  );
}
