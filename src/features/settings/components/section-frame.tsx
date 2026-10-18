"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";
import { SECTION_META, type SettingsSection } from "@/features/settings/schemas";
import { useSettingsStore } from "@/stores/settings";

/**
 * Building blocks of every settings section (M34 §6 «التخطيط»): a row is «label + short
 * description» at the start and the control at the end, rows split by 1px hairlines; the
 * dangerous sections (currency, payments, locations) sit in a thin red frame with NO fill.
 */

/** Who may edit what (M34 §2/§10): owner-only money/structure, managers for text sections. */
export function useSectionAccess(section: SettingsSection) {
  const session = useSession();
  const { canFeature } = useAccess();
  const meta = SECTION_META[section];
  const manager = session.kind === "merchant" || (session.staff?.roles ?? []).some((r) => r === "مدير المتجر" || r === "مدير الفرع");
  const canEdit = meta.ownerOnly ? session.kind === "merchant" : manager;
  return {
    visible: canFeature(meta.feature),
    canEdit,
    readOnlyReason: canEdit ? null : meta.ownerOnly ? "تحتاج صلاحية مالك المتجر" : "التعديل لمالك المتجر ومديره",
  };
}

/**
 * FR-34.11 + US-34.1.1: a section whose feature is off is not routable — it redirects to
 * «الهوية» with a notice. Rendering nothing meanwhile keeps the form from flashing.
 */
export function SectionGate({ section, children }: { section: SettingsSection; children: ReactNode }) {
  const router = useRouter();
  const { visible } = useSectionAccess(section);
  const warned = useRef(false);
  useEffect(() => {
    if (visible || warned.current) return;
    warned.current = true;
    toast(`قسم «${SECTION_META[section].title}» غير مفعّل في خطة متجرك`);
    router.replace("/dashboard/settings/identity");
  }, [visible, router, section]);
  return visible ? <>{children}</> : null;
}

/** «يُحفظ…» → «تم الحفظ 12:40» (Mono) beside the section title (FR-34.03). */
export function SaveIndicator({ section, onRetry }: { section: SettingsSection; onRetry?: () => void }) {
  const status = useSettingsStore((s) => s.auto[section]);
  if (!status || status.phase === "idle") return null;
  return (
    <span role="status" aria-live="polite" className="text-xs text-muted-foreground" data-testid="save-indicator" data-phase={status.phase}>
      {status.phase === "saving" ? "يُحفظ…" : null}
      {status.phase === "saved" ? (
        <>
          تم الحفظ <Mono>{status.at}</Mono>
        </>
      ) : null}
      {status.phase === "error" ? (
        <span className="text-destructive">
          {status.message ?? "لم يُحفظ"}
          {onRetry ? (
            <button type="button" onClick={onRetry} className="ms-2 inline-flex min-h-11 items-center underline underline-offset-4 lg:min-h-0">
              إعادة المحاولة
            </button>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function SectionHeader({
  section,
  indicator,
  readOnlyReason,
  children,
}: {
  section: SettingsSection;
  indicator?: ReactNode;
  readOnlyReason?: string | null;
  children?: ReactNode;
}) {
  const meta = SECTION_META[section];
  return (
    <header className="flex flex-col gap-1.5 border-b border-border pb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{meta.title}</h2>
        {indicator}
      </div>
      <p className="text-sm text-muted-foreground">{meta.description}</p>
      {meta.mode === "explicit" ? <p className="text-xs text-muted-foreground">يُحفظ هذا القسم بزر «حفظ التغييرات» بعد التأكيد.</p> : null}
      {readOnlyReason ? (
        <p role="note" className="text-sm text-muted-foreground" data-testid="read-only-note">
          للقراءة فقط — {readOnlyReason}.
        </p>
      ) : null}
      {children}
    </header>
  );
}

/** One setting: label + description at the start, control at the end; stacked on phones. */
export function SettingRow({
  label,
  description,
  htmlFor,
  error,
  children,
  className,
  counter,
}: {
  label: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  counter?: { value: number; max: number };
}) {
  return (
    <div className={cn("grid gap-3 border-b border-border py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:gap-6", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        {children}
        {counter ? (
          <Mono className={cn("self-end text-[11px] text-muted-foreground", counter.value > counter.max && "text-destructive")}>
            {counter.value}/{counter.max}
          </Mono>
        ) : null}
        {error ? (
          <p role="alert" id={htmlFor ? `${htmlFor}-error` : undefined} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A full-width row stacked vertically (long text, previews). */
export function SettingBlock({ label, description, htmlFor, error, children }: { label: ReactNode; description?: ReactNode; htmlFor?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-5 last:border-b-0">
      <div className="flex flex-col gap-1">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Money/structure settings: a thin red frame, no fill (M34 §6, constitution I). */
export function DangerFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-destructive/70 px-4 md:px-5" aria-label={title} data-testid="danger-frame">
      <p className="border-b border-border py-3 text-xs text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

export function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-16" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ))}
    </div>
  );
}

export function SectionError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <ErrorState error={error} onRetry={onRetry} />;
}

/** ⌘K «إعداد: …» lands on `#<field>` — focus it once the form is there (US-34.1.3). */
export function useFocusHash(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const found = document.getElementById(id);
    if (!found) return;
    // Base UI keeps the id on a hidden form proxy for switches; focus the visible control.
    const el = found.getAttribute("aria-hidden") === "true" ? (found.parentElement?.querySelector<HTMLElement>("[role=switch]") ?? found) : found;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }, [ready]);
}

/** «12:40» in western digits for the saved indicator. */
export function clockNow(): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}
