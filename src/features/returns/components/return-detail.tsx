"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/error-state";
import { Field } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useDecideReturn, useReturn, useReturnOptions, type DecisionPayload } from "@/features/returns/api";
import { RETURN_REFUND_METHOD_LABELS, type ReturnDetail } from "@/features/returns/schemas";
import { ReturnStatusText, ReturnTimeline } from "@/features/returns/components/status";

/**
 * One return request (M24 US-24.3), rendered by the `?return=` sheet AND `/dashboard/returns/[id]`.
 * Decisions only while `requested` (FR-24.09); every decision carries `version` (FR-24.03):
 * 409 → a warning bar with «تحديث ثم إعادة المحاولة» (no automatic retry, the chosen
 * location and note are kept); `CashLiquidityError` is shown verbatim from `{detail}` with
 * the alternatives. Shortcuts: `A` approve, `R` reject.
 */
const NO_PERMISSION = "يتطلب صلاحية «معالجة المرتجعات» (orders.process_returns)";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

type Mode = "approve" | "reject" | null;
type Failure = { kind: "conflict" } | { kind: "liquidity"; detail: string } | { kind: "network" } | { kind: "error"; message: string } | null;

export function ReturnDetailView({ returnId, variant }: { returnId: number; variant: "sheet" | "page" }) {
  const query = useReturn(returnId);
  const [now] = useState(() => new Date());
  // `?decide=approve|reject` opens the decision panel directly (deep link from M06 / the palette).
  const [decide] = useQueryState("decide", parseAsStringLiteral(["approve", "reject"] as const));

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-1" aria-busy="true" data-testid="return-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (query.error || !query.data) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return <ErrorState title={notFound ? "طلب الإرجاع غير موجود" : "تعذّر تحميل طلب الإرجاع"} error={query.error} onRetry={notFound ? undefined : () => void query.refetch()} />;
  }
  return <ReturnBody r={query.data} variant={variant} now={now} initialMode={decide} refetch={async () => (await query.refetch()).data} />;
}

