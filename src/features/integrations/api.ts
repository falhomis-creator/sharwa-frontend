"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  domainListSchema,
  domainSchema,
  integrationStatusListSchema,
  trackingSchema,
  webhookDeliveryListSchema,
  webhookDeliverySchema,
  webhookEndpointListSchema,
  webhookEndpointSchema,
  webhookEventListSchema,
  webhookSecretResponseSchema,
  type DomainList,
} from "@/features/integrations/schemas";

/** M19 data hooks — tenant-prefixed keys, Zod-parsed, every write invalidates its entity. */
type Params = Record<string, string | number | undefined>;

export function integrationKeys(store: string) {
  const k = (...parts: Array<string | number | Params>) => storeKey(store, "integrations", ...parts);
  return {
    domains: k("domains"),
    tracking: k("tracking"),
    events: k("webhooks", "events"),
    endpoints: k("webhooks", "endpoints"),
    endpoint: (id: number) => k("webhooks", "endpoints", id),
    deliveries: (id: number, p?: Params) => (p ? k("webhooks", "deliveries", id, p) : k("webhooks", "deliveries", id)),
    statuses: k("statuses"),
  };
}

const POLL_MS = 30_000;

// ── Domains ─────────────────────────────────────────────────────────────────
/** FR-19.02: poll every 30 s only while a custom domain is `pending_dns`/`verifying`. */
export function domainsNeedPolling(data: DomainList | undefined): boolean {
  return !!data?.results.some((d) => d.kind === "custom" && (d.status === "pending_dns" || d.status === "verifying"));
}

export function useDomains() {
  const store = useStore();
  return useQuery({
    queryKey: integrationKeys(store).domains,
    queryFn: ({ signal }) => apiFetch("/api/bff/domains", domainListSchema, { signal }),
    refetchInterval: (q) => (domainsNeedPolling(q.state.data) ? POLL_MS : false),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: ReadonlyArray<readonly unknown[]>) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useAddDomain() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (domain: string) => apiFetch("/api/bff/domains", domainSchema, { method: "POST", json: { domain } }), onSuccess: () => invalidate(integrationKeys(store).domains) });
}
export function useVerifyDomain() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/bff/domains/${id}/verify`, domainSchema, { method: "POST", json: {} }), onSuccess: () => invalidate(integrationKeys(store).domains) });
}
export function useSetPrimaryDomain() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/bff/domains/${id}/set-primary`, z.unknown(), { method: "POST", json: {} }), onSuccess: () => invalidate(integrationKeys(store).domains) });
}
export function useDeleteDomain() {
  const store = useStore();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/bff/domains/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => invalidate(integrationKeys(store).domains) });
}

// ── Tracking ────────────────────────────────────────────────────────────────
export function useTracking(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: integrationKeys(store).tracking, queryFn: ({ signal }) => apiFetch("/api/bff/store/tracking", trackingSchema, { signal }), enabled });
}
export function useSaveTracking() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json: Record<string, unknown>) => apiFetch("/api/bff/store/tracking", trackingSchema, { method: "PATCH", json }),
    onSuccess: (data) => qc.setQueryData(integrationKeys(store).tracking, data),
  });
}

// ── Webhooks ────────────────────────────────────────────────────────────────
export function useWebhookEvents(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: integrationKeys(store).events, queryFn: ({ signal }) => apiFetch("/api/bff/webhooks/events", webhookEventListSchema, { signal }), enabled, staleTime: 10 * 60_000 });
}
export function useEndpoints() {
  const store = useStore();
  return useQuery({ queryKey: integrationKeys(store).endpoints, queryFn: ({ signal }) => apiFetch("/api/bff/webhooks/endpoints", webhookEndpointListSchema, { signal }) });
}
export function useEndpoint(id: number) {
  const store = useStore();
  return useQuery({ queryKey: integrationKeys(store).endpoint(id), queryFn: ({ signal }) => apiFetch(`/api/bff/webhooks/endpoints/${id}`, webhookEndpointSchema, { signal }) });
}
export function useDeliveries(id: number, params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: integrationKeys(store).deliveries(id, params),
    queryFn: ({ signal }) => apiFetch(`/api/bff/webhooks/endpoints/${id}/deliveries`, webhookDeliveryListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

/** Every webhook write touches the list, the endpoint and its deliveries. */
function useWebhookInvalidate() {
  const store = useStore();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: storeKey(store, "integrations", "webhooks") });
}

export function useCreateEndpoint() {
  const invalidate = useWebhookInvalidate();
  return useMutation({ mutationFn: (json: Record<string, unknown>) => apiFetch("/api/bff/webhooks/endpoints", webhookSecretResponseSchema, { method: "POST", json }), onSuccess: () => invalidate() });
}
export function usePatchEndpoint(id: number) {
  const invalidate = useWebhookInvalidate();
  return useMutation({ mutationFn: (json: Record<string, unknown>) => apiFetch(`/api/bff/webhooks/endpoints/${id}`, webhookEndpointSchema, { method: "PATCH", json }), onSuccess: () => invalidate() });
}
export function useDeleteEndpoint() {
  const invalidate = useWebhookInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/bff/webhooks/endpoints/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => invalidate() });
}
export function useRotateSecret(id: number) {
  const invalidate = useWebhookInvalidate();
  return useMutation({ mutationFn: () => apiFetch(`/api/bff/webhooks/endpoints/${id}/rotate-secret`, webhookSecretResponseSchema, { method: "POST", json: {} }), onSuccess: () => invalidate() });
}
export function useTestEndpoint(id: number) {
  const invalidate = useWebhookInvalidate();
  return useMutation({ mutationFn: () => apiFetch(`/api/bff/webhooks/endpoints/${id}/test`, webhookDeliverySchema, { method: "POST", json: {} }), onSuccess: () => invalidate() });
}
export function useRedeliver() {
  const invalidate = useWebhookInvalidate();
  return useMutation({ mutationFn: (deliveryId: number) => apiFetch(`/api/bff/webhooks/deliveries/${deliveryId}/redeliver`, webhookDeliverySchema, { method: "POST", json: {} }), onSuccess: () => invalidate() });
}

// ── Integrations overview ───────────────────────────────────────────────────
export function useIntegrationStatuses() {
  const store = useStore();
  return useQuery({ queryKey: integrationKeys(store).statuses, queryFn: ({ signal }) => apiFetch("/api/bff/integrations/status", integrationStatusListSchema, { signal }), staleTime: 60_000 });
}
