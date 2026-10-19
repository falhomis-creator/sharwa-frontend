"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  conversationDetailSchema,
  conversationListSchema,
  conversationSchema,
  convertResultSchema,
  inboxCountersSchema,
  messageListSchema,
  messageSchema,
  pickProductListSchema,
  type ConversationList,
  type ConversationStatus,
  type Message,
} from "@/features/inbox/schemas";

/**
 * M27 inbox hooks — keys `[tenant, 'inbox', …]` (§11 IX). Polling per FR-27.04: the open
 * conversation every 5s, the list and the unread badge every 15s; TanStack Query pauses
 * `refetchInterval` while the tab is hidden (`refetchIntervalInBackground: false`).
 */
export type Params = Record<string, string | number | undefined>;

export function inboxKeys(store: string) {
  return {
    all: storeKey(store, "inbox"),
    lists: storeKey(store, "inbox", "list"),
    list: (p: Params) => storeKey(store, "inbox", "list", p),
    detail: (id: number) => storeKey(store, "inbox", "detail", id),
    messages: (id: number) => storeKey(store, "inbox", "messages", id),
    counters: storeKey(store, "inbox", "counters"),
    products: (q: string) => storeKey(store, "inbox", "products", q),
  };
}

export const LIST_POLL_MS = 15_000;
export const THREAD_POLL_MS = 5_000;

export function useConversations(params: Params) {
  const store = useStore();
  return useQuery({
    queryKey: inboxKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/inbox/conversations", conversationListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_POLL_MS,
  });
}

export function useInboxCounters(enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: inboxKeys(store).counters,
    queryFn: ({ signal }) => apiFetch("/api/bff/inbox/counters", inboxCountersSchema, { signal }),
    refetchInterval: LIST_POLL_MS,
    enabled,
  });
}

export function useConversation(id: number | null) {
  const store = useStore();
  return useQuery({
    queryKey: inboxKeys(store).detail(id ?? 0),
    queryFn: ({ signal }) => apiFetch(`/api/bff/inbox/conversations/${id}`, conversationDetailSchema, { signal }),
    enabled: id !== null && id > 0,
    refetchInterval: LIST_POLL_MS,
  });
}

/** Every 6th poll re-reads the whole thread so delivery receipts of older messages land too. */
const pollTicks = new Map<string, number>();

export function mergeMessages(current: Message[] | undefined, incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of current ?? []) byId.set(m.client_id && m.id < 0 ? `c:${m.client_id}` : `i:${m.id}`, m);
  for (const m of incoming) {
    // A server row replaces its optimistic twin (same `client_id`) — no duplicate (§8).
    if (m.client_id) byId.delete(`c:${m.client_id}`);
    byId.set(`i:${m.id}`, m);
  }
  return [...byId.values()].sort((a, b) => (a.id < 0 && b.id < 0 ? 0 : a.id < 0 ? 1 : b.id < 0 ? -1 : a.id - b.id));
}

export function useMessages(id: number | null) {
  const store = useStore();
  const qc = useQueryClient();
  const key = inboxKeys(store).messages(id ?? 0);
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const current = qc.getQueryData<Message[]>(key);
      const tickKey = `${store}:${id}`;
      const tick = (pollTicks.get(tickKey) ?? 0) + 1;
      pollTicks.set(tickKey, tick);
      const lastId = current?.filter((m) => m.id > 0).at(-1)?.id;
      const full = !current || !lastId || tick % 6 === 0;
      const rows = await apiFetch(`/api/bff/inbox/conversations/${id}/messages`, messageListSchema, { query: full ? {} : { after: lastId }, signal });
      if (full) return mergeMessages(current?.filter((m) => m.id < 0), rows);
      return mergeMessages(current, rows);
    },
    enabled: id !== null && id > 0,
    refetchInterval: THREAD_POLL_MS,
  });
}

export function usePatchConversation(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status?: ConversationStatus; assigned_staff_id?: number | null; mark_read?: boolean }) =>
      apiFetch(`/api/bff/inbox/conversations/${id}`, conversationSchema, { method: "PATCH", json: body }),
    onSuccess: (row) => {
      // Patch every cached list page in place (no list jump), then refresh in the background.
      qc.setQueriesData<ConversationList>({ queryKey: inboxKeys(store).lists }, (old) =>
        old ? { ...old, results: old.results.map((r) => (r.id === row.id ? { ...r, ...row } : r)) } : old,
      );
      void qc.invalidateQueries({ queryKey: inboxKeys(store).detail(id) });
      void qc.invalidateQueries({ queryKey: inboxKeys(store).counters });
      void qc.invalidateQueries({ queryKey: storeKey(store, "dashboard", "counters") });
    },
  });
}

export function useSendMessage(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  const key = inboxKeys(store).messages(id);
  return useMutation({
    mutationFn: (body: { text?: string; template_id?: number; product_id?: number; client_id: string }) =>
      apiFetch(`/api/bff/inbox/conversations/${id}/messages`, messageSchema, { method: "POST", json: body, idempotencyKey: body.client_id }),
    onMutate: (body) => {
      // FR-27.06: the optimistic bubble «جارٍ الإرسال» (negative id, keyed by client_id).
      const optimistic: Message = {
        id: -Date.now(),
        direction: "outbound",
        sender_type: "staff",
        sender_name: null,
        text: body.text ?? "",
        media: [],
        status: null,
        error: null,
        product: null,
        client_id: body.client_id,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Message[]>(key, (old) => [...(old ?? []), optimistic]);
    },
    onSuccess: (msg) => qc.setQueryData<Message[]>(key, (old) => mergeMessages(old, [msg])),
    onError: (_err, body) => qc.setQueryData<Message[]>(key, (old) => (old ?? []).filter((m) => m.client_id !== body.client_id || m.id > 0)),
    onSettled: () => void qc.invalidateQueries({ queryKey: inboxKeys(store).lists }),
  });
}

export function useConvertToOrder(id: number) {
  const store = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { customer_name: string; customer_phone: string; address: string; delivery: "delivery"; items: Array<{ product_id: number; quantity: number }> }) =>
      apiFetch(`/api/bff/inbox/conversations/${id}/convert-to-order`, convertResultSchema, { method: "POST", json: body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inboxKeys(store).detail(id) });
      void qc.invalidateQueries({ queryKey: inboxKeys(store).lists });
      void qc.invalidateQueries({ queryKey: storeKey(store, "orders") });
    },
  });
}

export function usePickProducts(q: string, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: inboxKeys(store).products(q),
    queryFn: ({ signal }) => apiFetch("/api/bff/inbox/products", pickProductListSchema, { query: { q }, signal }),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
