"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { ForbiddenState } from "@/components/shared/access-gate";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCategories } from "@/features/organization/api";
import { useProducts, useProduct } from "@/features/products/api/products";
import { TEMPORAL_STATE_LABELS, type TemporalState } from "@/features/marketing/schemas";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

/** The hub's child pages share one back link — text, no icon (constitution I). */
export function BackToHub({ href = "/dashboard/marketing", label = "مركز التسويق" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
      <span aria-hidden>→</span> {label}
    </Link>
  );
}

const STATE_DOT: Record<TemporalState, string> = {
  active: "bg-success",
  not_started: "bg-muted-foreground",
  expired: "bg-muted-foreground",
  exhausted: "bg-warning",
  inactive: "bg-muted-foreground",
};

/** Temporal state as text with a 6px dot — never a coloured chip (FR-13.02). */
export function StateText({ state, className }: { state: TemporalState; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", state !== "active" && "text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", STATE_DOT[state])} />
      {TEMPORAL_STATE_LABELS[state]}
    </span>
  );
}

/** DRF `{field:[msg]}` → RHF; returns false when the error was not a field error. */
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

/** A category select fed by `/api/bff/categories` (M05) — top-level first, children indented. */
export function CategorySelect({ id, value, onChange, error, label = "التصنيف", required }: { id: string; value: string; onChange: (v: string) => void; error?: string; label?: string; required?: boolean }) {
  const cats = useCategories();
  const rows = cats.data ?? [];
  const sorted = [...rows.filter((c) => c.parent_id === null), ...rows.filter((c) => c.parent_id !== null)];
  return (
    <Field label={label} htmlFor={id} error={error} required={required}>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 lg:h-9" aria-invalid={!!error} data-testid={id}>
        <option value="">{cats.isLoading ? "جارٍ التحميل…" : "اختر التصنيف"}</option>
        {sorted.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.parent_id !== null ? `— ${c.name}` : c.name}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

/**
 * Search-then-pick product field (same shape as M06's new-order picker): a text search
 * against `/api/bff/products?status=published`, six results, one picked row with a «تغيير» link.
 */
export function ProductPicker({ id, value, onChange, error, label = "المنتج", required, hint }: { id: string; value: string; onChange: (v: string) => void; error?: string; label?: string; required?: boolean; hint?: ReactNode }) {
  const [q, setQ] = useState("");
  const listId = useId();
  const selectedId = value ? Number(value) : null;
  const selected = useProduct(selectedId);
  const results = useProducts({ q, page_size: 6, status: "published" }, { enabled: !selectedId && q.trim().length > 0 });
  return (
    <Field label={label} htmlFor={id} error={error} required={required} hint={hint}>
      {selectedId ? (
        <div className="flex min-h-11 items-center justify-between gap-3 surface-card px-3 py-1.5 lg:min-h-9" data-testid={`${id}-selected`}>
          <span className="flex min-w-0 flex-col">
            {selected.data ? <span className="truncate text-sm">{selected.data.name}</span> : selected.isLoading ? <Skeleton className="h-4 w-32" /> : <span className="text-sm text-muted-foreground">منتج #{selectedId}</span>}
            {selected.data ? <Mono className="text-[11px] text-muted-foreground">{selected.data.sku}</Mono> : null}
          </span>
          <button type="button" className="inline-flex min-h-11 shrink-0 items-center px-1 text-xs text-muted-foreground underline-offset-4 hover:underline lg:min-h-0" onClick={() => { onChange(""); setQ(""); }}>
            تغيير
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المنتج أو SKU" className={inputClass} aria-invalid={!!error} aria-controls={listId} autoComplete="off" data-testid={id} />
          {q.trim() ? (
            <ul id={listId} role="listbox" className="divide-y divide-border/60 surface-card overflow-hidden">
              {results.isLoading ? (
                <li className="px-3 py-2"><Skeleton className="h-4 w-40" /></li>
              ) : results.data && results.data.results.length > 0 ? (
                results.data.results.map((p) => (
                  <li key={p.id} role="option" aria-selected={false}>
                    <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-1.5 text-start text-sm hover:bg-muted lg:min-h-9" onClick={() => onChange(String(p.id))} data-testid={`${id}-option-${p.id}`}>
                      <span className="truncate">{p.name}</span>
                      <Mono className="text-[11px] text-muted-foreground">{p.sku}</Mono>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-muted-foreground">لا نتائج</li>
              )}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}

/** A plain confirm dialog — text, two buttons, optional details line (FR-13.04 «إرسال تذكير»). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, pending, onConfirm, children, testId }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; confirmLabel: string; destructive?: boolean; pending?: boolean; onConfirm: () => void; children?: ReactNode; testId?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => onOpenChange(false)} disabled={pending}>
            إلغاء
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} className="h-11 lg:h-9" onClick={onConfirm} disabled={pending} data-testid={testId ? `${testId}-confirm` : undefined}>
            {pending ? "جارٍ التنفيذ…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Form footer: primary save, cancel link, inline non-field error. */
export function FormActions({ pending, saveLabel = "حفظ", cancelHref, error, extra }: { pending: boolean; saveLabel?: string; cancelHref: string; error?: string | null; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-11 lg:h-9" disabled={pending} data-testid="save">
          {pending ? "جارٍ الحفظ…" : saveLabel}
        </Button>
        <Link href={cancelHref} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">
          إلغاء
        </Link>
        {extra}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full lg:h-9" />
      ))}
    </div>
  );
}

/** `datetime-local` value ⇄ ISO. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

/** Owner-only screens (abandoned carts, campaigns, timeline, loyalty, gifting — M13 §2). */
export function OwnerGate({ description, children }: { description: string; children: ReactNode }) {
  const { session } = useAccess();
  if (session.kind !== "merchant") return <ForbiddenState description={description} />;
  return <>{children}</>;
}
