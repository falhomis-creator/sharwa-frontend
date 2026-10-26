"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field } from "@/components/shared/field";
import { Ltr, Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { fetchConnectUrl, useApp, useWaSummary, useWaTemplate, useWaTemplates, useSaveWaTemplate, useWaUsage } from "@/features/apps/api";
import { USAGE_EVENTS, USAGE_EVENT_LABELS, USAGE_STATUSES, USAGE_STATUS_LABELS, USAGE_STATUS_TONE, WHATSAPP_APP, type UsageRow, type WaTemplate } from "@/features/apps/schemas";
import { installationState } from "@/features/apps/components/apps-screens";
import { StatusDot } from "@/features/inbox/components/bits";

const WA_TABS = [
  { href: "/dashboard/apps/whatsapp", label: "اللوحة" },
  { href: "/dashboard/apps/whatsapp/usage", label: "سجل الاستخدام" },
  { href: "/dashboard/apps/whatsapp/templates", label: "القوالب" },
] as const;

/** Gate shared by the three WhatsApp panels: the feature, then «installed and active». */
function WaGate({ active, children }: { active: string; children: React.ReactNode }) {
  const app = useApp(WHATSAPP_APP);
  const state = app.data ? installationState(app.data.installation).value : null;
  return (
    <AccessGate feature="app_marketplace">
      <div className="flex flex-col gap-6">
        <PageHeader title="تطبيق الواتساب" description="إشعارات الطلبات والشحن والدفع عبر واتساب من رقم متجرك." />
        <nav aria-label="أقسام الواتساب" className="-mt-2 flex gap-1 overflow-x-auto border-b border-border">
          {WA_TABS.map((t) => (
            <Link key={t.href} href={t.href} aria-current={active === t.href ? "page" : undefined} className={cn("-mb-px inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-sm lg:h-9", active === t.href ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
            </Link>
          ))}
        </nav>
        {app.isLoading ? (
          <Skeleton className="h-48" />
        ) : state && state !== "active" ? (
          <EmptyState
            title={state === "not_installed" ? "تطبيق الواتساب غير مثبَّت" : "تطبيق الواتساب غير مفعّل"}
            description="ثبّته أو فعّله من صفحة التطبيق لتظهر لوحته."
            action={
              <Link href={`/dashboard/apps/${WHATSAPP_APP}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
                صفحة التطبيق
              </Link>
            }
          />
        ) : (
          children
        )}
      </div>
    </AccessGate>
  );
}

/** `/dashboard/apps/whatsapp` (US-30.3): SharwaConnect + a text summary of the usage. */
export function WhatsappDashboardScreen() {
  return (
    <WaGate active="/dashboard/apps/whatsapp">
      <WaDashboard />
    </WaGate>
  );
}

function WaDashboard() {
  const summary = useWaSummary();
  const [opening, setOpening] = useState(false);
  async function openConnect() {
    // Open synchronously (popup blockers), then point it at the server's one-time link.
    const win = window.open("about:blank", "_blank");
    setOpening(true);
    try {
      const { url } = await fetchConnectUrl();
      if (win) {
        win.opener = null;
        win.location.href = url;
      } else window.open(url, "_blank", "noopener");
    } catch (e) {
      win?.close();
      toast.error(isApiError(e) ? e.userMessage : "تعذّر فتح SharwaConnect.");
    } finally {
      setOpening(false);
    }
  }
  const s = summary.data;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-start gap-2">
        <h2 className="text-base font-semibold">ربط الجهاز</h2>
        <p className="max-w-prose text-sm text-muted-foreground">يفتح SharwaConnect في تبويب جديد لمسح رمز QR من واتساب على هاتف المتجر.</p>
        <Button variant="outline" className="h-11 lg:h-9" onClick={() => void openConnect()} disabled={opening} data-testid="wa-connect">
          <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
          {opening ? "جارٍ الفتح…" : "افتح SharwaConnect"}
        </Button>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">آخر 7 أيام</h2>
        {s ? (
          <p className="text-sm" data-testid="wa-summary">
            <Mono>{s.last_7_days}</Mono> رسالة · تم توصيل <Mono>{s.delivered}</Mono> · فشلت <Mono className={s.failed ? "text-destructive" : undefined}>{s.failed}</Mono> · في الطابور <Mono>{s.queued}</Mono>
            {s.failed ? (
              <>
                {" — "}
                <Link href="/dashboard/apps/whatsapp/usage?status=failed" className="underline underline-offset-4">
                  عرض الفاشلة
                </Link>
              </>
            ) : null}
          </p>
        ) : summary.isLoading ? (
          <Skeleton className="h-6 w-80" />
        ) : (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        )}
      </section>
    </div>
  );
}

const usageParsers = { status: parseAsStringLiteral(USAGE_STATUSES), event_type: parseAsStringLiteral(USAGE_EVENTS), from: parseAsString.withDefault(""), to: parseAsString.withDefault("") };

/** `/dashboard/apps/whatsapp/usage` (US-30.3 acceptance 1, FR-30.05). */
export function WhatsappUsageScreen() {
  return (
    <WaGate active="/dashboard/apps/whatsapp/usage">
      <UsageTable />
    </WaGate>
  );
}

function UsageTable() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(usageParsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const q = useWaUsage({ status: f.status ?? undefined, event_type: f.event_type ?? undefined, from: f.from || undefined, to: f.to || undefined, page: table.page, page_size: table.pageSize });
  const set = (patch: Parameters<typeof setF>[0]) => {
    void setF(patch);
    table.resetPage();
  };
  const active = Number(Boolean(f.status)) + Number(Boolean(f.event_type)) + Number(Boolean(f.from || f.to));
  const clear = () => set({ status: null, event_type: null, from: null, to: null });
  const columns = useMemo<ColumnDef<UsageRow, unknown>[]>(
    () => [
      { id: "at", header: headerLabel("الوقت"), cell: ({ row }) => <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.created_at, now)}</time> },
      { id: "ev", header: headerLabel("الحدث"), cell: ({ row }) => <span className="whitespace-nowrap">{USAGE_EVENT_LABELS[row.original.event_type]}</span> },
      { id: "to", header: headerLabel("المستلم"), cell: ({ row }) => <Ltr className="font-mono text-xs">{prettyPhone(row.original.recipient_phone)}</Ltr> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => (
          <span className="flex flex-col gap-0.5">
            <StatusDot tone={USAGE_STATUS_TONE[row.original.status]} label={USAGE_STATUS_LABELS[row.original.status]} testId="usage-status" value={row.original.status} />
            {row.original.error ? <span className="max-w-72 text-xs text-muted-foreground">{row.original.error}</span> : null}
          </span>
        ),
      },
      { id: "order", header: headerLabel("الطلب"), cell: ({ row }) => (row.original.order_id ? <Link href={`/dashboard/orders/${row.original.order_id}`} className="hover:underline"><Mono>#{row.original.order_id}</Mono></Link> : <span className="text-muted-foreground">—</span>) },
    ],
    [now],
  );
  const dateInput = "h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8";
  return (
    <DataTable<UsageRow>
      testId="wa-usage"
      caption="سجل استخدام الواتساب"
      columns={columns}
      data={q.data?.results}
      getRowId={(r) => String(r.id)}
      total={q.data?.count ?? 0}
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      isLoading={q.isLoading}
      isFetching={q.isFetching}
      error={q.error}
      onRetry={() => void q.refetch()}
      isFiltered={active > 0}
      toolbar={
        <FilterBar activeCount={active} onClear={clear}>
          <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as (typeof USAGE_STATUSES)[number] | null })} options={USAGE_STATUSES.map((s) => ({ value: s, label: USAGE_STATUS_LABELS[s] }))} testId="filter-usage-status" />
          <FilterSelect label="الحدث" value={f.event_type ?? ""} onChange={(v) => set({ event_type: (v || null) as (typeof USAGE_EVENTS)[number] | null })} options={USAGE_EVENTS.map((s) => ({ value: s, label: USAGE_EVENT_LABELS[s] }))} />
          <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" dir="ltr" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value || null })} className={dateInput} aria-label="من تاريخ" />
          </label>
          <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" dir="ltr" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value || null })} className={dateInput} aria-label="إلى تاريخ" />
          </label>
        </FilterBar>
      }
      renderMobileCard={(r) => (
        <div className="flex min-h-16 w-full flex-col gap-1 p-3">
          <span className="flex items-baseline gap-2">
            <span className="flex-1 text-sm font-medium">{USAGE_EVENT_LABELS[r.event_type]}</span>
            <time className="text-[11px] text-muted-foreground">{formatRelative(r.created_at, now)}</time>
          </span>
          <Ltr className="self-start font-mono text-xs">{prettyPhone(r.recipient_phone)}</Ltr>
          <StatusDot tone={USAGE_STATUS_TONE[r.status]} label={USAGE_STATUS_LABELS[r.status]} />
          {r.error ? <span className="text-xs text-muted-foreground">{r.error}</span> : null}
        </div>
      )}
      emptyState={<EmptyState title="لا استخدام بعد" description="تظهر هنا كل رسالة يرسلها التطبيق: الحدث والمستلم والحالة." />}
      noResultsState={<EmptyState title="لا رسائل تطابق الفلاتر" action={<button type="button" onClick={clear} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">مسح الفلاتر</button>} />}
    />
  );
}

/** `/dashboard/apps/whatsapp/templates` — one template per event type. */
export function WhatsappTemplatesScreen() {
  return (
    <WaGate active="/dashboard/apps/whatsapp/templates">
      <TemplatesList />
    </WaGate>
  );
}

function TemplatesList() {
  const q = useWaTemplates();
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (!q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border" data-testid="wa-templates">
      {q.data.map((t) => (
        <li key={t.id}>
          <Link href={`/dashboard/apps/whatsapp/templates/${t.id}`} className="flex flex-col gap-1 py-3 hover:bg-muted/40 md:flex-row md:gap-6">
            <span className="text-sm font-medium md:w-40 md:shrink-0">{t.name}</span>
            <span dir="auto" className="line-clamp-2 min-w-0 flex-1 text-sm text-muted-foreground">
              {t.body}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** `/dashboard/apps/whatsapp/templates/[id]` (US-30.3 acceptance 2, FR-30.06). */
export function WhatsappTemplateEditor({ id }: { id: number }) {
  return (
    <WaGate active="/dashboard/apps/whatsapp/templates">
      <Editor id={id} />
    </WaGate>
  );
}

function Editor({ id }: { id: number }) {
  const q = useWaTemplate(id);
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (!q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <EditorForm key={`${q.data.updated_at}:${q.data.is_custom ?? ""}`} t={q.data} />;
}

function EditorForm({ t }: { t: WaTemplate }) {
  const save = useSaveWaTemplate(t.id);
  const { session } = useAccess();
  const owner = session.kind === "merchant";
  const [body, setBody] = useState(t.body);
  const [error, setError] = useState<string | undefined>();
  const area = useRef<HTMLTextAreaElement | null>(null);
  const used = new Set([...body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!));
  const missing = t.required.filter((v) => !used.has(v));

  function insert(v: string) {
    const el = area.current;
    const token = `{{${v}}}`;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: s, selectionEnd: e } = el;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  }

  /** An empty body tells the server to drop the merchant's text and use the platform default again. */
  async function reset() {
    try {
      await save.mutateAsync("");
      setError(undefined);
      toast.success("عاد القالب إلى النص الافتراضي.");
    } catch (e) {
      setError(isApiError(e) ? (e.fields?.body?.[0] ?? e.userMessage) : "تعذّرت الاستعادة.");
    }
  }

  async function submit() {
    if (missing.length) return setError(`المتغير {{${missing[0]}}} إلزامي في هذا القالب.`);
    try {
      await save.mutateAsync(body);
      setError(undefined);
      toast.success("حُفظ القالب.");
    } catch (e) {
      setError(isApiError(e) ? (e.fields?.body?.[0] ?? e.userMessage) : "تعذّر الحفظ.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2" data-testid="wa-template-editor">
      <div className="flex flex-col gap-3">
        <Link href="/dashboard/apps/whatsapp/templates" className="self-start text-sm text-muted-foreground hover:underline">
          ← القوالب
        </Link>
        <h2 className="flex flex-wrap items-baseline gap-2 text-base font-semibold">
          {t.name}
          <span className="text-xs font-normal text-muted-foreground" data-testid="wa-template-origin">
            {t.is_custom ? "نصّك المخصَّص" : "النص الافتراضي"}
          </span>
        </h2>
        <div className="flex flex-wrap gap-1.5" aria-label="المتغيرات المتاحة">
          {t.variables.map((v) => (
            <button key={v} type="button" disabled={!owner} onClick={() => insert(v)} className="inline-flex h-11 items-center rounded-md border border-border px-2 font-mono text-xs hover:bg-muted lg:h-7" dir="ltr" data-testid="wa-variable">
              {`{{${v}}}`}
              {t.required.includes(v) ? <span className="ms-1 text-muted-foreground">*</span> : null}
            </button>
          ))}
        </div>
        <Field label="نص القالب" htmlFor="wa-body" error={error} counter={{ value: body.length, max: 1024 }} hint="* متغير إلزامي لا يمكن حذفه.">
          <Textarea ref={area} id="wa-body" rows={8} dir="auto" value={body} readOnly={!owner} onChange={(e) => setBody(e.target.value)} aria-invalid={Boolean(error)} data-testid="wa-body" />
        </Field>
        {owner ? (
          <div className="flex flex-wrap gap-2">
            <Button className="h-11 lg:h-9" onClick={() => void submit()} disabled={save.isPending || body === t.body} data-testid="wa-save">
              {save.isPending ? "جارٍ الحفظ…" : "حفظ القالب"}
            </Button>
            {t.is_custom ? (
              <Button variant="ghost" className="h-11 lg:h-9" onClick={() => void reset()} disabled={save.isPending} data-testid="wa-reset">
                استعادة النص الافتراضي
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">تحرير القوالب لمالك المتجر.</p>
        )}
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">المعاينة بقيم مثال من الخادم</h3>
        <p dir="auto" className="whitespace-pre-wrap rounded-lg border border-border p-3 text-sm" data-testid="wa-preview">
          {t.preview}
        </p>
        {body !== t.body ? <p className="text-xs text-muted-foreground">تُحدَّث المعاينة بعد الحفظ.</p> : null}
      </section>
    </div>
  );
}
