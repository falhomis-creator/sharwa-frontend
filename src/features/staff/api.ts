"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  alertsSchema,
  approvalSchema,
  approvalsSchema,
  assignmentsSchema,
  auditListSchema,
  createdTokenSchema,
  devicesSchema,
  effectivePermissionsSchema,
  overrideSchema,
  overridesSchema,
  permissionsSchema,
  roleSchema,
  rolesSchema,
  rosterSchema,
  staffCountersSchema,
  staffListSchema,
  staffSchema,
  staffSessionsSchema,
  tokensSchema,
  verifySchema,
  type RosterEntry,
} from "@/features/staff/schemas";

/** M18 data hooks — tenant-prefixed keys, Zod on every response, writes invalidate their lists. */
export type Params = Record<string, string | number | undefined>;

export function staffKeys(store: string) {
  return {
    all: storeKey(store, "staff"),
    list: (p: Params) => storeKey(store, "staff", "list", p),
    detail: (id: number) => storeKey(store, "staff", "detail", id),
    sub: (id: number, part: string, extra?: Params) => storeKey(store, "staff", "detail", id, part, extra),
    roles: storeKey(store, "staff", "roles"),
    role: (id: number) => storeKey(store, "staff", "roles", id),
    permissions: storeKey(store, "staff", "permissions"),
    approvals: (p: Params) => storeKey(store, "staff", "approvals", p),
    approvalsAll: storeKey(store, "staff", "approvals"),
    audit: (p: Params) => storeKey(store, "staff", "audit", p),
    alerts: (p: Params) => storeKey(store, "staff", "alerts", p),
    alertsAll: storeKey(store, "staff", "alerts"),
    counters: storeKey(store, "staff", "counters"),
  };
}

export function useStaffList(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).list(params), queryFn: ({ signal }) => apiFetch("/api/bff/staff", staffListSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled });
}

export function useStaffMember(id: number) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).detail(id), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}`, staffSchema, { signal }) });
}

export function usePermissions(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).permissions, queryFn: ({ signal }) => apiFetch("/api/bff/permissions", permissionsSchema, { signal }), staleTime: 5 * 60_000, enabled });
}

export function useRoles(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).roles, queryFn: ({ signal }) => apiFetch("/api/bff/roles", rolesSchema, { signal }), enabled });
}

export function useRole(id: number | null) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).role(id ?? 0), queryFn: ({ signal }) => apiFetch(`/api/bff/roles/${id}`, roleSchema, { signal }), enabled: id !== null });
}

export function useAssignments(id: number) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).sub(id, "assignments"), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/assignments`, assignmentsSchema, { signal }) });
}

export function useOverrides(id: number) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).sub(id, "overrides"), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/overrides`, overridesSchema, { signal }) });
}

export function useEffectivePermissions(id: number, locationId: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: staffKeys(store).sub(id, "effective", { location_id: locationId ?? undefined }),
    queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/effective-permissions`, effectivePermissionsSchema, { query: { location_id: locationId ?? undefined }, signal }),
  });
}

export function useStaffSessions(id: number, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).sub(id, "sessions"), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/sessions`, staffSessionsSchema, { signal }), enabled });
}

export function useTokens(id: number, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).sub(id, "tokens"), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/tokens`, tokensSchema, { signal }), enabled });
}

