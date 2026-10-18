"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  adjustResultSchema,
  assignmentSchema,
  deactivationImpactSchema,
  locationDetailSchema,
  locationInventorySchema,
  locationListSchema,
  modeSchema,
  reorderResultSchema,
  routingPreviewSchema,
  routingRuleSchema,
  staffOptionSchema,
  type LocationDetail,
  type RoutingRule,
} from "@/features/locations/schemas";

/** M22 data hooks — tenant-prefixed keys `[tenant, 'locations', …]` (§11 IX), Zod on every response. */
export type LocationListParams = Record<string, string | number | undefined>;

export function locationKeys(store: string) {
  return {
    all: storeKey(store, "locations"),
    list: (params: LocationListParams) => storeKey(store, "locations", "list", params),
    lists: storeKey(store, "locations", "list"),
    detail: (id: number) => storeKey(store, "locations", "detail", id),
    inventory: (id: number, params: LocationListParams) => storeKey(store, "locations", "inventory", id, params),
    staff: (id: number) => storeKey(store, "locations", "staff", id),
    staffOptions: storeKey(store, "locations", "staff-options"),
    rules: storeKey(store, "locations", "rules"),
    preview: (city: string, category: string) => storeKey(store, "locations", "preview", city, category),
    impact: (id: number) => storeKey(store, "locations", "impact", id),
  };
}

export function useLocations(params: LocationListParams, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/locations", locationListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useLocation(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).detail(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/bff/locations/${id}`, locationDetailSchema, { signal }),
    enabled: id !== null,
  });
}

export function useSetMode() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { enabled: boolean; merge?: boolean }) => apiFetch("/api/bff/locations/mode", modeSchema, { method: "POST", json: body }),
    onSuccess: () => client.invalidateQueries({ queryKey: locationKeys(store).all }),
  });
}

export function useSaveLocation(id: number | null) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      id === null
        ? apiFetch("/api/bff/locations", locationDetailSchema, { method: "POST", json: payload })
        : apiFetch(`/api/bff/locations/${id}`, locationDetailSchema, { method: "PATCH", json: payload }),
    onSuccess: (data: LocationDetail) => {
      client.setQueryData(locationKeys(store).detail(data.id), data);
      void client.invalidateQueries({ queryKey: locationKeys(store).lists });
      void client.invalidateQueries({ queryKey: locationKeys(store).rules });
    },
  });
}

export function useDeactivationImpact(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).impact(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/bff/locations/${id}/deactivation-impact`, deactivationImpactSchema, { signal }),
    enabled: id !== null,
  });
}

export function useLocationInventory(id: number, params: LocationListParams, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).inventory(id, params),
    queryFn: ({ signal }) => apiFetch(`/api/bff/locations/${id}/inventory`, locationInventorySchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAdjustLocationStock(id: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch(`/api/bff/locations/${id}/inventory/adjust`, adjustResultSchema, { method: "POST", json: body }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: storeKey(store, "locations", "inventory", id) });
      void client.invalidateQueries({ queryKey: storeKey(store, "inventory") });
      void client.invalidateQueries({ queryKey: locationKeys(store).lists });
    },
  });
}

export function usePatchLocationRow(id: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ unit, body }: { unit: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/bff/locations/${id}/inventory/${unit}`, z.object({ quantity_available: z.string() }).passthrough(), { method: "PATCH", json: body }),
    onSettled: () => void client.invalidateQueries({ queryKey: storeKey(store, "locations", "inventory", id) }),
  });
}

export function useStaffOptions(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).staffOptions,
    queryFn: ({ signal }) => apiFetch("/api/bff/locations/staff-options", z.array(staffOptionSchema), { signal }),
    staleTime: 60_000,
    enabled,
  });
}

export function useAssignments(id: number, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).staff(id),
    queryFn: ({ signal }) => apiFetch(`/api/bff/locations/${id}/staff`, z.array(assignmentSchema), { signal }),
    enabled,
  });
}

export function useAssignStaff(id: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { staff_id: number; role: string }) => apiFetch(`/api/bff/locations/${id}/staff`, assignmentSchema, { method: "POST", json: body }),
    onSuccess: () => void client.invalidateQueries({ queryKey: locationKeys(store).staff(id) }),
  });
}

export function useRemoveAssignment(id: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => apiFetch(`/api/bff/locations/${id}/staff/${assignmentId}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: locationKeys(store).staff(id) }),
  });
}

export function useRoutingRules(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).rules,
    queryFn: ({ signal }) => apiFetch("/api/bff/locations/routing-rules", z.array(routingRuleSchema), { signal }),
    enabled,
  });
}

export function useRoutingPreview(city: string, category: string) {
  const store = useStore();
  return useQuery({
    queryKey: locationKeys(store).preview(city, category),
    queryFn: ({ signal }) => apiFetch("/api/bff/locations/routing-rules/preview", routingPreviewSchema, { query: { city, category }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useSaveRule() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) =>
      id === null
        ? apiFetch("/api/bff/locations/routing-rules", routingRuleSchema, { method: "POST", json: body })
        : apiFetch(`/api/bff/locations/routing-rules/${id}`, routingRuleSchema, { method: "PATCH", json: body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: locationKeys(store).rules });
      void client.invalidateQueries({ queryKey: storeKey(store, "locations", "preview") });
    },
  });
}

export function useDeleteRule() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/locations/routing-rules/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: locationKeys(store).rules });
      void client.invalidateQueries({ queryKey: storeKey(store, "locations", "preview") });
    },
  });
}

/** Optimistic reorder (FR-22.07): the list moves at once, the server renumbers, a failure rolls back. */
export function useReorderRules() {
  const store = useStore();
  const client = useQueryClient();
  const key = locationKeys(store).rules;
  return useMutation({
    mutationFn: (ordered: number[]) => apiFetch("/api/bff/locations/routing-rules/reorder", reorderResultSchema, { method: "POST", json: { ordered_ids: ordered } }),
    onMutate: async (ordered) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<RoutingRule[]>(key);
      if (previous) {
        const byId = new Map(previous.map((r) => [r.id, r]));
        client.setQueryData<RoutingRule[]>(
          key,
          ordered.map((id, i) => ({ ...byId.get(id)!, priority: i + 1 })),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) client.setQueryData(key, ctx.previous);
    },
    onSuccess: (data) => {
      client.setQueryData(key, data.results);
      void client.invalidateQueries({ queryKey: storeKey(store, "locations", "preview") });
    },
  });
}
