"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { storeKey } from "@/lib/query-keys";
import type { Currency } from "@/lib/schemas/money";
import {
  CartActionResultSchema,
  CartSchema,
  lineKey,
  type Cart,
  type CartActionInput,
  type CartItem,
} from "@/features/storefront/schemas/cart";
import { useCartUi } from "@/stores/cart-ui";

/**
 * The session cart (ready-api-v1 #5–#7), shared by the header badge (M09 FR-09.11), the
 * panel and `/cart` (M11) and checkout (M12) under ONE key: `['store', store, 'cart']`.
 * The server is the source of truth; updates are optimistic and roll back on failure
 * (FR-11.03); actions run strictly in sequence through a mutation scope (US-11.2.2).
 */
export const cartKey = (store: string) => storeKey(store, "cart");

export function useCart(store: string) {
  return useQuery({
    queryKey: cartKey(store),
    queryFn: () => apiFetch("/api/v1/cart/", CartSchema),
    staleTime: 10_000,
    // Two tabs: the other tab's change shows on focus, no socket (M11 §8).
    refetchOnWindowFocus: true,
  });
}

export async function fetchCart(store: string, client: QueryClient, currency?: Currency): Promise<Cart> {
  const cart = await apiFetch("/api/v1/cart/", CartSchema, { query: { currency } });
  client.setQueryData(cartKey(store), cart);
  return cart;
}

/** What the UI already knows about a product, so the optimistic line can render before the server answers. */
export interface OptimisticLine {
  name: string;
  display_price: string | null;
  image?: string | null;
  variant_label?: string | null;
}

export type CartActionVars = CartActionInput & { optimistic?: OptimisticLine; label?: string };

function applyOptimistic(cart: Cart | undefined, vars: CartActionVars): Cart | undefined {
  if (!cart) return cart;
  const key = lineKey(vars);
  const items = [...cart.items];
  const index = items.findIndex((i) => lineKey(i) === key);
  let count = cart.count;
  if (vars.action_type === "add") {
    const qty = vars.quantity ?? 1;
    if (index >= 0) items[index] = { ...items[index]!, quantity: items[index]!.quantity + qty, display_subtotal: null };
    else if (vars.optimistic) {
      const line: CartItem = {
        product_id: vars.product_id,
        name: vars.optimistic.name,
        size: vars.size ?? null,
        color: vars.color ?? null,
        quantity: qty,
        display_price: vars.optimistic.display_price,
        // FR-11.04: no local maths — the subtotal waits for the server.
        display_subtotal: null,
        image: vars.optimistic.image ?? null,
        variant_id: vars.variant_id ?? null,
        variant_label: vars.optimistic.variant_label ?? null,
        start_datetime: vars.start_datetime ?? null,
      };
      items.unshift(line);
    }
    count += qty;
  } else if (index >= 0) {
    const current = items[index]!;
    if (vars.action_type === "remove_line" || current.quantity <= 1) {
      count -= current.quantity;
      items.splice(index, 1);
    } else {
      items[index] = { ...current, quantity: current.quantity - 1, display_subtotal: null };
      count -= 1;
    }
  }
  return { ...cart, items, count: Math.max(0, count), display_subtotal: cart.display_subtotal, display_total: null };
}

const MUTATION_KEY = (store: string) => ["store", store, "cart", "action"] as const;

export function useCartAction(store: string) {
  const client = useQueryClient();
  const markCapped = useCartUi((s) => s.markCapped);
  const clearCapped = useCartUi((s) => s.clearCapped);
  const mutation = useMutation({
    mutationKey: MUTATION_KEY(store),
    // One scope → mutations run one after another, never in parallel (US-11.2.2).
    scope: { id: `cart:${store}` },
    mutationFn: async (vars: CartActionVars) => {
      const { optimistic, label, ...input } = vars;
      void optimistic;
      void label;
      return apiFetch("/api/v1/cart/actions/", CartActionResultSchema, { method: "POST", json: input });
    },
    onMutate: async (vars) => {
      await client.cancelQueries({ queryKey: cartKey(store) });
      const previous = client.getQueryData<Cart>(cartKey(store));
      client.setQueryData(cartKey(store), applyOptimistic(previous, vars));
      return { previous };
    },
    onSuccess: (result, vars) => {
      const key = lineKey(vars);
      if (vars.action_type === "add") {
        // The server capped the quantity at its stock (US-11.2.3).
        const before = client.getQueryData<Cart>(cartKey(store))?.items.find((i) => lineKey(i) === key)?.quantity ?? 0;
        if (result.product_qty < before) markCapped(key, result.product_qty);
        else clearCapped(key);
      }
    },
    onError: (error, vars, context) => {
      if (context?.previous) client.setQueryData(cartKey(store), context.previous);
      const message = isApiError(error) ? error.userMessage : "تعذّر الاتصال بالمتجر.";
      toast.error(vars.action_type === "add" ? "لم نستطع الإضافة إلى السلة" : "لم نستطع تحديث السلة", {
        description: message,
        // Runs later, on click — `mutation` is initialised by then.
        action: { label: "إعادة المحاولة", onClick: () => mutation.mutate(vars) },
      });
    },
    onSettled: async () => {
      // Refetch once the queue drains, so the panel ends on the server's numbers.
      if (client.isMutating({ mutationKey: MUTATION_KEY(store) }) <= 1) {
        await client.invalidateQueries({ queryKey: cartKey(store) });
      }
    },
  });
  return mutation;
}

/** True while any cart action is queued or in flight — disables «إتمام الطلب» (FR-11.06). */
export function useCartPending(store: string) {
  return useIsMutating({ mutationKey: MUTATION_KEY(store) }) > 0;
}

export function useClearCart(store: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/v1/cart/", CartSchema.optional(), { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: cartKey(store) }),
    onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر إفراغ السلة."),
  });
}

export function useCoupon(store: string) {
  const client = useQueryClient();
  const apply = useMutation({
    mutationFn: (code: string) => apiFetch("/api/bff/cart/coupon", CartSchema, { method: "POST", json: { code } }),
    onSuccess: (cart) => client.setQueryData(cartKey(store), cart),
  });
  const remove = useMutation({
    mutationFn: () => apiFetch("/api/bff/cart/coupon", CartSchema, { method: "DELETE" }),
    onSuccess: (cart) => client.setQueryData(cartKey(store), cart),
  });
  return { apply, remove };
}
