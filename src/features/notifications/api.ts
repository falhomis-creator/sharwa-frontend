"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  notificationListSchema,
  notificationSummarySchema,
  readAllResponseSchema,
  readResponseSchema,
  type Notification,
  type NotificationSummary,
} from "@/features/notifications/schemas";

/**
 * M49 data (T080). The summary is polled every 30s and ONLY while the tab is visible
 * (`refetchIntervalInBackground: false`), plus on focus; the list is fetched when the panel
 * opens. Reads are optimistic on both caches with a rollback (FR-49.05).
 */
export function notificationKeys(store: string) {
  return {
    all: storeKey(store, "notifications"),
    summary: storeKey(store, "notifications", "summary"),
    list: (kind: string, unread: boolean) => storeKey(store, "notifications", "list", kind, unread),
    lists: storeKey(store, "notifications", "list"),
  };
}

export function useNotificationSummary() {
  const store = useStore();
  return useQuery({
    queryKey: notificationKeys(store).summary,
    queryFn: ({ signal }) => apiFetch("/api/bff/notifications/summary", notificationSummarySchema, { signal }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useNotifications(kind: string, unread: boolean, enabled: boolean) {
  const store = useStore();
  return useQuery({
    queryKey: notificationKeys(store).list(kind, unread),
    queryFn: ({ signal }) =>
      apiFetch("/api/bff/notifications", notificationListSchema, { query: { kind: kind || undefined, unread: unread ? "1" : undefined, page_size: 30 }, signal }),
    enabled,
    retry: false,
  });
}

type ListData = { count: number; next: string | null; previous: string | null; results: Notification[] };

export function useMarkRead() {
  const store = useStore();
  const qc = useQueryClient();
  const keys = notificationKeys(store);

  function snapshot() {
    return {
      lists: qc.getQueriesData<ListData>({ queryKey: keys.lists }),
      summary: qc.getQueryData<NotificationSummary>(keys.summary),
    };
  }
  function restore(s: ReturnType<typeof snapshot>) {
    for (const [k, v] of s.lists) qc.setQueryData(k, v);
    qc.setQueryData(keys.summary, s.summary);
  }
  /** `target`: one notification, or every unread one (optionally of some kinds). */
  function locallyRead(target: Notification | { kinds: string[] }) {
    const at = new Date().toISOString();
    const single = "id" in target ? target : null;
    const kinds = single ? [] : (target as { kinds: string[] }).kinds;
    for (const [k, v] of qc.getQueriesData<ListData>({ queryKey: keys.lists })) {
      if (!v) continue;
      qc.setQueryData<ListData>(k, {
        ...v,
        results: v.results.map((n) => {
          const hit = n.read_at === null && (single ? n.id === single.id : !kinds.length || kinds.includes(n.kind));
          return hit ? { ...n, read_at: at } : n;
        }),
      });
    }
    qc.setQueryData<NotificationSummary>(keys.summary, (old) => {
      if (!old) return old;
      const by_kind = { ...old.by_kind };
      if (single) {
        by_kind[single.kind] = Math.max(0, (by_kind[single.kind] ?? 0) - single.count);
        return { ...old, unread_total: Math.max(0, old.unread_total - single.count), by_kind };
      }
      if (!kinds.length) return { unread_total: 0, by_kind: {}, has_critical: false };
      let total = old.unread_total;
      for (const k of kinds) {
        total -= by_kind[k] ?? 0;
        delete by_kind[k];
      }
      return { ...old, unread_total: Math.max(0, total), by_kind };
    });
  }

  return {
    async read(n: Notification) {
      if (n.read_at) return;
      const snap = snapshot();
      locallyRead(n);
      try {
        await apiFetch(`/api/bff/notifications/${n.id}/read`, readResponseSchema, { method: "POST" });
      } catch {
        restore(snap);
        throw new Error("read failed");
      } finally {
        void qc.invalidateQueries({ queryKey: keys.summary });
      }
    },
    async readAll(kinds: string[]) {
      const snap = snapshot();
      locallyRead({ kinds });
      try {
        await apiFetch("/api/bff/notifications/read-all", readAllResponseSchema, { method: "POST", json: kinds.length ? { kind: kinds.join(",") } : {} });
      } catch {
        restore(snap);
        throw new Error("read-all failed");
      } finally {
        void qc.invalidateQueries({ queryKey: keys.all });
      }
    },
  };
}
