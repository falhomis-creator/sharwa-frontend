"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch, setCsrfToken } from "@/lib/api-client";
import { PLATFORM_STORE, storeKey } from "@/lib/query-keys";
import {
  actionResultSchema,
  adminSessionSchema,
  appListSchema,
  appOverrideListSchema,
  appOverrideSchema,
  appSchema,
  billingSettingsSchema,
  clientOptionListSchema,
  deactivationStateSchema,
  duesDetailSchema,
  duesOverviewSchema,
  featureListSchema,
  featureSchema,
  marketCategoryListSchema,
  overrideListSchema,
  overviewSchema,
  planFeatureCellSchema,
  planFeatureListSchema,
  planListSchema,
  planSchema,
  reprovisionReportSchema,
  resolveSchema,
  storeDetailSchema,
  storeFeatureListSchema,
  storeListSchema,
  storeRowSchema,
  subscriptionRowSchema,
  topupListSchema,
  topupSchema,
  walletDetailSchema,
  webhookEventListSchema,
  webhookEventSchema,
  withdrawalListSchema,
  withdrawalSchema,
  zoneListSchema,
  zoneSchema,
  type AdminLoginInput,
  type AppInput,
  type AssignInput,
  type BulkOverrideInput,
  type DeactivationAction,
  type DueActionInput,
  type PlanFeatureCell,
  type PlanInput,
  type ZoneInput,
  type ZoneUpdate,
} from "@/features/platform-admin/schemas";

/**
 * Console data hooks (M20/M45/M46). Every key is `["store", "platform", "admin", …]`
 * (constitution VIII); a store-scoped read adds the target `schema_name` to its key so two
 * stores never share a cache row (SC-20.5). Every response is Zod-validated.
 */
const BASE = "/api/bff/platform";
export type Params = Record<string, string | number | boolean | undefined | null>;

export const adminKeys = {
  all: storeKey(PLATFORM_STORE, "admin"),
  me: storeKey(PLATFORM_STORE, "admin", "me"),
  overview: storeKey(PLATFORM_STORE, "admin", "overview"),
  stores: (p: Params) => storeKey(PLATFORM_STORE, "admin", "stores", "list", p as Record<string, unknown>),
  storeLists: storeKey(PLATFORM_STORE, "admin", "stores", "list"),
  store: (schema: string) => storeKey(PLATFORM_STORE, "admin", "stores", "detail", schema),
  storeFeatures: (schema: string) => storeKey(PLATFORM_STORE, "admin", "stores", "features", schema),
  deactivation: (schema: string) => storeKey(PLATFORM_STORE, "admin", "stores", "deactivation", schema),
  clients: (q: string) => storeKey(PLATFORM_STORE, "admin", "clients", q),
  plans: storeKey(PLATFORM_STORE, "admin", "plans"),
  matrix: storeKey(PLATFORM_STORE, "admin", "plan-features"),
  features: storeKey(PLATFORM_STORE, "admin", "features"),
  resolve: (code: string, schema: string) => storeKey(PLATFORM_STORE, "admin", "features", "resolve", code, schema),
  overrides: (p: Params) => storeKey(PLATFORM_STORE, "admin", "overrides", p as Record<string, unknown>),
  overridesAll: storeKey(PLATFORM_STORE, "admin", "overrides"),
  subscriptions: (p: Params) => storeKey(PLATFORM_STORE, "admin", "subscriptions", p as Record<string, unknown>),
  subscriptionsAll: storeKey(PLATFORM_STORE, "admin", "subscriptions"),
  billing: storeKey(PLATFORM_STORE, "admin", "billing-settings"),
  apps: storeKey(PLATFORM_STORE, "admin", "apps"),
  appOverrides: storeKey(PLATFORM_STORE, "admin", "app-overrides"),
  categories: storeKey(PLATFORM_STORE, "admin", "market-categories"),
  zones: storeKey(PLATFORM_STORE, "admin", "zones"),
  webhookEvents: (p: Params) => storeKey(PLATFORM_STORE, "admin", "webhook-events", p as Record<string, unknown>),
  webhookEventsAll: storeKey(PLATFORM_STORE, "admin", "webhook-events"),
  duesOverview: (p: Params) => storeKey(PLATFORM_STORE, "admin", "dues", "overview", p as Record<string, unknown>),
  duesAll: storeKey(PLATFORM_STORE, "admin", "dues"),
  dues: (schema: string) => storeKey(PLATFORM_STORE, "admin", "dues", "detail", schema),
  topups: (p: Params) => storeKey(PLATFORM_STORE, "admin", "sharwa-pay", "topups", p as Record<string, unknown>),
  withdrawals: (p: Params) => storeKey(PLATFORM_STORE, "admin", "sharwa-pay", "withdrawals", p as Record<string, unknown>),
  sharwaPayAll: storeKey(PLATFORM_STORE, "admin", "sharwa-pay"),
  wallet: (phone: string) => storeKey(PLATFORM_STORE, "admin", "sharwa-pay", "wallet", phone),
};

