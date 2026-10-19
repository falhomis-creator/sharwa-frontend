"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  assigneeListSchema,
  sessionCountersSchema,
  sessionDetailSchema,
  sessionListSchema,
  sessionSchema,
  ticketListSchema,
  ticketSchema,
  timelineItemSchema,
  type SessionDetail,
  type Ticket,
  type TicketList,
  type TicketStatus,
  type TimelineItem,
} from "@/features/support/schemas";

/** M31/M32 hooks — keys `[tenant, 'support', …]`. */
export type Params = Record<string, string | number | undefined>;

export function supportKeys(store: string) {
  return {
    all: storeKey(store, "support"),
    sessions: (p: Params) => storeKey(store, "support", "sessions", p),
    sessionLists: storeKey(store, "support", "sessions"),
    session: (id: number) => storeKey(store, "support", "session", id),
    sessionCounters: storeKey(store, "support", "session-counters"),
    tickets: (p: Params) => storeKey(store, "support", "tickets", p),
    ticketLists: storeKey(store, "support", "tickets"),
    ticket: (id: number) => storeKey(store, "support", "ticket", id),
    assignees: storeKey(store, "support", "assignees"),
  };
}

/** FR-32.08 / FR-31.04: the list polls (10s), paused in a hidden tab. */
export function useSessions(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: supportKeys(store).sessions(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/support/sessions", sessionListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });
}

export function useSessionCounters() {
  const store = useStore();
  return useQuery({ queryKey: supportKeys(store).sessionCounters, queryFn: ({ signal }) => apiFetch("/api/bff/support/sessions/counters", sessionCountersSchema, { signal }), refetchInterval: 15_000 });
}

/** The session timeline: full first, then `?after=<last id>` every 5s, merged by id. */
export function useSession(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  const key = supportKeys(store).session(id);
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const current = qc.getQueryData<SessionDetail>(key);
      const last = current?.timeline.filter((t) => t.id > 0).at(-1)?.id;
      const res = await apiFetch(`/api/bff/support/sessions/${id}`, sessionDetailSchema, { query: last ? { after: last } : {}, signal });
      if (!current || !last) return res;
      return { ...res, timeline: mergeTimeline(current.timeline, res.timeline) };
    },
    refetchInterval: 5_000,
    retry: false,
  });
}

export function mergeTimeline(current: TimelineItem[], incoming: TimelineItem[]): TimelineItem[] {
  const out = current.filter((t) => !(t.id < 0 && incoming.some((i) => i.client_id && i.client_id === t.client_id)));
  for (const i of incoming) if (!out.some((t) => t.id === i.id)) out.push(i);
  return out.sort((a, b) => (a.id < 0 ? 1 : b.id < 0 ? -1 : a.id - b.id));
}

export function useSessionAction(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, version }: { action: "takeover" | "release" | "close"; version: number }) =>
      apiFetch(`/api/bff/support/sessions/${id}/${action}`, sessionSchema, { method: "POST", json: { version } }),
    onSuccess: (s) => qc.setQueryData<SessionDetail>(supportKeys(store).session(id), (old) => (old ? { ...old, session: s } : old)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: supportKeys(store).sessionLists });
      void qc.invalidateQueries({ queryKey: supportKeys(store).sessionCounters });
    },
  });
}

export function useSessionReply(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  const key = supportKeys(store).session(id);
  return useMutation({
    mutationFn: (body: { text: string; client_id: string }) => apiFetch(`/api/bff/support/sessions/${id}/messages`, timelineItemSchema, { method: "POST", json: body, idempotencyKey: body.client_id }),
    onMutate: (body) =>
      qc.setQueryData<SessionDetail>(key, (old) =>
        old ? { ...old, timeline: [...old.timeline, { id: -Date.now(), kind: "message", sender_type: "staff", sender_name: null, text: body.text, client_id: body.client_id, created_at: new Date().toISOString() }] } : old,
      ),
    onSuccess: (item) => qc.setQueryData<SessionDetail>(key, (old) => (old ? { ...old, timeline: mergeTimeline(old.timeline, [item]) } : old)),
    onError: (_e, body) => qc.setQueryData<SessionDetail>(key, (old) => (old ? { ...old, timeline: old.timeline.filter((t) => t.client_id !== body.client_id || t.id > 0) } : old)),
  });
}

export function useTickets(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: supportKeys(store).tickets(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/support/tickets", ticketListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useTicket(id: number | null) {
  const store = useStore();
  return useQuery({ queryKey: supportKeys(store).ticket(id ?? 0), queryFn: ({ signal }) => apiFetch(`/api/bff/support/tickets/${id}`, ticketSchema, { signal }), enabled: id !== null && id > 0, retry: false });
}

export function useAssignees() {
  const store = useStore();
  return useQuery({ queryKey: supportKeys(store).assignees, queryFn: ({ signal }) => apiFetch("/api/bff/support/assignees", assigneeListSchema, { signal }), staleTime: 300_000 });
}

export function useCreateTicket() {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description: string; assigned_to_id: number | null }) => apiFetch("/api/bff/support/tickets", ticketSchema, { method: "POST", json: body }),
    onSuccess: (t) => {
      qc.setQueryData(supportKeys(store).ticket(t.id), t);
      void qc.invalidateQueries({ queryKey: supportKeys(store).ticketLists });
    },
  });
}

/** FR-32.04 acceptance 1: the row and the detail flip first (optimistic), then the server. */
export function usePatchTicket(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status?: TicketStatus; assigned_to_id?: number | null; title?: string; description?: string }) => apiFetch(`/api/bff/support/tickets/${id}`, ticketSchema, { method: "PATCH", json: body }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: supportKeys(store).ticketLists });
      const lists = qc.getQueriesData<TicketList>({ queryKey: supportKeys(store).ticketLists });
      const detail = qc.getQueryData<Ticket>(supportKeys(store).ticket(id));
      if (body.status) {
        qc.setQueriesData<TicketList>({ queryKey: supportKeys(store).ticketLists }, (old) => (old ? { ...old, results: old.results.map((r) => (r.id === id ? { ...r, status: body.status! } : r)) } : old));
        if (detail) qc.setQueryData<Ticket>(supportKeys(store).ticket(id), { ...detail, status: body.status });
      }
      return { lists, detail };
    },
    onError: (_e, _b, ctx) => {
      ctx?.lists.forEach(([k, v]) => qc.setQueryData(k, v));
      if (ctx?.detail) qc.setQueryData(supportKeys(store).ticket(id), ctx.detail);
    },
    onSuccess: (t) => qc.setQueryData(supportKeys(store).ticket(id), t),
    onSettled: () => void qc.invalidateQueries({ queryKey: supportKeys(store).ticketLists }),
  });
}
