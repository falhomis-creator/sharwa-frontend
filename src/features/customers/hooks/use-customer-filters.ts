"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { SEGMENTS, TRUST_BUCKETS } from "@/features/customers/schemas";

/**
 * Customer list filters in the URL (FR-07.02, SC-07.5): a shared link reproduces the same
 * segment, count and rows. Keys are the API's own query names. `customer` is the phone open
 * in the side sheet and `tab` the profile tab (`?tab=orders|wallet|…`, constitution IX).
 */
export const customerFilterParsers = {
  q: parseAsString.withDefault(""),
  segment: parseAsStringLiteral(SEGMENTS).withDefault("all"),
  product_id: parseAsString.withDefault(""),
  last_order_from: parseAsString.withDefault(""),
  last_order_to: parseAsString.withDefault(""),
  min_spent: parseAsString.withDefault(""),
  trust: parseAsStringLiteral(TRUST_BUCKETS),
  has_wallet: parseAsString.withDefault(""),
  has_points: parseAsString.withDefault(""),
};

export function useCustomerFilters() {
  const [filters, setFilters] = useQueryStates(customerFilterParsers, { history: "replace" });
  const activeCount =
    Number(filters.segment !== "all") +
    Number(Boolean(filters.last_order_from || filters.last_order_to)) +
    Number(Boolean(filters.min_spent)) +
    Number(Boolean(filters.trust)) +
    Number(filters.has_wallet === "true") +
    Number(filters.has_points === "true");
  return {
    filters,
    setFilters,
    activeCount,
    isFiltered: activeCount > 0 || Boolean(filters.q),
    clear: () =>
      setFilters({ q: null, segment: null, product_id: null, last_order_from: null, last_order_to: null, min_spent: null, trust: null, has_wallet: null, has_points: null }),
  };
}

export function useOpenCustomer() {
  return useQueryStates({ customer: parseAsString }, { history: "push" });
}