const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== "")) as Record<string, string | number | boolean>;

// ── session ─────────────────────────────────────────────────────────────────────────
export function useAdminLogin() {
  return useMutation({
    mutationFn: (input: AdminLoginInput) => apiFetch(`${BASE}/auth/login`, adminSessionSchema, { method: "POST", json: input }),
    // Django's login() rotates the CSRF token (INT-030): adopt the new one before the next write.
    onSuccess: (session) => {
      if (session.csrf_token) setCsrfToken(session.csrf_token);
    },
  });
}

export function useAdminLogout() {
  return useMutation({ mutationFn: () => apiFetch(`${BASE}/auth/logout`, z.unknown(), { method: "POST" }) });
}

// ── overview + stores ───────────────────────────────────────────────────────────────
export function useOverview() {
  return useQuery({ queryKey: adminKeys.overview, queryFn: ({ signal }) => apiFetch(`${BASE}/overview`, overviewSchema, { signal }) });
}

export function useStores(params: Params, opts: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: adminKeys.stores(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/stores`, storeListSchema, { query: clean(params), signal }),
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetchInterval,
  });
}

export function useStore(schema: string, opts: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: adminKeys.store(schema),
    queryFn: ({ signal }) => apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}`, storeDetailSchema, { signal }),
    refetchInterval: opts.refetchInterval,
  });
}

export function useClients(q: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.clients(q),
    queryFn: ({ signal }) => apiFetch(`${BASE}/clients`, clientOptionListSchema, { query: { q }, signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: ReadonlyArray<readonly unknown[]>) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useReprovision() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (schemas: string[]) => apiFetch(`${BASE}/stores/reprovision`, reprovisionReportSchema, { method: "POST", json: { schemas } }),
    onSuccess: () => inv(adminKeys.storeLists, adminKeys.overview),
  });
}

export function useSharwaShip(schema: string) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (active: boolean) =>
      apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/sharwa-ship`, z.object({ detail: z.string(), store: storeRowSchema }), { method: "POST", json: { active } }),
    onSuccess: () => inv(adminKeys.store(schema), adminKeys.storeLists),
  });
}

export function useStoreFeatures(schema: string) {
  return useQuery({
    queryKey: adminKeys.storeFeatures(schema),
    queryFn: ({ signal }) => apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/features`, storeFeatureListSchema, { signal }),
  });
}

export function useSaveStoreFeatures(schema: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (overrides: Array<{ code: string; is_enabled: boolean | null; notes: string }>) =>
      apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/features`, storeFeatureListSchema, { method: "PUT", json: { overrides } }),
    onSuccess: (data) => {
      qc.setQueryData(adminKeys.storeFeatures(schema), data);
      void qc.invalidateQueries({ queryKey: adminKeys.store(schema) });
      void qc.invalidateQueries({ queryKey: adminKeys.overridesAll });
      void qc.invalidateQueries({ queryKey: adminKeys.features });
    },
  });
}

export function useAddDomain(schema: string) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (domain: string) => apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/domains`, z.unknown(), { method: "POST", json: { domain } }),
    onSuccess: () => inv(adminKeys.store(schema), adminKeys.storeLists),
  });
}

export function useSetPrimaryDomain(schema: string) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/domains/${id}`, z.unknown(), { method: "POST" }),
    onSuccess: () => inv(adminKeys.store(schema), adminKeys.storeLists),
  });
}

export function useDeactivation(schema: string) {
  return useQuery({
    queryKey: adminKeys.deactivation(schema),
    queryFn: ({ signal }) => apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/deactivation`, deactivationStateSchema, { signal }),
  });
}