function ReturnBody({
  r,
  variant,
  now,
  initialMode,
  refetch,
}: {
  r: ReturnDetail;
  variant: "sheet" | "page";
  now: Date;
  initialMode: Mode;
  refetch: () => Promise<ReturnDetail | undefined>;
}) {
  const { canPermission } = useAccess();
  const canWrite = canPermission("orders.process_returns");
  const decide = useDecideReturn(r.id);
  const locations = useReturnOptions().data?.locations ?? [];
  const [mode, setMode] = useState<Mode>(r.status === "requested" ? initialMode : null);
  // Defaults to the return's own location; the member may pick another (restock / cash box).
  const [locationId, setLocationId] = useState(r.location ? String(r.location.id) : "");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<{ location_id?: string; note?: string }>({});
  const [failure, setFailure] = useState<Failure>(null);
  const [retrying, setRetrying] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const locationRef = useRef<HTMLSelectElement>(null);

  const open = r.status === "requested";
  const hasRestock = r.line_items.some((l) => l.restock);
  const needsLocation = hasRestock;
  const showLocation = hasRestock || r.refund_method === "cash";
  const pending = decide.isPending || retrying;

  useEffect(() => {
    if (!open || !canWrite) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (variant === "page" && document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "r") {
        e.preventDefault();
        setMode(k === "a" ? "approve" : "reject");
        setFieldError({});
        queueMicrotask(() => (k === "a" ? locationRef.current : noteRef.current)?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canWrite, variant]);

  function payload(version: number): DecisionPayload | null {
    if (mode === "approve") {
      if (needsLocation && !locationId) {
        setFieldError({ location_id: "حدد موقع إعادة المخزون." });
        locationRef.current?.focus();
        return null;
      }
      return { decision: "approve", version, ...(locationId ? { location_id: Number(locationId) } : {}) };
    }
    if (mode === "reject") {
      if (note.trim().length < 3) {
        setFieldError({ note: "اكتب سبب الرفض." });
        noteRef.current?.focus();
        return null;
      }
      return { decision: "reject", version, note: note.trim() };
    }
    return null;
  }

  async function submit(version: number) {
    const body = payload(version);
    if (!body) return;
    setFieldError({});
    setFailure(null);
    try {
      const res = await decide.mutateAsync(body);
      setMode(null);
      toast.success(res.status === "approved" ? `اعتُمد الإرجاع #${res.id}` : `رُفض الإرجاع #${res.id}`);
    } catch (e) {
      if (!isApiError(e)) return setFailure({ kind: "network" });
      if (e.status === 409) return setFailure({ kind: "conflict" });
      if (e.detail && /CashLiquidityError/i.test(e.detail)) return setFailure({ kind: "liquidity", detail: e.detail });
      if (e.fields?.location_id || e.fields?.note) {
        setFieldError({ location_id: e.fields.location_id?.[0], note: e.fields.note?.[0] });
        return;
      }
      setFailure(e.status === 0 || e.status >= 502 ? { kind: "network" } : { kind: "error", message: e.userMessage });
    }
  }

  /** «تحديث ثم إعادة المحاولة»: reload, then resend the SAME decision on the fresh version — one click, never automatic. */
  async function refreshAndRetry() {
    setRetrying(true);
    try {
      const fresh = await refetch();
      if (!fresh) return;
      if (fresh.status !== "requested") {
        setFailure(null);
        setMode(null);
        toast.info(`حُسم الإرجاع من مستخدم آخر: ${fresh.status === "approved" ? "معتمد" : "مرفوض"}`);
        return;
      }
      await submit(fresh.version);
    } finally {
      setRetrying(false);
    }
  }

  const header = (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cn("font-semibold tracking-tight", variant === "page" ? "text-2xl" : "text-xl")}>
          إرجاع <Mono>#{r.id}</Mono>
        </h2>
        <ReturnStatusText status={r.status} />
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row label="الطلب">
          <Link href={`/dashboard/orders?order=${r.order_id}`} className="inline-flex min-h-11 items-center hover:underline lg:min-h-0" data-testid="return-order-link">
            <Mono>#{r.order_id}</Mono>
          </Link>
        </Row>
        <Row label="العميل">
          <span className="flex flex-col items-end gap-0.5 sm:items-start">
            <span>{r.customer_name}</span>
            {r.customer_phone ? (
              <Link href={`/dashboard/customers/${r.customer_phone}`} className="inline-flex min-h-11 items-center text-xs text-muted-foreground hover:underline lg:min-h-0" title="ملف العميل وسجل موثوقية الدفع عند الاستلام (M07)">
                <Mono>{prettyPhone(r.customer_phone)}</Mono>
              </Link>
            ) : null}
          </span>
        </Row>
        <Row label="طريقة الاسترجاع">{RETURN_REFUND_METHOD_LABELS[r.refund_method]}</Row>
        <Row label="الموقع">{r.location?.name ?? "—"}</Row>
        <Row label="السبب">{r.reason}</Row>
        <Row label="التاريخ">
          <time dateTime={r.created_at} className="text-muted-foreground">
            {formatDateTime(r.created_at)}
          </time>
        </Row>
      </dl>
    </div>
  );

  const lines = (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">السطور ({r.line_items.length})</h3>
      <ul className="rounded-lg border border-border" data-testid="return-lines">
        {r.line_items.map((li) => (
          <li key={li.id} className="flex items-center gap-3 border-b border-border p-2.5 last:border-0">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="truncate">{li.product_name}</span>
                {li.product_deleted ? <span className="rounded border border-border px-1 text-[11px] text-muted-foreground">محذوف</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {li.sku ? <Mono>{li.sku}</Mono> : null}
                {li.sku ? " · " : ""}
                {li.restock ? "يُعاد للمخزون" : "بلا إعادة مخزون"}
              </span>
            </span>
            <Mono className="text-sm text-muted-foreground">×{li.quantity_returned}</Mono>
            <Money value={li.display_refund_amount ?? li.refund_amount_allocated} className="min-w-24 text-end text-sm" />
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 p-2.5 text-sm font-medium">
          <span>المبلغ</span>
          <span data-testid="return-amount"><Money value={r.display_amount} /></span>
        </li>
      </ul>
    </section>
  );

  const decision = open ? (
    <section className="flex flex-col gap-3" data-testid="return-decision">
      <h3 className="text-sm font-medium">القرار</h3>
      {failure?.kind === "conflict" ? (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-warning/60 p-3 text-sm" data-testid="return-conflict">
          <p className="flex items-center gap-1.5 font-medium">
            <span aria-hidden className="size-1.5 rounded-full bg-warning" />
            حُدِّث الطلب من مستخدم آخر
          </p>
          <p className="text-muted-foreground">لم يُحفظ قرارك. اختياراتك محفوظة أدناه؛ حدِّث ثم أعِد المحاولة على آخر نسخة.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-11 gap-1.5 lg:h-8" onClick={() => void refreshAndRetry()} disabled={pending} data-testid="return-conflict-retry">
              <RefreshCw className="size-3.5" aria-hidden /> تحديث ثم إعادة المحاولة
            </Button>
            <Button size="sm" variant="ghost" className="h-11 lg:h-8" onClick={() => setFailure(null)}>
              إغلاق
            </Button>
          </div>
        </div>
      ) : null}
      {failure?.kind === "liquidity" ? (
        <div role="alert" className="flex flex-col gap-1 rounded-lg border border-destructive/50 p-3 text-sm" data-testid="return-liquidity">
          <p className="text-destructive">{failure.detail}</p>
          <p className="text-muted-foreground">غيّر الطريقة إلى محفظة العميل أو اختر موقعاً آخر.</p>
        </div>
      ) : null}
      {failure?.kind === "network" ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm" data-testid="return-network">
          <span>انقطع الاتصال بعد الإرسال — تحقق من الحالة قبل إعادة المحاولة.</span>
          <Button size="sm" variant="outline" className="h-11 lg:h-8" onClick={() => void refetch().then(() => setFailure(null))}>
            تحقق من الحالة
          </Button>
        </div>
      ) : null}
      {failure?.kind === "error" ? (
        <p role="alert" className="text-sm text-destructive" data-testid="return-error">
          {failure.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <span title={canWrite ? "اعتماد (A)" : NO_PERMISSION}>
          <Button
            variant={mode === "approve" ? "default" : "outline"}
            className="h-11 lg:h-9"
            disabled={!canWrite || pending}
            aria-pressed={mode === "approve"}
            aria-keyshortcuts="A"
            onClick={() => {
              setMode("approve");
              setFieldError({});
            }}
            data-testid="return-approve"
          >
            اعتماد
            <kbd className="ms-1 hidden font-mono text-[10px] text-muted-foreground lg:inline">A</kbd>
          </Button>
        </span>
        <span title={canWrite ? "رفض (R)" : NO_PERMISSION}>
          <Button
            variant={mode === "reject" ? "destructive" : "outline"}
            className="h-11 lg:h-9"
            disabled={!canWrite || pending}
            aria-pressed={mode === "reject"}
            aria-keyshortcuts="R"
            onClick={() => {
              setMode("reject");
              setFieldError({});
              queueMicrotask(() => noteRef.current?.focus());
            }}
            data-testid="return-reject"
          >
            رفض
            <kbd className="ms-1 hidden font-mono text-[10px] text-muted-foreground lg:inline">R</kbd>
          </Button>
        </span>
      </div>

      {mode === "approve" ? (
        <form
          className="flex flex-col gap-3 rounded-lg border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(r.version);
          }}
          data-testid="approve-form"
        >
          {showLocation ? (
            <Field
              label={hasRestock ? "موقع إعادة المخزون" : "موقع صرف النقد"}
              htmlFor="return-location"
              required={needsLocation}
              error={fieldError.location_id}
              hint={hasRestock ? "تُكتب حركة «إعادة مخزون من استرجاع» في دفتر هذا الموقع." : "اتركه فارغاً لصرفه من موقع الإرجاع."}
            >
              <NativeSelect
                id="return-location"
                ref={locationRef}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-11 lg:h-8"
                aria-invalid={Boolean(fieldError.location_id)}
                data-testid="approve-location"
              >
                <option value="">{hasRestock ? "اختر الموقع" : `موقع الإرجاع (${r.location?.name ?? "—"})`}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">لا سطر يُعاد للمخزون — الاعتماد يكتب الاسترجاع المالي فقط.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="h-11 lg:h-9" disabled={pending} data-testid="approve-confirm">
              {pending ? "جارٍ الاعتماد…" : "تأكيد الاعتماد"}
            </Button>
            <Button type="button" variant="ghost" className="h-11 lg:h-9" onClick={() => setMode(null)}>
              إلغاء
            </Button>
            <span className="text-xs text-muted-foreground">
              الإصدار <Mono>{r.version}</Mono>
            </span>
          </div>
        </form>
      ) : null}

      {mode === "reject" ? (
        <form
          className="flex flex-col gap-3 rounded-lg border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(r.version);
          }}
          data-testid="reject-form"
        >
          <Field label="سبب الرفض" htmlFor="return-note" required error={fieldError.note} hint="يُحفظ مع القرار ويظهر في الجدول الزمني.">
            <Textarea id="return-note" ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)} rows={3} aria-invalid={Boolean(fieldError.note)} data-testid="reject-note" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" className="h-11 lg:h-9" disabled={pending} data-testid="reject-confirm">
              {pending ? "جارٍ الرفض…" : "تأكيد الرفض"}
            </Button>
            <Button type="button" variant="ghost" className="h-11 lg:h-9" onClick={() => setMode(null)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  ) : r.decision_note ? (
    <section className="flex flex-col gap-1 text-sm" data-testid="return-decision-note">
      <h3 className="font-medium">سبب الرفض</h3>
      <p className="text-muted-foreground">{r.decision_note}</p>
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-6" data-testid="return-detail" data-return-id={r.id} data-version={r.version}>
      {header}
      <div className={cn("grid gap-6", variant === "page" && "lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]")}>
        <div className="flex min-w-0 flex-col gap-6">
          {lines}
          {decision}
        </div>
        <section className="flex min-w-0 flex-col gap-2">
          <h3 className="text-sm font-medium">الجدول الزمني</h3>
          <ReturnTimeline events={r.timeline} now={now} />
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:justify-start">
      <dt className="shrink-0 text-muted-foreground sm:w-28">{label}</dt>
      <dd className="min-w-0 text-end sm:text-start">{children}</dd>
    </div>
  );
}
