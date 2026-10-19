"use client";

import { useState } from "react";
import { Mono } from "@/components/shared/mono";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useInvalidateCourier, useOnline } from "@/features/courier/api";
import { ActionBar, primaryAction, secondaryAction } from "@/features/courier/components/shell";
import { flushQueue, pendingCount, retryAction, useQueueStore, type ActionState } from "@/features/courier/queue";

/** `/agent/queue` (§6): the local actions and their state; a failed one retries with its ORIGINAL uuid. */
const STATE_LABELS: Record<ActionState, string> = { queued: "بانتظار الإرسال", sending: "قيد الإرسال", done: "أُرسل", failed: "فشل" };

export function QueueScreen() {
  const actions = useQueueStore((s) => s.actions);
  const clearDone = useQueueStore((s) => s.clearDone);
  const online = useOnline();
  const invalidate = useInvalidateCourier();
  const [busy, setBusy] = useState(false);
  const sorted = [...actions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pending = pendingCount(actions);

  return (
    <div className="flex flex-col gap-4" data-testid="queue-screen">
      <p className="text-sm text-muted-foreground">
        <Mono className="text-foreground" data-testid="queue-pending">
          {pending}
        </Mono>{" "}
        إجراءات بانتظار المزامنة · تُحفظ على هذا الجهاز حتى يؤكدها الخادم.
      </p>
      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">لا إجراءات معلّقة.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {sorted.map((a) => (
            <li key={a.uuid} className="flex flex-col gap-1 p-3" data-testid="queue-item" data-state={a.state}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm">{a.label}</span>
                <span className={cn("text-xs", a.state === "failed" ? "text-destructive" : a.state === "done" ? "text-success" : "text-muted-foreground")}>{STATE_LABELS[a.state]}</span>
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <Mono>{formatDateTime(a.created_at)}</Mono>
                <span>
                  محاولات <Mono>{a.attempts}</Mono>
                </span>
                <Mono className="truncate">{a.uuid.slice(0, 8)}</Mono>
              </span>
              {a.error ? <span className="text-xs text-destructive">{a.error}</span> : null}
              {a.state === "failed" ? (
                <button type="button" className={`${secondaryAction} mt-1`} onClick={() => void retryAction(a.uuid).then(() => invalidate())} data-testid="queue-retry">
                  إعادة المحاولة بنفس المعرّف
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ActionBar>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={secondaryAction} onClick={clearDone} disabled={!actions.some((a) => a.state === "done")}>
            مسح المُرسَل
          </button>
          <button
            type="button"
            className={primaryAction}
            disabled={!online || pending === 0 || busy}
            onClick={() => {
              setBusy(true);
              void flushQueue().then(() => {
                setBusy(false);
                void invalidate();
              });
            }}
            data-testid="queue-sync"
          >
            مزامنة الآن
          </button>
        </div>
      </ActionBar>
    </div>
  );
}