export function useDeactivationAction(schema: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: DeactivationAction; reason?: string; grace_period_ends_at?: string }) =>
      apiFetch(`${BASE}/stores/${encodeURIComponent(schema)}/deactivation`, deactivationStateSchema, { method: "POST", json: input }),
    onSuccess: (data) => {
      qc.setQueryData(adminKeys.deactivation(schema), data);
      void qc.invalidateQueries({ queryKey: adminKeys.store(schema) });
      void qc.invalidateQueries({ queryKey: adminKeys.storeLists });
    },
  });
}

// ── plans / matrix / features / overrides / subscriptions / switches ─────────────────
export function usePlans() {
  return useQuery({ queryKey: adminKeys.plans, queryFn: ({ signal }) => apiFetch(`${BASE}/plans`, planListSchema, { signal }) });
}

const planPayload = (v: PlanInput) => ({ ...v, max_products: v.max_products, max_orders_per_month: v.max_orders_per_month });

export function useSavePlan(id: number | null) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (v: PlanInput) => apiFetch(id ? `${BASE}/plans/${id}` : `${BASE}/plans`, planSchema, { method: id ? "PATCH" : "POST", json: planPayload(v) }),
    onSuccess: () => inv(adminKeys.plans, adminKeys.billing),
  });
}

export function useDeletePlan() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/plans/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => inv(adminKeys.plans, adminKeys.matrix),
  });
}

export function useMatrix() {
  return useQuery({ queryKey: adminKeys.matrix, queryFn: ({ signal }) => apiFetch(`${BASE}/plan-features`, planFeatureListSchema, { signal }) });
}

/** Optimistic cell toggle with rollback (US-46.1 a3). */
export function useToggleCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cell: PlanFeatureCell) => apiFetch(`${BASE}/plan-features`, planFeatureCellSchema, { method: "PUT", json: cell }),
    onMutate: async (cell) => {
      await qc.cancelQueries({ queryKey: adminKeys.matrix });
      const prev = qc.getQueryData<PlanFeatureCell[]>(adminKeys.matrix);
      qc.setQueryData<PlanFeatureCell[]>(adminKeys.matrix, (rows = []) => {
        const next = rows.filter((r) => !(r.plan_id === cell.plan_id && r.feature_code === cell.feature_code));
        next.push(cell);
        return next;
      });
      return { prev };
    },
    onError: (_e, _cell, ctx) => {
      if (ctx?.prev) qc.setQueryData(adminKeys.matrix, ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: adminKeys.features }),
  });
}

export function useFeatures() {
  return useQuery({ queryKey: adminKeys.features, queryFn: ({ signal }) => apiFetch(`${BASE}/features`, featureListSchema, { signal }) });
}

export function usePatchFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...patch }: { code: string; is_active_globally?: boolean; requires_plan?: boolean }) =>
      apiFetch(`${BASE}/features/${encodeURIComponent(code)}`, featureSchema, { method: "PATCH", json: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.features });
      void qc.invalidateQueries({ queryKey: storeKey(PLATFORM_STORE, "admin", "stores", "features") });
      void qc.invalidateQueries({ queryKey: storeKey(PLATFORM_STORE, "admin", "features", "resolve") });
    },
  });
}

export function useResolve(code: string, schema: string) {
  return useQuery({
    queryKey: adminKeys.resolve(code, schema),
    queryFn: ({ signal }) => apiFetch(`${BASE}/features/${encodeURIComponent(code)}/resolve`, resolveSchema, { query: { schema }, signal }),
    enabled: Boolean(code && schema),
    staleTime: 0,
  });
}

