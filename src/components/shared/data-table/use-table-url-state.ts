"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

/**
 * The URL half of every data table (T069, bff-cross-cutting §6): page, page size,
 * ordering and density live in the query string via nuqs, so a copied link reproduces
 * the exact view (M04 US-04.1, M06 SC-06.5). Module filters live next to these in the
 * module's own `useQueryStates` — and every filter change resets `page` to 1.
 */
export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const PAGE_SIZES = [20, 50, 100] as const;

export const tableUrlParsers = {
  page: parseAsInteger.withDefault(1),
  page_size: parseAsInteger.withDefault(50),
  ordering: parseAsString.withDefault(""),
  density: parseAsStringLiteral(DENSITIES).withDefault("comfortable"),
};

export function useTableUrlState() {
  const [state, setState] = useQueryStates(tableUrlParsers, { history: "replace" });
  const pageSize = (PAGE_SIZES as readonly number[]).includes(state.page_size) ? state.page_size : 50;
  return {
    page: Math.max(1, state.page),
    pageSize,
    ordering: state.ordering,
    density: state.density,
    setPage: (page: number) => setState({ page: page <= 1 ? null : page }),
    setPageSize: (size: number) => setState({ page_size: size === 50 ? null : size, page: null }),
    setOrdering: (ordering: string) => setState({ ordering: ordering || null, page: null }),
    setDensity: (density: Density) => setState({ density: density === "comfortable" ? null : density }),
    resetPage: () => setState({ page: null }),
  };
}

/** Cycle a DRF ordering key: none → ascending → descending → none. */
export function nextOrdering(current: string, key: string): string {
  if (current === key) return `-${key}`;
  if (current === `-${key}`) return "";
  return key;
}
