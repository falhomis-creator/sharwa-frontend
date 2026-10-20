"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/features/platform-admin/schemas";

/**
 * Shared pieces of the two Sharwa Pay queues (M20 US-20.5): the status tabs, the
 * list/detail split (side panel ≥ lg, Sheet below) and the A/R keys.
 */
export const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export function StatusTabs({ value, onChange, labels }: { value: StatusFilter; onChange: (v: StatusFilter) => void; labels: Record<RequestStatus, string> }) {
  const all: Record<StatusFilter, string> = { ...labels, all: "الكل" };
  return (
    <nav aria-label="حالة الطلب" className="flex flex-wrap gap-1 border-b border-border" data-testid="status-tabs">
      {STATUS_FILTERS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          data-testid={`status-tab-${s}`}
          className={cn(
            "-mb-px min-h-11 border-b-2 px-3 text-sm transition-colors lg:min-h-9",
            value === s ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {all[s]}
        </button>
      ))}
    </nav>
  );
}

/** List on the start side, detail on the end side ≥ lg; the detail moves into a Sheet below lg. */
export function SplitView({ list, detail, open, onClose, detailTitle }: { list: ReactNode; detail: ReactNode; open: boolean; onClose: () => void; detailTitle: string }) {
  const isDesktop = useIsDesktop();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">{list}</div>
      {isDesktop ? (
        <aside aria-label={detailTitle} className="hidden min-w-0 lg:block" data-testid="detail-panel">
          {open ? detail : <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">اختر طلباً من القائمة لعرض تفاصيله.</p>}
        </aside>
      ) : (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
          <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto p-4" data-testid="detail-sheet">
            <SheetTitle className="sr-only">{detailTitle}</SheetTitle>
            {detail}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop ?? true;
}

/** `A` / `R` on the open request (US-20.5 shortcuts) — never while typing or with a dialog open. */
export function useDecisionKeys(enabled: boolean, onApprove: () => void, onReject: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector("[role=dialog][data-open], [data-slot=dialog-content]")) return;
      const k = e.key.toLowerCase();
      if (k === "a") {
        e.preventDefault();
        onApprove();
      } else if (k === "r") {
        e.preventDefault();
        onReject();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onApprove, onReject]);
}

export function NoteField({ value, onChange, error, label = "سبب الرفض (يصل للعميل)" }: { value: string; onChange: (v: string) => void; error?: string; label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="decision-note">{label}</Label>
      <Textarea id="decision-note" value={value} onChange={(e) => onChange(e.target.value)} rows={3} aria-invalid={Boolean(error)} data-testid="decision-note" />
      {error ? (
        <p className="text-xs text-destructive" data-testid="note-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end">{children}</dd>
    </div>
  );
}
