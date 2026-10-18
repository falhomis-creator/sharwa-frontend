"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { PRODUCT_STATUSES, PRODUCT_TYPES, STOCK_FILTERS } from "@/features/products/schemas";

/**
 * Product list filters in the URL (FR-04.01, M04 US-04.1 «نسخ الرابط إلى تبويب جديد → نفس
 * النتيجة»). Keys are the API's own query names, so the list request is a straight copy.
 */
export const productFilterParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(PRODUCT_STATUSES),
  stock: parseAsStringLiteral(STOCK_FILTERS),
  category: parseAsString.withDefault(""),
  brand: parseAsString.withDefault(""),
  tag: parseAsString.withDefault(""),
  collection: parseAsString.withDefault(""),
  product_type: parseAsStringLiteral(PRODUCT_TYPES),
  flags: parseAsString.withDefault(""),
};

export function useProductFilters() {
  const [filters, setFilters] = useQueryStates(productFilterParsers, { history: "replace" });
  const active =
    Number(Boolean(filters.status)) +
    Number(Boolean(filters.stock)) +
    Number(Boolean(filters.category)) +
    Number(Boolean(filters.brand)) +
    Number(Boolean(filters.tag)) +
    Number(Boolean(filters.collection)) +
    Number(Boolean(filters.product_type)) +
    Number(Boolean(filters.flags));
  return {
    filters,
    setFilters,
    activeCount: active,
    isFiltered: active > 0 || Boolean(filters.q),
    clear: () =>
      setFilters({
        q: null,
        status: null,
        stock: null,
        category: null,
        brand: null,
        tag: null,
        collection: null,
        product_type: null,
        flags: null,
      }),
  };
}
