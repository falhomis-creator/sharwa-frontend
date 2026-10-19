"use client";

import { createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { storeKey } from "@/lib/query-keys";
import { idb } from "@/features/courier/idb";
import { flushQueue } from "@/features/courier/queue";
import { custodySchema, meSchema, shipmentDetailSchema, shipmentListSchema, type Tab } from "@/features/courier/schemas";

/**
 * M38 data layer. Keys are `[store, 'courier', agentId?, …]` (§11 IX). Reads go through a
 * snapshot: a successful answer is copied to IndexedDB, and when the network is gone the
 * last snapshot is served with its time, so the app stays readable offline (US-38.2 a2,
 * SC-38.5). Errors from the SERVER (401/403/404) are never masked by a snapshot.
 */
const CourierContext = createContext<{ store: string } | null>(null);

export function CourierProvider({ store, children }: { store: string; children: ReactNode }) {
  return createElement(CourierContext.Provider, { value: { store } }, children);
}

export function useCourierStore(): string {
  const ctx = useContext(CourierContext);
  if (!ctx) throw new Error("useCourierStore must be used inside the courier layout");
  return ctx.store;
}

export interface Snap<T> {
  data: T;
  savedAt: string;
  offline: boolean;
}

async function withSnapshot<T>(key: string, path: string, schema: ZodType<T>, query: Record<string, string | undefined>, signal: AbortSignal): Promise<Snap<T>> {
  try {
    const data = await apiFetch(path, schema, { query, signal });
    const savedAt = new Date().toISOString();
    void idb.set(key, { data, savedAt });
    return { data, savedAt, offline: false };
  } catch (err) {
    if (isApiError(err) || signal.aborted) throw err;
    const snap = await idb.get<{ data: unknown; savedAt: string }>(key);
    const parsed = snap ? schema.safeParse(snap.data) : null;
    if (snap && parsed?.success) return { data: parsed.data, savedAt: snap.savedAt, offline: true };
    throw err;
  }
}

export const courierKeys = (store: string) => ({
  all: storeKey(store, "courier"),
  me: storeKey(store, "courier", "me"),
  shipments: (tab: Tab | "all") => storeKey(store, "courier", "shipments", tab),
  shipment: (id: number) => storeKey(store, "courier", "shipment", id),
  custody: storeKey(store, "courier", "custody"),
});

export function useMe() {
  const store = useCourierStore();
  return useQuery({ networkMode: "always", queryKey: courierKeys(store).me, queryFn: ({ signal }) => withSnapshot(`snap:${store}:me`, "/api/bff/agent/me", meSchema, {}, signal) });
}

export function useAgentShipments(tab: Tab) {
  const store = useCourierStore();
  return useQuery({
    networkMode: "always",
    queryKey: courierKeys(store).shipments(tab),
    queryFn: ({ signal }) => withSnapshot(`snap:${store}:shipments:${tab}`, "/api/bff/agent/shipments", shipmentListSchema, { status: tab }, signal),
  });
}

export function useAgentShipment(id: number) {
  const store = useCourierStore();
  return useQuery({ networkMode: "always", queryKey: courierKeys(store).shipment(id), queryFn: ({ signal }) => withSnapshot(`snap:${store}:shipment:${id}`, `/api/bff/agent/shipments/${id}`, shipmentDetailSchema, {}, signal) });
}

export function useCustody() {
  const store = useCourierStore();
  return useQuery({ networkMode: "always", queryKey: courierKeys(store).custody, queryFn: ({ signal }) => withSnapshot(`snap:${store}:custody`, "/api/bff/agent/custody", custodySchema, {}, signal) });
}

export function useInvalidateCourier() {
  const store = useCourierStore();
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: courierKeys(store).all });
}

// ── connectivity ────────────────────────────────────────────────────────────────────
function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/** Replays the queue on mount and on every reconnect (FR-38.08), then refreshes the reads. */
export function useQueueReplay() {
  const invalidate = useInvalidateCourier();
  useEffect(() => {
    const run = () => void flushQueue().then((r) => (r.sent || r.failed ? invalidate() : undefined));
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── geolocation (FR-38.03): best effort, never blocks the action ─────────────────────
export function currentGeo(timeoutMs = 4000): Promise<{ geo_lat: number; geo_lng: number; geo_accuracy_m: number } | Record<string, never>> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve({});
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({}), timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          clearTimeout(timer);
          resolve({ geo_lat: Number(p.coords.latitude.toFixed(6)), geo_lng: Number(p.coords.longitude.toFixed(6)), geo_accuracy_m: Math.round(p.coords.accuracy) });
        },
        () => {
          clearTimeout(timer);
          resolve({});
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
      );
    } catch {
      clearTimeout(timer);
      resolve({});
    }
  });
}
