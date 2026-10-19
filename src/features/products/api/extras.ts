"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { productKeys } from "@/features/products/api/products";
import {
  auctionBidsSchema,
  auctionSettingsSchema,
  bundleViewSchema,
  compatRulesSchema,
  formulaPreviewSchema,
  personalizationFieldsSchema,
  serialsSchema,
  tierPricesSchema,
} from "@/features/products/schemas/extras";

/**
 * M37/M36 editor hooks — `[tenant, 'products', 'extras', id, resource]`, all through the
 * `/api/bff/products/<id>/extras/<resource>/` catch-all. Every write replaces the
 * resource's cached copy with the server's answer and drops the change log.
 */
export type ExtraResource = "tier-prices" | "bundle-components" | "compatibility-rules" | "personalization-fields" | "auction" | "auction/bids" | "serials";

const SCHEMAS = {
  "tier-prices": tierPricesSchema,
  "bundle-components": bundleViewSchema,
  "compatibility-rules": compatRulesSchema,
  "personalization-fields": personalizationFieldsSchema,
  auction: auctionSettingsSchema,
  "auction/bids": auctionBidsSchema,
  serials: serialsSchema,
} as const;
type Schemas = typeof SCHEMAS;
type Data<R extends ExtraResource> = Schemas[R] extends ZodType<infer T> ? T : never;

export const extrasKey = (store: string, id: number, resource: ExtraResource) => storeKey(store, "products", "extras", id, resource);
const url = (id: number, resource: string) => `/api/bff/products/${id}/extras/${resource}/`;

export function useExtra<R extends ExtraResource>(id: number, resource: R, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: extrasKey(store, id, resource),
    queryFn: ({ signal }) => apiFetch(url(id, resource), SCHEMAS[resource] as unknown as ZodType<Data<R>>, { signal }),
    enabled,
  });
}

/** A write on `resource` (optionally `/<sub>`), answered with the resource's new state. */
export function useExtraWrite<R extends ExtraResource>(id: number, resource: R) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { method: "POST" | "PUT" | "PATCH" | "DELETE"; sub?: string | number; json?: unknown }) =>
      apiFetch(url(id, v.sub !== undefined ? `${resource}/${v.sub}` : resource), SCHEMAS[resource] as unknown as ZodType<Data<R>>, { method: v.method, json: v.json }),
    onSuccess: (data) => {
      qc.setQueryData(extrasKey(store, id, resource), data);
      if (resource === "auction") void qc.invalidateQueries({ queryKey: productKeys(store).detail(id) });
      void qc.invalidateQueries({ queryKey: storeKey(store, "products", "changes") });
    },
  });
}

/** `POST /products/formula-preview/` — the server's price for the entered terms (US-37.4.1). */
export function useFormulaPreview(terms: { formula_unit_price: string; formula_coefficient: string; formula_fixed_extra: string; currency: string } | null) {
  const store = useStore();
  return useQuery({
    queryKey: storeKey(store, "products", "formula-preview", terms),
    queryFn: ({ signal }) => apiFetch("/api/bff/products/formula-preview", formulaPreviewSchema, { method: "POST", json: terms, signal }),
    enabled: terms !== null,
    staleTime: 60_000,
    retry: false,
  });
}
