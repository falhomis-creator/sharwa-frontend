"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z, type ZodType } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  addressResultSchema,
  carrierSchema,
  carrierTestSchema,
  convertResultSchema,
  deliveryMethodListSchema,
  deliveryMethodSchema,
  edgeListSchema,
  packagingListSchema,
  packagingSchema,
  pickupListSchema,
  pickupReorderSchema,
  pickupSchema,
  providerListSchema,
  providerSchema,
  resolveResultSchema,
  restrictedListSchema,
  restrictedZoneSchema,
  reviewListSchema,
  shippingSettingsSchema,
  slaListSchema,
  slaRuleSchema,
  staffOptionSchema,
  zoneListSchema,
  type CarrierCode,
  type EdgeKind,
} from "@/features/shipping/schemas";

/** M15 data hooks — tenant-prefixed keys `[store, 'shipping', …]`; every write invalidates the module. */
type Params = Record<string, string | number | undefined>;

export function shippingKeys(store: string) {
  return {
    all: storeKey(store, "shipping"),
    of: (resource: string, params?: Params) => storeKey(store, "shipping", resource, params ?? {}),
    resource: (resource: string) => storeKey(store, "shipping", resource),
  };
}

function useList<T>(resource: string, path: string, schema: ZodType<T>, params: Params = {}, opts: { refetchInterval?: number; enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: shippingKeys(store).of(resource, params),
    queryFn: ({ signal }) => apiFetch(path, schema, { query: params, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetchInterval,
    enabled: opts.enabled ?? true,
  });
}

function useInvalidate() {
  const store = useStore();
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: shippingKeys(store).all });
}

