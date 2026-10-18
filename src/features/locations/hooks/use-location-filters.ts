"use client";

import { parseAsString, useQueryStates } from "nuqs";

/** Location list filters in the URL (US-22.2.1): a copied link reproduces the view. */
export const locationFilterParsers = {
  q: parseAsString.withDefault(""),
  flag: parseAsString.withDefault(""),
  ownership: parseAsString.withDefault(""),
  is_active: parseAsString.withDefault(""),
};

export function useLocationFilters() {
  const [filters, setFilters] = useQueryStates(locationFilterParsers, { history: "replace" });
  const activeCount = Number(Boolean(filters.flag)) + Number(Boolean(filters.ownership)) + Number(Boolean(filters.is_active));
  return {
    filters,
    setFilters,
    activeCount,
    isFiltered: activeCount > 0 || Boolean(filters.q),
    clear: () => setFilters({ q: null, flag: null, ownership: null, is_active: null }),
  };
}
