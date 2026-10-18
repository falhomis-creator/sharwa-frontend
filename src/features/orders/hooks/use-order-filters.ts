"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ORDER_STATUSES, PAYMENT_STATUSES, SALES_CHANNELS, TRAFFIC_SOURCES } from "@/features/orders/schemas";

/**
 * Order list filters in the URL (FR-06.01/02, SC-06.5): a copied link reproduces the exact
 * view. Keys are the API's own query names. `order` is the id open in the side sheet
 * (US-06.1.3) — URL state, so Next 16's preserved routes never reopen a stale sheet.
 */
export const orderFilterParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(ORDER_STATUSES),
  payment_status: parseAsStringLiteral(PAYMENT_STATUSES),
  fulfillment_status: parseAsString.withDefault(""),
  channel: parseAsStringLiteral(SALES_CHANNELS),
  traffic_source: parseAsStringLiteral(TRAFFIC_SOURCES),
  location: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
};

export function useOrderFilters() {
  const [filters, setFilters] = useQueryStates(orderFilterParsers, { history: "replace" });
  const activeCount =
    Number(Boolean(filters.status)) +
    Number(Boolean(filters.payment_status)) +
    Number(Boolean(filters.fulfillment_status)) +
    Number(Boolean(filters.channel)) +
    Number(Boolean(filters.traffic_source)) +
    Number(Boolean(filters.location)) +
    Number(Boolean(filters.from || filters.to));
  return {
    filters,
    setFilters,
    activeCount,
    isFiltered: activeCount > 0 || Boolean(filters.q),
    clear: () =>
      setFilters({
        q: null,
        status: null,
        payment_status: null,
        fulfillment_status: null,
        channel: null,
        traffic_source: null,
        location: null,
        from: null,
        to: null,
      }),
  };
}

export function useOpenOrder() {
  return useQueryStates({ order: parseAsInteger }, { history: "push" });
}
