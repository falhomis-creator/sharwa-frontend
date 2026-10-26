"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  aiSettingsSchema,
  aiStatusSchema,
  appChargeListSchema,
  appDetailSchema,
  appEventListSchema,
  appListSchema,
  connectUrlSchema,
  consoleTokenSchema,
  installResultSchema,
  usageListSchema,
  usageSummarySchema,
  waTemplateListSchema,
  waTemplateSchema,
} from "@/features/apps/schemas";

/** M30/M31 hooks — keys `[tenant, 'apps', …]`. */
export function appKeys(store: string) {
  return {
    all: storeKey(store, "apps"),
    list: storeKey(store, "apps", "list"),
    detail: (code: string) => storeKey(store, "apps", "detail", code),
    events: (code: string) => storeKey(store, "apps", "events", code),
    charges: (code: string) => storeKey(store, "apps", "charges", code),
    usage: (p: Record<string, unknown>) => storeKey(store, "apps", "wa", "usage", p),
    summary: storeKey(store, "apps", "wa", "summary"),
    templates: storeKey(store, "apps", "wa", "templates"),
    template: (id: number) => storeKey(store, "apps", "wa", "template", id),
    connect: storeKey(store, "apps", "wa", "connect"),
    aiStatus: storeKey(store, "apps", "ai", "status"),
    aiSettings: storeKey(store, "apps", "ai", "settings"),
  };
}

export function useApps() {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).list, queryFn: ({ signal }) => apiFetch("/api/bff/apps", appListSchema, { signal }) });
}

export function useApp(code: string) {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).detail(code), queryFn: ({ signal }) => apiFetch(`/api/bff/apps/${encodeURIComponent(code)}`, appDetailSchema, { signal }), retry: false });
}

export function useAppEvents(code: string, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).events(code), queryFn: ({ signal }) => apiFetch(`/api/bff/apps/${encodeURIComponent(code)}/events`, appEventListSchema, { signal }), enabled });
}

export function useAppCharges(code: string, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).charges(code), queryFn: ({ signal }) => apiFetch(`/api/bff/apps/${encodeURIComponent(code)}/charges`, appChargeListSchema, { signal }), enabled });
}

export function useAppAction(code: string) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "install" | "activate" | "deactivate") => apiFetch(`/api/bff/apps/${encodeURIComponent(code)}/${action}`, installResultSchema, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: appKeys(store).all }),
  });
}

export function useWaUsage(params: Record<string, string | number | undefined>) {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).usage(params), queryFn: ({ signal }) => apiFetch("/api/bff/apps/whatsapp/usage", usageListSchema, { query: params, signal }), placeholderData: keepPreviousData });
}

export function useWaSummary() {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).summary, queryFn: ({ signal }) => apiFetch("/api/bff/apps/whatsapp/summary", usageSummarySchema, { signal }) });
}

export function useWaTemplates() {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).templates, queryFn: ({ signal }) => apiFetch("/api/bff/apps/whatsapp/templates", waTemplateListSchema, { signal }) });
}

export function useWaTemplate(id: number) {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).template(id), queryFn: ({ signal }) => apiFetch(`/api/bff/apps/whatsapp/templates/${id}`, waTemplateSchema, { signal }), retry: false });
}

export function useSaveWaTemplate(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiFetch(`/api/bff/apps/whatsapp/templates/${id}`, waTemplateSchema, { method: "PATCH", json: { body } }),
    onSuccess: (t) => {
      qc.setQueryData(appKeys(store).template(id), t);
      void qc.invalidateQueries({ queryKey: appKeys(store).templates });
    },
  });
}

/** Fetched on click only — the link carries a session token (M30 US-30.3 acceptance 3). */
export function fetchConnectUrl() {
  return apiFetch("/api/bff/apps/whatsapp/connect-url", connectUrlSchema);
}

/** FR-31.02: every 5s while connecting, every 60s after; paused in a hidden tab. */
export function useAiStatus(enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: appKeys(store).aiStatus,
    queryFn: ({ signal }) => apiFetch("/api/bff/apps/sharwa-ai/status", aiStatusSchema, { signal }),
    enabled,
    refetchInterval: (q) => (q.state.data?.connecting ? 5_000 : 60_000),
  });
}

export function useAiSettings(enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: appKeys(store).aiSettings, queryFn: ({ signal }) => apiFetch("/api/bff/apps/sharwa-ai/settings", aiSettingsSchema, { signal }), enabled });
}

export function useSaveAiSettings() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ai_enabled: boolean; max_consecutive_bot_replies_override: number | null }) => apiFetch("/api/bff/apps/sharwa-ai/settings", aiSettingsSchema, { method: "PUT", json: body }),
    onSuccess: (data) => {
      qc.setQueryData(appKeys(store).aiSettings, data);
      void qc.invalidateQueries({ queryKey: storeKey(store, "support") });
    },
  });
}

/** INT-041: a fresh pairing (new QR) after a dropped or expired WhatsApp session — owner only. */
export function useAiReconnect() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/bff/apps/sharwa-ai/reconnect", aiStatusSchema, { method: "POST" }),
    onSuccess: (data) => qc.setQueryData(appKeys(store).aiStatus, data),
  });
}

/** FR-31.08: requested on click, used once, never stored. */
export function fetchConsoleToken() {
  return apiFetch("/api/bff/apps/sharwa-ai/console-token", consoleTokenSchema, { method: "POST" });
}
