"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useSyncExternalStore } from "react";
import { MOVEMENT_REASONS, RESERVATION_STATUSES, STOCK_STATUSES } from "@/features/inventory/schemas";

/** Table filters in the URL (M21 FR-21.01): a copied link reproduces the exact view. */
export const inventoryFilterParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(STOCK_STATUSES),
  location: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  is_serialized: parseAsString.withDefault(""),
  /** The unit open in the adjust panel: `<product_id>:<variant_id|0>`. */
  adjust: parseAsString,
};

export function useInventoryFilters() {
  const [filters, setFilters] = useQueryStates(inventoryFilterParsers, { history: "replace" });
  const activeCount = Number(Boolean(filters.status)) + Number(Boolean(filters.location)) + Number(Boolean(filters.category)) + Number(Boolean(filters.is_serialized));
  return {
    filters,
    setFilters,
    activeCount,
    isFiltered: activeCount > 0 || Boolean(filters.q),
    clear: () => setFilters({ q: null, status: null, location: null, category: null, is_serialized: null }),
  };
}

export const movementFilterParsers = {
  product: parseAsInteger,
  variant: parseAsInteger,
  location: parseAsString.withDefault(""),
  reason: parseAsStringLiteral(MOVEMENT_REASONS),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
};

export function useMovementFilters() {
  const [filters, setFilters] = useQueryStates(movementFilterParsers, { history: "replace" });
  const activeCount =
    Number(Boolean(filters.product)) + Number(Boolean(filters.location)) + Number(Boolean(filters.reason)) + Number(Boolean(filters.from || filters.to));
  return {
    filters,
    setFilters,
    activeCount,
    isFiltered: activeCount > 0,
    clear: () => setFilters({ product: null, variant: null, location: null, reason: null, from: null, to: null }),
  };
}

export const reservationFilterParsers = {
  status: parseAsStringLiteral(RESERVATION_STATUSES),
  product: parseAsInteger,
};

const MD = "(min-width: 768px)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
/** Phones get the bottom drawer with big ± buttons (M21 §6 «الجوال»); desktop the side sheet. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, () => !window.matchMedia(MD).matches, () => false);
}
