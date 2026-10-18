"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  adjustmentResultSchema,
  countersSchema,
  inventoryListSchema,
  itemListSchema,
  movementListSchema,
  reservationListSchema,
  writeoffListSchema,
  writeoffSchema,
} from "@/features/inventory/schemas";

/** M21 hooks — tenant-prefixed keys `[tenant, 'inventory', …]` (§11 IX), Zod on every response. */
export type Params = Record<string, string | number | undefined>;

export function inventoryKeys(store: string) {
  return {
    all: storeKey(store, "inventory"),
    list: (p: Params) => storeKey(store, "inventory", "list", p),
    lists: storeKey(store, "inventory", "list"),
    counters: storeKey(store, "inventory", "counters"),
    movements: (p: Params) => storeKey(store, "inventory", "movements", p),
    items: (p: Params) => storeKey(store, "inventory", "items", p),
    reservations: (p: Params) => storeKey(store, "inventory", "reservations", p),
    writeoffs: storeKey(store, "inventory", "writeoffs"),
  };
}

export function useInventory(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inventoryKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/inventory", inventoryListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The «متوفر / منخفض / نفد» strip — refreshed every 60 s while visible (FR-21.10). */
export function useInventoryCounters(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inventoryKeys(store).counters,
    queryFn: ({ signal }) => apiFetch("/api/bff/inventory/counters", countersSchema, { signal }),
    refetchInterval: 60_000,
    enabled,
  });
}

export function useMovements(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inventoryKeys(store).movements(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/inventory/movements", movementListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useItems(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inventoryKeys(store).items(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/inventory/items", itemListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useReservations(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inventoryKeys(store).reservations(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/inventory/reservations", reservationListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useWriteoffs(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inventoryKeys(store).writeoffs,
    queryFn: ({ signal }) => apiFetch("/api/bff/inventory/writeoffs", writeoffListSchema, { signal }),
    enabled,
  });
}

export interface AdjustInput {
  product_id: number;
  variant_id?: number | null;
  location_id?: number | null;
  delta?: string;
  new_quantity?: string;
  reason: "manual_adjust" | "restock";
  note: string;
}

export function useAdjustStock() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustInput) => apiFetch("/api/bff/inventory/adjustments", adjustmentResultSchema, { method: "POST", json: input }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: inventoryKeys(store).all });
    },
  });
}

export function useRequestWriteoff() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { product_id: number; variant_id?: number | null; location_id?: number | null; quantity: string; note: string }) =>
      apiFetch("/api/bff/inventory/writeoffs", writeoffSchema, { method: "POST", json: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: inventoryKeys(store).writeoffs });
      void client.invalidateQueries({ queryKey: inventoryKeys(store).counters });
    },
  });
}