export function useDevices(id: number, enabled: boolean) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).sub(id, "devices"), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/devices`, devicesSchema, { signal }), enabled });
}

export function useRoster(id: number) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).sub(id, "roster"), queryFn: ({ signal }) => apiFetch(`/api/bff/staff/${id}/roster`, rosterSchema, { signal }) });
}

export function useApprovals(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).approvals(params), queryFn: ({ signal }) => apiFetch("/api/bff/approvals", approvalsSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled });
}

export function useAuditLog(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).audit(params), queryFn: ({ signal }) => apiFetch("/api/bff/audit-log", auditListSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled });
}

export function useAlerts(params: Params, enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).alerts(params), queryFn: ({ signal }) => apiFetch("/api/bff/behavior-alerts", alertsSchema, { query: params, signal }), placeholderData: keepPreviousData, enabled });
}

/** The sidebar/section counters — refreshed every 60s while visible (FR-18.10). */
export function useStaffCounters(enabled = true) {
  const store = useStore();
  return useQuery({ queryKey: staffKeys(store).counters, queryFn: ({ signal }) => apiFetch("/api/bff/staff/counters", staffCountersSchema, { signal }), refetchInterval: 60_000, enabled });
}

/** One place for every write; each invalidates what it touched. */
export function useStaffWrites() {
  const store = useStore();
  const client = useQueryClient();
  const keys = staffKeys(store);
  const invalidate = (...qs: Array<readonly unknown[]>) => Promise.all(qs.map((queryKey) => client.invalidateQueries({ queryKey })));
  const touchAudit = () => client.invalidateQueries({ queryKey: storeKey(store, "staff", "audit") });

  return {
    createStaff: useMutation({
      mutationFn: (body: Record<string, unknown>) => apiFetch("/api/bff/staff", staffSchema, { method: "POST", json: body }),
      onSuccess: () => void invalidate(storeKey(store, "staff", "list")).then(touchAudit),
    }),
    patchStaff: useMutation({
      mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => apiFetch(`/api/bff/staff/${id}`, staffSchema, { method: "PATCH", json: body }),
      onSuccess: (_d, { id }) => void invalidate(storeKey(store, "staff", "list"), keys.detail(id)).then(touchAudit),
    }),
    terminate: useMutation({
      mutationFn: (id: number) => apiFetch(`/api/bff/staff/${id}/terminate`, staffSchema, { method: "POST" }),
      onSuccess: (_d, id) => void invalidate(storeKey(store, "staff", "list"), keys.detail(id), keys.sub(id, "sessions")).then(touchAudit),
    }),
    revokeSessions: useMutation({
      mutationFn: (id: number) => apiFetch(`/api/bff/staff/${id}/revoke-sessions`, z.object({ token_version: z.number() }), { method: "POST" }),
      onSuccess: (_d, id) => void invalidate(keys.detail(id), keys.sub(id, "sessions")).then(touchAudit),
    }),
    putAssignments: useMutation({
      mutationFn: ({ id, rows }: { id: number; rows: Array<{ location_id: number; role_id: number | null; location_role: string | null }> }) =>
        apiFetch(`/api/bff/staff/${id}/assignments`, assignmentsSchema, { method: "PUT", json: rows }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "assignments"), storeKey(store, "staff", "detail", id, "effective"), keys.detail(id), storeKey(store, "staff", "list"), keys.roles).then(touchAudit),
    }),
    addOverride: useMutation({
      mutationFn: ({ id, body }: { id: number; body: { permission_code: string; allow: boolean } }) => apiFetch(`/api/bff/staff/${id}/overrides`, overrideSchema, { method: "POST", json: body }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "overrides"), storeKey(store, "staff", "detail", id, "effective")).then(touchAudit),
    }),
    removeOverride: useMutation({
      mutationFn: ({ id, oid }: { id: number; oid: number }) => apiFetch(`/api/bff/staff/${id}/overrides/${oid}`, z.unknown(), { method: "DELETE" }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "overrides"), storeKey(store, "staff", "detail", id, "effective")).then(touchAudit),
    }),
    endSession: useMutation({
      mutationFn: ({ id, sid }: { id: number; sid: number | null }) => apiFetch(sid === null ? `/api/bff/staff/${id}/sessions` : `/api/bff/staff/${id}/sessions/${sid}`, z.unknown(), { method: "DELETE" }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "sessions")).then(touchAudit),
    }),
    createToken: useMutation({
      mutationFn: ({ id, name }: { id: number; name: string }) => apiFetch(`/api/bff/staff/${id}/tokens`, createdTokenSchema, { method: "POST", json: { name } }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "tokens")).then(touchAudit),
    }),
    revokeToken: useMutation({
      mutationFn: ({ id, tid }: { id: number; tid: number }) => apiFetch(`/api/bff/staff/${id}/tokens/${tid}`, z.unknown(), { method: "DELETE" }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "tokens")).then(touchAudit),
    }),
    removeDevice: useMutation({
      mutationFn: ({ id, did }: { id: number; did: number }) => apiFetch(`/api/bff/staff/${id}/devices/${did}`, z.unknown(), { method: "DELETE" }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "devices")),
    }),
    putRoster: useMutation({
      mutationFn: ({ id, rows }: { id: number; rows: RosterEntry[] }) => apiFetch(`/api/bff/staff/${id}/roster`, rosterSchema, { method: "PUT", json: rows }),
      onSuccess: (_d, { id }) => void invalidate(keys.sub(id, "roster")),
    }),
    saveRole: useMutation({
      mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) =>
        apiFetch(id === null ? "/api/bff/roles" : `/api/bff/roles/${id}`, roleSchema, { method: id === null ? "POST" : "PATCH", json: body }),
      onSuccess: () => void invalidate(keys.roles).then(touchAudit),
    }),
    deleteRole: useMutation({
      mutationFn: (id: number) => apiFetch(`/api/bff/roles/${id}`, z.unknown(), { method: "DELETE" }),
      onSuccess: () => void invalidate(keys.roles).then(touchAudit),
    }),
    resolveApproval: useMutation({
      mutationFn: ({ id, decision, note, version }: { id: number; decision: "approved" | "rejected"; note?: string; version: number }) =>
        apiFetch(`/api/bff/approvals/${id}/resolve`, approvalSchema, { method: "POST", json: { decision, note, version } }),
      onSuccess: () => void invalidate(keys.approvalsAll, keys.counters).then(touchAudit),
    }),
    verifyChain: useMutation({
      mutationFn: (simulateBreak: boolean) => apiFetch(`/api/bff/audit-log/verify${simulateBreak ? "?break=1" : ""}`, verifySchema, { method: "POST" }),
    }),
    readAlert: useMutation({
      mutationFn: (id: number) => apiFetch(`/api/bff/behavior-alerts/${id}/read`, z.unknown(), { method: "POST" }),
      onSuccess: () => void invalidate(keys.alertsAll, keys.counters),
    }),
  };
}
