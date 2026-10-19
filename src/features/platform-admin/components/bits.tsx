"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { Tone } from "@/features/platform-admin/schemas/common";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import type { AdminArea } from "@/features/platform-admin/schemas/auth";

/**
 * Console building blocks (M20/M45/M46). Text-first (constitution I): a status is a 6px
 * dot + a word, never a coloured pill; amounts and codes are Mono inside an LTR run.
 */
const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/50",
};
const TEXT: Record<Tone, string> = {
  success: "text-foreground",
  warning: "text-warning",
  info: "text-foreground",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

export function StatusText({ tone, children, className, testId }: { tone: Tone; children: ReactNode; className?: string; testId?: string }) {
  return (
    <span data-testid={testId} data-tone={tone} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs", TEXT[tone], className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

/** `schema_name`, codes, phones: Mono in an isolated LTR run (constitution II). */
export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi>
      <Mono className={cn("text-xs", className)}>{children}</Mono>
    </bdi>
  );
}

/**
 * FR-20.02 / FR-45.06 — every write passes a confirmation that names the store and the
 * effect. `impact` is the sentence the owner must read; the button carries the verb.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  impact,
  confirmLabel,
  destructive,
  pending,
  disabled,
  onConfirm,
  children,
  testId = "confirm-dialog",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  impact?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent data-testid={testId} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {impact ? (
          <p data-testid="confirm-impact" className={cn("rounded-md border px-3 py-2 text-sm", destructive ? "border-destructive/40 text-destructive" : "border-border")}>
            {impact}
          </p>
        ) : null}
        {children}
        <DialogFooter>
          <Button variant="outline" className="h-11 lg:h-8" onClick={() => onOpenChange(false)} disabled={pending}>
            إلغاء
          </Button>
          <Button data-testid="confirm-action" variant={destructive ? "destructive" : "default"} className="h-11 lg:h-8" onClick={onConfirm} disabled={pending || disabled}>
            {pending ? "جارٍ التنفيذ…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Show the server's sentence verbatim (FR-45.04): success/warning toast, or the error's own text. */
export function toastResult(res: { detail: string; level?: "success" | "warning" | "error" }) {
  if (res.level === "warning") toast.warning(res.detail);
  else if (res.level === "error") toast.error(res.detail);
  else toast.success(res.detail);
}

export function toastError(err: unknown, fallback = "تعذّر تنفيذ الإجراء.") {
  toast.error(isApiError(err) ? err.userMessage : fallback);
}

/** A write control for an area the role may not write: rendered, disabled, explained (FR-06/09). */
export function WriteGate({ area, children }: { area: AdminArea; children: (allowed: boolean) => ReactNode }) {
  const allowed = useCanWrite(area);
  return <>{children(allowed)}</>;
}

export const OPERATOR_READ_ONLY = "للقراءة فقط — هذا الإجراء لمالك المنصة.";

/** A small hook for «confirm one thing» flows: which row is pending confirmation. */
export function useConfirm<T>() {
  const [target, setTarget] = useState<T | null>(null);
  return { target, open: (t: T) => setTarget(t), close: () => setTarget(null), isOpen: target !== null };
}

export function ReadOnlyNote({ className }: { className?: string }) {
  return (
    <p role="note" data-testid="read-only-note" className={cn("text-xs text-muted-foreground", className)}>
      {OPERATOR_READ_ONLY}
    </p>
  );
}
