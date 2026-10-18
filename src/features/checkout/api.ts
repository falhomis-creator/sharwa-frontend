"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { DeliveryOptionsSchema, InvoiceSchema, PaymentOptionsSchema } from "@/features/checkout/schemas";

/**
 * Checkout reads (M12 §7): delivery and payment options, and the invoice QUOTE — every
 * change of delivery/payment/coupon/wallet asks the server again; while it recomputes the
 * previous numbers stay on screen, dimmed (FR-12.03). No money is ever computed here.
 */
export interface QuoteInput {
  delivery_method_id?: string;
  pickup_location_id?: string;
  payment_method?: string;
  use_wallet: boolean;
  phone?: string;
  redeem_points?: string;
  checkout_mode: "cart" | "buy_now";
  product_id?: string;
  variant_id?: string;
  size?: string;
  color?: string;
  quantity?: string;
  start_datetime?: string;
  /** Bumped when the cart changes so the quote refreshes with it. */
  cartVersion: string;
}

export function useDeliveryOptions(store: string, cartVersion: string) {
  return useQuery({
    queryKey: storeKey(store, "checkout", "delivery-options", cartVersion),
    queryFn: () => apiFetch("/api/bff/checkout/delivery-options", DeliveryOptionsSchema),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentOptions(store: string, cartVersion: string) {
  return useQuery({
    queryKey: storeKey(store, "checkout", "payment-options", cartVersion),
    queryFn: () => apiFetch("/api/bff/checkout/payment-options", PaymentOptionsSchema),
    placeholderData: keepPreviousData,
  });
}

export function useQuote(store: string, input: QuoteInput, enabled: boolean) {
  const { cartVersion, ...body } = input;
  return useQuery({
    queryKey: storeKey(store, "checkout", "quote", { ...body, cartVersion }),
    queryFn: () => apiFetch("/api/bff/checkout/quote", InvoiceSchema, { method: "POST", json: body }),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}
