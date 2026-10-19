"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { shippingKeys } from "@/features/shipping/api";
import type { ShipmentStatus } from "@/features/shipping/schemas";
import {
  awbItemSchema,
  awbListSchema,
  pendingOrderListSchema,
  rateCardListSchema,
  reassignResultSchema,
  shiftListSchema,
  shipmentDetailSchema,
  shipmentListSchema,
  shipmentRowSchema,
  supervisorSchema,
  transitionResultSchema,
  zoneOptionListSchema,
} from "@/features/shipping/sharwa-ship/schemas";

/**
 * M39 hooks — keys `[store, 'shipping', 'sharwa-ship', …]` (under the M15 module key, so a
 * write here also refreshes the M15 edge-case queues that read the same shipments).
 */
type Params = Record<string, string | number | undefined>;

export function sharwaShipKeys(store: string) {
  return {
    all: storeKey(store, "shipping", "sharwa-ship"),
    of: (resource: string, params?: Params) => storeKey(store, "shipping", "sharwa-ship", resource, params ?? {}),
  };
}

function useInvalidate() {
  const store = useStore();
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: shippingKeys(store).all });
}

export function usePendingOrders() {
  const store = useStore();
  return useQuery({ queryKey: sharwaShipKeys(store).of("pending"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/sharwa-ship/pending-orders", pendingOrderListSchema, { signal }) });
}

export function useActiveZones(enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: sharwaShipKeys(store).of("zones"),
    queryFn: ({ signal }) => apiFetch("/api/bff/shipping/sharwa-ship/zones", zoneOptionListSchema, { signal, query: { page_size: 100 } }),
    enabled,
    select: (d) => d.results.filter((z) => z.is_active !== false),
  });
}

export function useShipments(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: sharwaShipKeys(store).of("shipments", params),
    queryFn: ({ signal }) => apiFetch("/api/bff/shipping/shipments", shipmentListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useShipment(id: number) {
  const store = useStore();
  return useQuery({ queryKey: sharwaShipKeys(store).of("shipment", { id }), queryFn: ({ signal }) => apiFetch(`/api/bff/shipping/shipments/${id}`, shipmentDetailSchema, { signal }) });
}

export function useIssueWaybill() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ orderId, zone_code }: { orderId: number; zone_code: string }) => apiFetch(`/api/bff/shipping/sharwa-ship/orders/${orderId}/waybill`, shipmentDetailSchema, { method: "POST", json: { zone_code } }),
    onSuccess: () => void invalidate(),
  });
}

export function useManualStatus(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (to_status: ShipmentStatus) =>
      apiFetch(`/api/bff/shipping/shipments/${id}/status`, transitionResultSchema, { method: "POST", json: { to_status, client_generated_uuid: crypto.randomUUID(), event_time: new Date().toISOString() } }),
    onSuccess: () => void invalidate(),
  });
}

export function useAssignShipment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, agent_id }: { id: number; agent_id: number }) => apiFetch(`/api/bff/shipping/shipments/${id}/assign`, shipmentRowSchema, { method: "POST", json: { agent_id } }),
    onSuccess: () => void invalidate(),
  });
}

export function useAwbQueue() {
  const store = useStore();
  return useQuery({ queryKey: sharwaShipKeys(store).of("awb"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/awb-queue", awbListSchema, { signal }), refetchInterval: 30_000 });
}

export function useRetryAwb() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/bff/shipping/awb-queue/${id}/retry`, awbItemSchema, { method: "POST" }), onSuccess: () => void invalidate() });
}

export function useRateCards() {
  const store = useStore();
  return useQuery({ queryKey: sharwaShipKeys(store).of("rate-cards"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/rate-cards", rateCardListSchema, { signal }) });
}

export function useSupervisor() {
  const store = useStore();
  return useQuery({ queryKey: sharwaShipKeys(store).of("supervisor"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/supervisor", supervisorSchema, { signal }), refetchInterval: 60_000 });
}

export function useEmergencyReassign() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ agentId, new_agent_id }: { agentId: number; new_agent_id: number }) => apiFetch(`/api/bff/shipping/agents/${agentId}/emergency-reassign`, reassignResultSchema, { method: "POST", json: { new_agent_id } }),
    onSuccess: () => void invalidate(),
  });
}

export function useAgentShifts() {
  const store = useStore();
  return useQuery({ queryKey: sharwaShipKeys(store).of("shifts"), queryFn: ({ signal }) => apiFetch("/api/bff/shipping/agent-shifts", shiftListSchema, { signal }) });
}
