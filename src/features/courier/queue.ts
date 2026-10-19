"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiFetchRaw } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { idbStateStorage } from "@/features/courier/idb";

/**
 * The offline action queue (FR-38.02/08, §5 `OfflineAction`). Every field action is
 * written here FIRST — with its `client_generated_uuid` and `event_time` fixed at the
 * moment of the tap — then sent. A network failure leaves it `queued`; reconnecting
 * replays the queue IN ORDER with the SAME payload, so the server's idempotency key turns
 * a resend into the same answer (`duplicate:true`), never a second event (SC-38.1).
 * A 401 stops the queue (`failed`, «سجّل الدخول ثم أعد المحاولة») without deleting anything.
 */
export type ActionKind = "status" | "scan" | "partial" | "shift_start" | "shift_end";
export type ActionState = "queued" | "sending" | "done" | "failed";

export interface OfflineAction {
  uuid: string;
  kind: ActionKind;
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  shipment_id: number | null;
  created_at: string;
  attempts: number;
  state: ActionState;
  status_code: number | null;
  result: unknown;
  error: string | null;
}

const RETENTION_MS = 7 * 24 * 3_600_000;

interface QueueStore {
  actions: OfflineAction[];
  put: (a: OfflineAction) => void;
  patch: (uuid: string, p: Partial<OfflineAction>) => void;
  remove: (uuid: string) => void;
  clearDone: () => void;
}

export const useQueueStore = create<QueueStore>()(
  persist(
    (set) => ({
      actions: [],
      put: (a) => set((s) => ({ actions: [...s.actions.filter((x) => x.uuid !== a.uuid), a] })),
      patch: (uuid, p) => set((s) => ({ actions: s.actions.map((x) => (x.uuid === uuid ? { ...x, ...p } : x)) })),
      remove: (uuid) => set((s) => ({ actions: s.actions.filter((x) => x.uuid !== uuid) })),
      clearDone: () => set((s) => ({ actions: s.actions.filter((x) => x.state !== "done") })),
    }),
    { name: "sharwa-courier-queue", storage: createJSONStorage(() => idbStateStorage), version: 1 },
  ),
);

export function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export type SendOutcome = { sent: true; ok: true; data: unknown } | { sent: true; ok: false; status: number; message: string; body: unknown } | { sent: false };

async function send(a: OfflineAction): Promise<SendOutcome> {
  const { patch } = useQueueStore.getState();
  patch(a.uuid, { state: "sending", attempts: a.attempts + 1 });
  try {
    const res = await apiFetchRaw(a.endpoint, { method: "POST", json: a.payload });
    const data: unknown = res.status === 204 ? null : await res.json();
    patch(a.uuid, { state: "done", status_code: res.status, result: data, error: null });
    return { sent: true, ok: true, data };
  } catch (err) {
    if (isApiError(err)) {
      const message = err.status === 401 ? "انتهت الجلسة — سجّل الدخول ثم أعد المحاولة." : err.userMessage;
      patch(a.uuid, { state: "failed", status_code: err.status, result: err.body ?? null, error: message });
      return { sent: true, ok: false, status: err.status, message, body: err.body };
    }
    // Network: stays in the queue for the next replay.
    patch(a.uuid, { state: "queued", error: "بلا شبكة — سيُعاد الإرسال تلقائياً." });
    return { sent: false };
  }
}

/** Write first, then try once. The caller shows the server's answer, or «في الطابور». */
export async function dispatch(input: Pick<OfflineAction, "kind" | "endpoint" | "payload" | "label" | "shipment_id"> & { uuid?: string }): Promise<SendOutcome> {
  const action: OfflineAction = { uuid: input.uuid ?? uuid(), created_at: new Date().toISOString(), attempts: 0, state: "queued", status_code: null, result: null, error: null, ...input };
  useQueueStore.getState().put(action);
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: false };
  return send(action);
}

let flushing = false;

/** Replays queued actions in creation order; stops at the first 401 or network failure. */
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const now = Date.now();
    const pending = [...useQueueStore.getState().actions].filter((a) => a.state === "queued" || a.state === "sending").sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const a of pending) {
      if (now - Date.parse(a.created_at) > RETENTION_MS) {
        useQueueStore.getState().patch(a.uuid, { state: "failed", error: "انتهت مهلة 7 أيام دون إرسال." });
        failed += 1;
        continue;
      }
      const r = await send(a);
      if (!r.sent) break;
      if (r.ok) sent += 1;
      else {
        failed += 1;
        if (r.status === 401) break;
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

/** Retry a failed action with its ORIGINAL uuid and payload. */
export async function retryAction(uuidValue: string): Promise<SendOutcome> {
  const a = useQueueStore.getState().actions.find((x) => x.uuid === uuidValue);
  if (!a) return { sent: false };
  useQueueStore.getState().patch(a.uuid, { state: "queued", error: null });
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: false };
  return send({ ...a, state: "queued" });
}

export function pendingCount(actions: OfflineAction[]): number {
  return actions.filter((a) => a.state === "queued" || a.state === "sending").length;
}