export function useOverrides(params: Params) {
  return useQuery({
    queryKey: adminKeys.overrides(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/feature-overrides`, overrideListSchema, { query: clean(params), signal }),
    placeholderData: keepPreviousData,
  });
}

export function useBulkOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkOverrideInput) =>
      apiFetch(`${BASE}/feature-overrides/bulk`, z.object({ detail: z.string(), created: z.number(), updated: z.number(), removed: z.number() }), { method: "POST", json: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.overridesAll });
      void qc.invalidateQueries({ queryKey: adminKeys.features });
      void qc.invalidateQueries({ queryKey: storeKey(PLATFORM_STORE, "admin", "stores") });
    },
  });
}

export function useDeleteOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/feature-overrides/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.overridesAll });
      void qc.invalidateQueries({ queryKey: adminKeys.features });
      void qc.invalidateQueries({ queryKey: storeKey(PLATFORM_STORE, "admin", "stores") });
    },
  });
}

export function useSubscriptions(params: Params) {
  return useQuery({
    queryKey: adminKeys.subscriptions(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/subscriptions`, z.object({ count: z.number(), results: z.array(subscriptionRowSchema) }), { query: clean(params), signal }),
    placeholderData: keepPreviousData,
  });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignInput) => apiFetch(`${BASE}/subscriptions/assign`, subscriptionRowSchema, { method: "POST", json: input }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: adminKeys.subscriptionsAll });
      void qc.invalidateQueries({ queryKey: adminKeys.plans });
      void qc.invalidateQueries({ queryKey: adminKeys.store(row.schema_name) });
      void qc.invalidateQueries({ queryKey: adminKeys.storeLists });
    },
  });
}

export function useBillingSettings() {
  return useQuery({ queryKey: adminKeys.billing, queryFn: ({ signal }) => apiFetch(`${BASE}/billing-settings`, billingSettingsSchema, { signal }) });
}

export function usePatchBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { subscriptions_enabled?: boolean; commission_enabled?: boolean }) => apiFetch(`${BASE}/billing-settings`, billingSettingsSchema, { method: "PATCH", json: patch }),
    onSuccess: (data) => {
      qc.setQueryData(adminKeys.billing, data);
      void qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// ── apps, categories, zones, webhook events ─────────────────────────────────────────
export function useApps() {
  return useQuery({ queryKey: adminKeys.apps, queryFn: ({ signal }) => apiFetch(`${BASE}/apps`, appListSchema, { signal }) });
}

export function useSaveApp(code: string | null) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (v: AppInput) => apiFetch(code ? `${BASE}/apps/${encodeURIComponent(code)}` : `${BASE}/apps`, appSchema, { method: code ? "PATCH" : "POST", json: v }),
    onSuccess: () => inv(adminKeys.apps),
  });
}

export function useAppOverrides() {
  return useQuery({ queryKey: adminKeys.appOverrides, queryFn: ({ signal }) => apiFetch(`${BASE}/app-billing-overrides`, appOverrideListSchema, { signal }) });
}

export function useCreateAppOverride() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (v: { app_code: string; schema_name: string; is_billed: boolean; notes: string }) => apiFetch(`${BASE}/app-billing-overrides`, appOverrideSchema, { method: "POST", json: v }),
    onSuccess: () => inv(adminKeys.appOverrides),
  });
}

export function useDeleteAppOverride() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/app-billing-overrides/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => inv(adminKeys.appOverrides),
  });
}

export function useCategories() {
  return useQuery({ queryKey: adminKeys.categories, queryFn: ({ signal }) => apiFetch(`${BASE}/market-categories`, marketCategoryListSchema, { signal }) });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const set = (data: unknown) => {
    const parsed = marketCategoryListSchema.safeParse(data);
    if (parsed.success) qc.setQueryData(adminKeys.categories, parsed.data);
    else void qc.invalidateQueries({ queryKey: adminKeys.categories });
  };
  return {
    create: useMutation({ mutationFn: (v: { name: string; is_active: boolean }) => apiFetch(`${BASE}/market-categories`, marketCategoryListSchema, { method: "POST", json: v }), onSuccess: set }),
    patch: useMutation({
      mutationFn: ({ id, ...v }: { id: number; name?: string; is_active?: boolean }) => apiFetch(`${BASE}/market-categories/${id}`, marketCategoryListSchema, { method: "PATCH", json: v }),
      onSuccess: set,
    }),
    remove: useMutation({
      mutationFn: (id: number) => apiFetch(`${BASE}/market-categories/${id}`, z.unknown(), { method: "DELETE" }),
      onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.categories }),
    }),
    reorder: useMutation({ mutationFn: (ids: number[]) => apiFetch(`${BASE}/market-categories/reorder`, marketCategoryListSchema, { method: "POST", json: { ids } }), onSuccess: set }),
  };
}

export function useZones() {
  return useQuery({ queryKey: adminKeys.zones, queryFn: ({ signal }) => apiFetch(`${BASE}/sharwa-ship/zones`, zoneListSchema, { signal }) });
}

