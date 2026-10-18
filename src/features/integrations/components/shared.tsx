"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ForbiddenState } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

/** M19 building blocks: status text + dot, copy affordances, the owner gate, confirmations. */

export type Tone = "success" | "warning" | "info" | "destructive" | "muted";
const DOT: Record<Tone, string> = { success: "bg-success", warning: "bg-warning", info: "bg-info", destructive: "bg-destructive", muted: "bg-muted-foreground/50" };
const TEXT: Record<Tone, string> = { success: "text-success", warning: "text-warning", info: "text-info", destructive: "text-destructive", muted: "text-muted-foreground" };

export function StatusText({ tone, children, className, testId }: { tone: Tone; children: ReactNode; className?: string; testId?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", TEXT[tone], className)} data-testid={testId}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

/** «قيد التكامل»: the contract is still a mock (§6 `[NEEDS BACKEND]`). Text only. */
export function PendingContractTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground" title="العقد الخلفي غير متاح بعد — البيانات تجريبية">
      قيد التكامل
    </span>
  );
}

/** The h2 a settings sub-page shows inside the M34 frame (its h1 is «الإعدادات»). */
export function SectionHeading({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <PendingContractTag />
        </div>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Domains, tracking and webhooks are the owner's alone (FR-19.09). */
export function OwnerGate({ what, children }: { what: string; children: ReactNode }) {
  const session = useSession();
  if (session.kind !== "merchant") return <ForbiddenState description={`${what} مقصورة على مالك المتجر.`} />;
  return <>{children}</>;
}

export async function copyText(value: string, label = "القيمة"): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast.success(`نُسخت ${label}`);
    return true;
  } catch {
    toast.error("تعذّر النسخ — حدّد القيمة وانسخها يدوياً.");
    return false;
  }
}

export function CopyButton({ value, label, className, testId }: { value: string; label: string; className?: string; testId?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={cn("size-11 shrink-0 lg:size-8", className)}
      aria-label={`نسخ ${label}`}
      title={`نسخ ${label}`}
      onClick={async () => {
        if (await copyText(value, label)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      data-testid={testId}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}

/**
 * A copyable value: Mono LTR, focusable, `C` copies it while focused (§6 shortcut), with the
 * copy button at the END side (constitution II).
 */
export function CopyValue({ value, label, testId, className }: { value: string; label: string; testId?: string; className?: string }) {
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if ((e.key === "c" || e.key === "C" || e.key === "ؤ") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      void copyText(value, label);
    }
  }
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <Mono
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={`${label}: ${value} — اضغط C للنسخ`}
        className="min-w-0 flex-1 break-all rounded-sm px-1 py-0.5 text-start text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        data-copy-value
        data-testid={testId}
      >
        {value}
      </Mono>
      <CopyButton value={value} label={label} />
    </span>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
  children,
  testId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
        <DialogFooter>
          <Button variant="outline" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button variant={destructive ? "destructive" : "default"} className="h-11 lg:h-9" disabled={pending} onClick={onConfirm} data-testid={testId ? `${testId}-confirm` : undefined}>
            {pending ? "جارٍ التنفيذ…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** DRF `{field:[msg]}` → RHF under each field, the first one focused. */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, err: unknown): boolean {
  if (!isApiError(err) || !err.fields) return false;
  const names = Object.keys(err.fields).filter((k) => k in form.getValues());
  names.forEach((k) => form.setError(k as Path<T>, { type: "server", message: err.fields![k]![0] }));
  if (names[0]) form.setFocus(names[0] as Path<T>);
  return names.length > 0;
}

export function errorMessage(err: unknown): string {
  return isApiError(err) ? err.userMessage : "حدث خطأ غير متوقع.";
}
