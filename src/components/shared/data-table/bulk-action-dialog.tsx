"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";

/**
 * Bulk action flow (FR-04.12, FR-06.05): preview by count → run → report
 * «18 نجحت، 2 مرفوضة» with the reason of every rejection. Nothing runs before the
 * confirmation; a network failure keeps the dialog open with a retry.
 */
export interface BulkReport {
  succeeded: number;
  failed: Array<{ id: string | number; label?: string; reason: string }>;
}

export function BulkActionDialog({
  open,
  onOpenChange,
  title,
  count,
  description,
  confirmLabel,
  destructive = false,
  children,
  run,
  onDone,
  confirmDisabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  count: number;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Extra inputs (target category, tag…) rendered under the preview. */
  children?: ReactNode;
  run: () => Promise<BulkReport>;
  onDone?: (report: BulkReport) => void;
  /** e.g. a required target (status, category) is not chosen yet. */
  confirmDisabled?: boolean;
}) {
  const [phase, setPhase] = useState<"preview" | "running" | "report">("preview");
  const [report, setReport] = useState<BulkReport | null>(null);
  const [error, setError] = useState("");

  function reset(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setPhase("preview");
      setReport(null);
      setError("");
    }
  }

  async function confirm() {
    setPhase("running");
    setError("");
    try {
      const result = await run();
      setReport(result);
      setPhase("report");
      onDone?.(result);
    } catch (err) {
      setError(isApiError(err) ? err.userMessage : "تعذّر تنفيذ الإجراء.");
      setPhase("preview");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-md" data-testid="bulk-dialog">
        <DialogTitle>{title}</DialogTitle>
        {phase !== "report" ? (
          <>
            <DialogDescription>
              سيُطبَّق على <Mono className="text-foreground">{formatNumber(count)}</Mono>{" "}
              {count === 1 ? "عنصر محدد" : "عناصر محددة"}.{description ? ` ${description}` : ""}
            </DialogDescription>
            {children}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => reset(false)}>
                إلغاء
              </Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                size="lg"
                className="h-11 lg:h-9"
                disabled={phase === "running" || confirmDisabled}
                onClick={() => void confirm()}
                data-testid="bulk-confirm"
              >
                {phase === "running" ? "جارٍ التنفيذ…" : confirmLabel}
              </Button>
            </DialogFooter>
          </>
        ) : report ? (
          <>
            <div role="status" className="flex flex-col gap-3" data-testid="bulk-report">
              <p className="text-sm">
                <Mono className="text-success">{formatNumber(report.succeeded)}</Mono> نجحت
                {report.failed.length > 0 ? (
                  <>
                    {"، "}
                    <Mono className="text-destructive">{formatNumber(report.failed.length)}</Mono> مرفوضة
                  </>
                ) : null}
              </p>
              {report.failed.length > 0 ? (
                <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">
                  {report.failed.map((f) => (
                    <li key={String(f.id)} className="flex items-start justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 truncate">{f.label ?? <Mono>#{f.id}</Mono>}</span>
                      <span className="shrink-0 text-muted-foreground">{f.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <DialogFooter>
              <Button size="lg" className="h-11 lg:h-9" onClick={() => reset(false)}>
                تم
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