export function useSaveZone(id: number | null) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (v: ZoneInput | ZoneUpdate) => apiFetch(id ? `${BASE}/sharwa-ship/zones/${id}` : `${BASE}/sharwa-ship/zones`, zoneSchema, { method: id ? "PATCH" : "POST", json: v }),
    onSuccess: () => inv(adminKeys.zones),
  });
}

export function useDeleteZone() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (id: number) => apiFetch(`${BASE}/sharwa-ship/zones/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => inv(adminKeys.zones) });
}

export function useWebhookEvents(params: Params) {
  return useQuery({
    queryKey: adminKeys.webhookEvents(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/webhook-events`, webhookEventListSchema, { query: clean(params), signal }),
    placeholderData: keepPreviousData,
  });
}

export function useWebhookEventAction() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "retry" | "discard" }) =>
      apiFetch(`${BASE}/webhook-events/${id}/${action}`, actionResultSchema.extend({ event: webhookEventSchema }), { method: "POST" }),
    onSettled: () => inv(adminKeys.webhookEventsAll, adminKeys.overview),
  });
}

// ── dues ────────────────────────────────────────────────────────────────────────────
export function useDuesOverview(params: Params) {
  return useQuery({
    queryKey: adminKeys.duesOverview(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/dues/overview`, duesOverviewSchema, { query: clean(params), signal }),
    placeholderData: keepPreviousData,
  });
}

export function useDues(schema: string) {
  return useQuery({ queryKey: adminKeys.dues(schema), queryFn: ({ signal }) => apiFetch(`${BASE}/dues/${encodeURIComponent(schema)}`, duesDetailSchema, { signal }), enabled: Boolean(schema) });
}

/** One of the 8 actions (FR-45.03); the entry comes back in the response, so the row updates in place. */
export function useDueAction(schema: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DueActionInput) =>
      apiFetch(`${BASE}/dues/${encodeURIComponent(schema)}/actions`, actionResultSchema.extend({ entry: duesDetailSchema }), { method: "POST", json: input }),
    onSuccess: (res) => {
      qc.setQueryData(adminKeys.dues(schema), res.entry);
      void qc.invalidateQueries({ queryKey: storeKey(PLATFORM_STORE, "admin", "dues", "overview") });
      void qc.invalidateQueries({ queryKey: adminKeys.wallet(res.entry.merchant_phone ?? "") });
    },
    // 409 «تم التعامل معه مسبقاً» → refresh the entry (US-45.3 a3).
    onError: () => void qc.invalidateQueries({ queryKey: adminKeys.dues(schema) }),
  });
}

// ── Sharwa Pay ──────────────────────────────────────────────────────────────────────
export function useTopups(params: Params) {
  return useQuery({
    queryKey: adminKeys.topups(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/sharwa-pay/topups`, topupListSchema, { query: clean(params), signal }),
    placeholderData: keepPreviousData,
  });
}

export function useTopupAction() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "approve" | "reject"; note?: string }) =>
      apiFetch(`${BASE}/sharwa-pay/topups/${id}/${action}`, actionResultSchema.extend({ topup: topupSchema }), { method: "POST", json: { note } }),
    onSettled: () => inv(adminKeys.sharwaPayAll, adminKeys.overview),
  });
}

export function useWithdrawals(params: Params) {
  return useQuery({
    queryKey: adminKeys.withdrawals(clean(params)),
    queryFn: ({ signal }) => apiFetch(`${BASE}/sharwa-pay/withdrawals`, withdrawalListSchema, { query: clean(params), signal }),
    placeholderData: keepPreviousData,
  });
}

export function useWithdrawalAction() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "confirm" | "reject"; note?: string }) =>
      apiFetch(`${BASE}/sharwa-pay/withdrawals/${id}/${action}`, actionResultSchema.extend({ withdrawal: withdrawalSchema }), { method: "POST", json: { note } }),
    onSettled: () => inv(adminKeys.sharwaPayAll, adminKeys.overview),
  });
}

export function useWallet(phone: string) {
  return useQuery({ queryKey: adminKeys.wallet(phone), queryFn: ({ signal }) => apiFetch(`${BASE}/sharwa-pay/wallets/${encodeURIComponent(phone)}`, walletDetailSchema, { signal }), enabled: Boolean(phone) });
}
