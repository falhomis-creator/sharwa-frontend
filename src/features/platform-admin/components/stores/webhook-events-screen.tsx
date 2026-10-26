"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useWebhookEventAction, useWebhookEvents } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { TimeCell } from "@/features/platform-admin/components/store-cells";
import { WEBHOOK_EVENT_LABELS, WEBHOOK_EVENT_STATUSES, type WebhookEvent, type WebhookEventStatus } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/webhook-events` (M20 US-20.7 a1): `PendingWebhookEvent` rows with the
 * collapsible payload (Mono, LTR), «إعادة المعالجة» and «تجاهل» — both confirmed. A store
 * that no longer exists allows «تجاهل» only (M20 §8). `status` lives in the URL; the
 * default view is the pending queue.
 */
const TONE: Record<WebhookEventStatus, "warning" | "success" | "muted"> = { pending: "warning", resolved: "success", discarded: "muted" };
/** Django's DLQ `carrier_code` values (PendingWebhookEvent — carrier webhooks; default `sharwa_ship`). */
const SOURCES = ["sharwa_ship", "aramex", "smsa", "jeeb", "kuraimi", "whatsapp"] as const;

const parsers = {
  status: parseAsStringLiteral([...WEBHOOK_EVENT_STATUSES, "all"] as const).withDefault("pending"),
  source: parseAsString.withDefault(""),
};

export function WebhookEventsScreen() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const canWrite = useCanWrite("webhooks");
  const query = useWebhookEvents({ status: f.status === "all" ? undefined : f.status, source: f.source || undefined, page: table.page, page_size: table.pageSize });
  const act = useWebhookEventAction();
  const [target, setTarget] = useState<{ event: WebhookEvent; action: "retry" | "discard" } | null>(null);

  const set = (patch: Partial<{ status: (typeof WEBHOOK_EVENT_STATUSES)[number] | "all" | null; source: string | null }>) => {
    void setF(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<WebhookEvent, unknown>[]>(
    () => [
      {
        id: "source",
        header: headerLabel("المصدر"),
        cell: ({ row }) => (
          <span className="flex flex-col gap-0.5">
            <Code>{row.original.source}</Code>
            <Code className="text-muted-foreground">{row.original.event_type}</Code>
          </span>
        ),
      },
      {
        id: "store",
        header: headerLabel("المتجر"),
        cell: ({ row }) =>
          row.original.store_missing ? (
            <StatusText tone="muted" testId="store-missing">
              المتجر محذوف (<Code>{row.original.schema_name}</Code>)
            </StatusText>
          ) : row.original.schema_name ? (
            <Link href={`/stores/${encodeURIComponent(row.original.schema_name)}`} className="whitespace-nowrap hover:underline">
              {row.original.store_name}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <StatusText tone={TONE[row.original.status]}>{WEBHOOK_EVENT_LABELS[row.original.status]}</StatusText> },
      {
        id: "reason",
        header: headerLabel("سبب التعليق والحمولة"),
        cell: ({ row }) => (
          <div className="flex min-w-56 flex-col gap-1 py-1">
            <span>{row.original.reason}</span>
            <details className="group" data-testid="payload">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">الحمولة</summary>
              <pre dir="ltr" className="mt-1 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-start font-mono text-xs leading-relaxed">
                {row.original.payload}
              </pre>
            </details>
          </div>
        ),
      },
      { id: "attempts", meta: { numeric: true }, header: headerLabel("المحاولات"), cell: ({ row }) => <Mono>{row.original.attempts}</Mono> },
      { id: "received_at", meta: { className: "whitespace-nowrap" }, header: headerLabel("وصل"), cell: ({ row }) => <TimeCell iso={row.original.received_at} now={now} /> },
      {
        id: "actions",
        meta: { srOnlyHeader: true },
        header: headerLabel("الإجراءات"),
        cell: ({ row }) => <RowActions event={row.original} canWrite={canWrite} onAct={(action) => setTarget({ event: row.original, action })} />,
      },
    ],
    [now, canWrite],
  );

  async function confirm() {
    if (!target) return;
    try {
      const res = await act.mutateAsync({ id: target.event.id, action: target.action });
      toastResult(res);
    } catch (err) {
      toastError(err);
    }
    setTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="أحداث Webhook المعلّقة" description="أحداث وصلت من البوابات وشركات الشحن ولم تُطبَّق — أعد معالجتها أو تجاهلها." />
      {!canWrite ? <ReadOnlyNote /> : null}
      <DataTable<WebhookEvent>
        testId="webhook-events"
        caption="أحداث Webhook"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered
        noResultsState={<EmptyState title={f.status === "pending" ? "لا أحداث معلّقة" : "لا أحداث"} />}
        renderMobileCard={(e) => (
          <div className="flex flex-col gap-2 py-1">
            <span className="flex flex-wrap items-center gap-2">
              <Code>{e.source}</Code>
              <Code className="text-muted-foreground">{e.event_type}</Code>
              <StatusText tone={TONE[e.status]}>{WEBHOOK_EVENT_LABELS[e.status]}</StatusText>
            </span>
            <span className="text-sm">{e.store_missing ? "المتجر محذوف" : e.store_name ?? "—"}</span>
            <span className="text-sm text-muted-foreground">{e.reason}</span>
            <RowActions event={e} canWrite={canWrite} onAct={(action) => setTarget({ event: e, action })} />
          </div>
        )}
        toolbar={
          <FilterBar activeCount={Number(f.status !== "pending") + Number(Boolean(f.source))} onClear={() => set({ status: null, source: null })}>
            <FilterSelect
              label="الحالة"
              value={f.status === "all" ? "" : f.status}
              allLabel="كل الحالات"
              onChange={(v) => set({ status: (v || "all") as (typeof WEBHOOK_EVENT_STATUSES)[number] | "all" })}
              options={WEBHOOK_EVENT_STATUSES.map((s) => ({ value: s, label: WEBHOOK_EVENT_LABELS[s] }))}
              testId="filter-status"
            />
            <FilterSelect label="المصدر" value={f.source} onChange={(v) => set({ source: v || null })} options={SOURCES.map((s) => ({ value: s, label: s }))} testId="filter-source" />
          </FilterBar>
        }
      />
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target?.action === "retry" ? "إعادة معالجة الحدث" : "تجاهل الحدث"}
        description={
          target ? (
            <>
              <Code>{target.event.source}</Code> · <Code>{target.event.event_type}</Code> — {target.event.store_missing ? "متجر محذوف" : target.event.store_name}
            </>
          ) : null
        }
        impact={target?.action === "retry" ? "يُطبَّق الحدث على المتجر الآن كما لو وصل للتو." : "يُغلق الحدث بلا تطبيق ولا يُعاد عرضه في المعلّقة."}
        destructive={target?.action === "discard"}
        confirmLabel={target?.action === "retry" ? "أعد المعالجة" : "تجاهل"}
        pending={act.isPending}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}

function RowActions({ event, canWrite, onAct }: { event: WebhookEvent; canWrite: boolean; onAct: (a: "retry" | "discard") => void }) {
  if (event.status !== "pending") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-11 lg:h-7"
          disabled={!canWrite || event.store_missing}
          title={event.store_missing ? "المتجر لم يعد موجوداً — التجاهل فقط." : undefined}
          onClick={() => onAct("retry")}
          data-testid="event-retry"
        >
          إعادة المعالجة
        </Button>
        <Button size="sm" variant="ghost" className="h-11 lg:h-7" disabled={!canWrite} onClick={() => onAct("discard")} data-testid="event-discard">
          تجاهل
        </Button>
      </span>
      {event.store_missing ? <span className="text-xs text-muted-foreground">المتجر لم يعد موجوداً — التجاهل فقط.</span> : null}
    </span>
  );
}
