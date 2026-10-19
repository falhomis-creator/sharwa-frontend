"use client";

import { useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PAYOUT_STATUS_LABELS, SALE_ORDER_STATE_LABELS, type PayoutStatus, type SaleOrderState } from "@/features/affiliates/schemas";

/** Status as text + a semantic dot (constitution I) — never a filled badge. */
export function PayoutStatusText({ status }: { status: PayoutStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm" data-testid="payout-status" data-status={status}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", status === "pending" ? "bg-warning" : "bg-success")} />
      <span className={status === "paid" ? "text-muted-foreground" : undefined}>{PAYOUT_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function ActiveText({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm" data-testid="partner-active" data-active={active}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-success" : "bg-muted-foreground")} />
      <span className={active ? undefined : "text-muted-foreground"}>{active ? "نشط" : "موقوف"}</span>
    </span>
  );
}

/** §8 — a cancelled/refunded order next to its commission; the deduction is the server's call. */
export function OrderStateNote({ state }: { state: SaleOrderState }) {
  if (state === "active") return null;
  return <span className="ms-2 text-xs text-destructive" data-testid="order-state">{SALE_ORDER_STATE_LABELS[state]}</span>;
}

export async function copyText(text: string, done = "نُسخ إلى الحافظة.") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("تعذّر النسخ — انسخه يدوياً.");
  }
}

/** Direction-neutral copy icon (§11 II); 44px target below `lg`. */
export function CopyButton({ text, label, done, testId }: { text: string; label: string; done?: string; testId?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void copyText(text, done);
      }}
      aria-label={label}
      title={label}
      data-testid={testId}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:size-8"
    >
      <Copy className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

const MD = "(min-width: 768px)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** Side sheet from `md`, bottom sheet below (M17 §6 «الجوال»). */
export const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(MD).matches, () => true);