/** Create (POST) / update (PATCH) / delete for one `[NEEDS BACKEND]` collection. */
function useCrud<T>(path: string, schema: ZodType<T>) {
  const invalidate = useInvalidate();
  const save = useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) =>
      id === null ? apiFetch(path, schema, { method: "POST", json: body }) : apiFetch(`${path}/${id}`, schema, { method: "PATCH", json: body }),
    onSuccess: () => void invalidate(),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`${path}/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => void invalidate(),
  });
  return { save, remove };
}

// ── settings ─────────────────────────────────────────────────────────────────────────
export function useShippingSettings() {
  const store = useStore();
  return useQuery({ queryKey: shippingKeys(store).resource("settings"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/settings", shippingSettingsSchema, { signal }) });
}

export function useSaveShippingSettings() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/api/bff/shipping/settings", shippingSettingsSchema, { method: "PATCH", json: body }),
    onSuccess: (data) => {
      client.setQueryData(shippingKeys(store).resource("settings"), data);
      void client.invalidateQueries({ queryKey: storeKey(store, "settings") });
    },
  });
}

// ── delivery methods / pickups / providers / packaging ──────────────────────────────
export const useDeliveryMethods = (params: Params = {}) => useList("methods", "/api/bff/shipping/delivery-methods", deliveryMethodListSchema, params);
export const useMethodWrites = () => useCrud("/api/bff/shipping/delivery-methods", deliveryMethodSchema);

export const usePickups = (params: Params = {}) => useList("pickups", "/api/bff/shipping/pickup-locations", pickupListSchema, params);
export const usePickupWrites = () => useCrud("/api/bff/shipping/pickup-locations", pickupSchema);
export function useReorderPickups() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => apiFetch("/api/bff/shipping/pickup-locations/reorder", pickupReorderSchema, { method: "POST", json: { ordered_ids: ids } }),
    // Optimistic: the dragged order shows at once; an error restores the server order.
    onMutate: async (ids) => {
      const key = shippingKeys(store).resource("pickups");
      await client.cancelQueries({ queryKey: key });
      const snapshots = client.getQueriesData<z.infer<typeof pickupListSchema>>({ queryKey: key });
      snapshots.forEach(([k, v]) => {
        if (!v) return;
        const byId = new Map(v.results.map((p) => [p.id, p]));
        const next = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p, i) => ({ ...p, sort_order: i + 1 }));
        if (next.length === v.results.length) client.setQueryData(k, { ...v, results: next });
      });
      return { snapshots };
    },
    onError: (_e, _ids, ctx) => ctx?.snapshots.forEach(([k, v]) => client.setQueryData(k, v)),
    onSettled: () => client.invalidateQueries({ queryKey: shippingKeys(store).resource("pickups") }),
  });
}

export const useProviders = (params: Params) => useList("providers", "/api/bff/shipping/providers", providerListSchema, params);
export const useProviderWrites = () => useCrud("/api/bff/shipping/providers", providerSchema);
export function useStaffOptions(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: shippingKeys(store).resource("staff-options"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/providers/staff-options", z.array(staffOptionSchema), { signal }), enabled });
}

export const usePackaging = (params: Params = {}) => useList("packaging", "/api/bff/shipping/packaging-profiles", packagingListSchema, params);
export const usePackagingWrites = () => useCrud("/api/bff/shipping/packaging-profiles", packagingSchema);

// ── carriers ─────────────────────────────────────────────────────────────────────────
export function useCarriers() {
  const store = useStore();
  return useQuery({ queryKey: shippingKeys(store).resource("carriers"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/carriers", z.array(carrierSchema), { signal }) });
}

export function useCarrier(code: CarrierCode) {
  const store = useStore();
  return useQuery({ queryKey: shippingKeys(store).of("carrier", { code }), queryFn: ({ signal }) => apiFetch(`/api/bff/shipping/carriers/${code}`, carrierSchema, { signal }) });
}

export function useCarrierWrites(code: CarrierCode) {
  const invalidate = useInvalidate();
  const saveCredentials = useMutation({
    mutationFn: (body: Record<string, string>) => apiFetch(`/api/bff/shipping/carriers/${code}/credentials`, carrierSchema, { method: "PUT", json: body }),
    onSuccess: () => void invalidate(),
  });
  const test = useMutation({
    mutationFn: () => apiFetch(`/api/bff/shipping/carriers/${code}/test`, carrierTestSchema, { method: "POST" }),
    onSettled: () => void invalidate(),
  });
  return { saveCredentials, test };
}

// ── zones / review / restricted / SLA ────────────────────────────────────────────────
export const useZones = (params: Params = {}) => useList("zones", "/api/bff/shipping/sharwa-ship/zones", zoneListSchema, params);
export const useZoneReview = (params: Params, enabled = true) => useList("review", "/api/bff/shipping/zone-review", reviewListSchema, params, { enabled });
export function useResolveReview() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: number; body: Record<string, unknown> }) => apiFetch(`/api/bff/shipping/zone-review/${orderId}/resolve`, resolveResultSchema, { method: "POST", json: body }),
    onSettled: () => void invalidate(),
  });
}
export const useRestrictedZones = (params: Params = {}, enabled = true) => useList("restricted", "/api/bff/shipping/restricted-zones", restrictedListSchema, params, { enabled });
export const useRestrictedWrites = () => useCrud("/api/bff/shipping/restricted-zones", restrictedZoneSchema);
export const useSlaRules = (params: Params = {}, enabled = true) => useList("sla", "/api/bff/shipping/sla-rules", slaListSchema, params, { enabled });
export const useSlaWrites = () => useCrud("/api/bff/shipping/sla-rules", slaRuleSchema);

// ── edge cases + shipment actions ────────────────────────────────────────────────────
/** SC-15.5: a flagged event shows within ≤ 60 s — the list polls every minute. */
export const useEdgeCases = (kind: EdgeKind, params: Params) => useList("edge", "/api/bff/shipping/edge-cases", edgeListSchema, { kind, ...params }, { refetchInterval: 60_000 });

export function useShipmentActions() {
  const invalidate = useInvalidate();
  const updateAddress = useMutation({
    mutationFn: ({ shipmentId, body }: { shipmentId: number; body: Record<string, unknown> }) => apiFetch(`/api/bff/shipments/${shipmentId}/address`, addressResultSchema, { method: "POST", json: body }),
    onSuccess: () => void invalidate(),
  });
  const convertToPickup = useMutation({
    mutationFn: ({ orderId, body }: { orderId: number; body: { pickup_location_id: number; version: number } }) => apiFetch(`/api/bff/orders/${orderId}/convert-to-pickup`, convertResultSchema, { method: "POST", json: body }),
    onSettled: () => void invalidate(),
  });
  return { updateAddress, convertToPickup };
}
