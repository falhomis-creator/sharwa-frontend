"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, headerLabel } from "@/components/shared/data-table/data-table";
import { FilterBar, FilterSelect } from "@/components/shared/data-table/filter-bar";
import { useTableUrlState } from "@/components/shared/data-table/use-table-url-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useDeleteEndpoint, useDeliveries, useEndpoint, usePatchEndpoint, useRedeliver, useRotateSecret, useTestEndpoint, useWebhookEvents } from "@/features/integrations/api";
import { ConfirmDialog, errorMessage, OwnerGate, SectionHeading, StatusText } from "@/features/integrations/components/shared";
import { EndpointForm, EndpointState, SecretDialog } from "@/features/integrations/components/webhook-parts";
import { DELIVERY_STATUSES, DELIVERY_STATUS_LABELS, DELIVERY_TONE, WEBHOOK_TEST_EVENT, type WebhookDelivery, type WebhookEndpoint } from "@/features/integrations/schemas";
import { formatDateTime } from "@/lib/format";

/**
 * `/dashboard/settings/webhooks/[id]` — M19 US-19.3: details, «تدوير السرّ» (warned), «إرسال
 * حدث تجريبي» with a visible result, and the delivery log with `status, event, from, to` in
 * the URL (FR-19.07) and «إعادة الإرسال» for failed rows in ≤ 2 clicks (SC-19.5).
 */
export function WebhookDetailScreen({ id }: { id: number }) {
  return (
    <OwnerGate what="الـ Webhooks">
      <DetailLoader id={id} />
    </OwnerGate>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/settings/webhooks" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
      <ChevronRight aria-hidden className="size-4 ltr:rotate-180" />
      كل نقاط النهاية
    </Link>
  );
}

function DetailLoader({ id }: { id: number }) {
  const q = useEndpoint(id);
  if (q.isLoading)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <BackLink />
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    );
  if (q.isError || !q.data) {
    if (isApiError(q.error) && q.error.status === 404)
      return (
        <div className="flex flex-col gap-4">
          <BackLink />
          <EmptyState title="نقطة النهاية غير موجودة" description="ربما حُذفت. ارجع إلى القائمة." />
        </div>
      );
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <Detail e={q.data} />;
}

function useEventName() {
  const events = useWebhookEvents();
  return (code: string) => (code === WEBHOOK_TEST_EVENT ? "حدث تجريبي" : (events.data?.find((x) => x.code === code)?.name ?? code));
}

function Detail({ e }: { e: WebhookEndpoint }) {
  const router = useRouter();
  const eventName = useEventName();
  const patch = usePatchEndpoint(e.id);
  const rotate = useRotateSecret(e.id);
  const test = useTestEndpoint(e.id);
  const remove = useDeleteEndpoint();
  const [ui, setUi] = useQueryStates({ edit: parseAsBoolean }, { history: "replace" });
  const [confirm, setConfirm] = useState<"rotate" | "delete" | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<WebhookDelivery | null>(null);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="webhook-detail">
      <BackLink />
      <SectionHeading
        title="نقطة نهاية"
        description={e.description || undefined}
        actions={
          <Button variant="outline" className="h-11 lg:h-9" onClick={() => void setUi({ edit: true })} data-testid="edit-endpoint">
            تعديل
          </Button>
        }
      />

      <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2" data-testid="endpoint-details">
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">العنوان</dt>
          <dd>
            <Mono className="break-all text-sm" data-testid="endpoint-url-value">
              {e.url}
            </Mono>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">الحالة</dt>
          <dd className="flex flex-wrap items-center gap-3" data-testid="endpoint-state">
            <EndpointState e={e} />
            {e.auto_disabled ? (
              <Button variant="outline" className="h-11 lg:h-8" disabled={patch.isPending} onClick={() => void act(async () => { await patch.mutateAsync({ is_active: true }); toast.success("أُعيد تفعيل نقطة النهاية"); })} data-testid="detail-reenable">
                إعادة التفعيل
              </Button>
            ) : (
              <Button variant="ghost" className="h-11 lg:h-8" disabled={patch.isPending} onClick={() => void act(async () => { await patch.mutateAsync({ is_active: !e.is_active }); toast.success(e.is_active ? "أُوقفت نقطة النهاية" : "فُعّلت نقطة النهاية"); })} data-testid="toggle-active">
                {e.is_active ? "إيقاف" : "تفعيل"}
              </Button>
            )}
          </dd>
          {e.auto_disabled ? <p className="text-xs text-muted-foreground">عُطّلت بعد <Mono>{e.failure_count}</Mono> إخفاقات متتالية. أصلح الخادم ثم أعد التفعيل.</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">سرّ التوقيع</dt>
          <dd className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground" data-testid="secret-state">
              {e.has_secret ? "محفوظ ومخفي — لا يُعرض مجدداً" : "لا سرّ"}
            </span>
            <Button variant="outline" className="h-11 lg:h-8" onClick={() => setConfirm("rotate")} data-testid="rotate-secret">
              تدوير السرّ
            </Button>
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">
            الأحداث (<Mono>{e.events.length}</Mono>)
          </dt>
          <dd className="flex flex-wrap gap-1.5">
            {e.events.map((c) => (
              <span key={c} className="inline-flex items-baseline gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
                {eventName(c)} <Mono className="text-muted-foreground">{c}</Mono>
              </span>
            ))}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">أُنشئت</dt>
          <dd className="text-xs">{formatDateTime(e.created_at)}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-3 border-y border-border py-4" aria-label="حدث تجريبي">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">أرسل حمولة اختبار <Mono>{WEBHOOK_TEST_EVENT}</Mono> لتتأكد أن نظامك يستقبل ويتحقق من التوقيع.</p>
          <Button className="h-11 lg:h-9" disabled={test.isPending} onClick={() => void act(async () => setTestResult(await test.mutateAsync()))} data-testid="send-test">
            {test.isPending ? "جارٍ الإرسال…" : "إرسال حدث تجريبي"}
          </Button>
        </div>
        {testResult ? (
          <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-testid="test-result" data-status={testResult.status}>
            <StatusText tone={DELIVERY_TONE[testResult.status]}>{testResult.status === "delivered" ? "وصل الحدث التجريبي" : "فشل الحدث التجريبي"}</StatusText>
            <span className="text-muted-foreground">
              الرمز <Mono>{testResult.response_code ?? "—"}</Mono> · <Mono>{testResult.duration_ms ?? "—"}</Mono> ms
            </span>
            {testResult.error ? <span className="text-xs text-destructive">{testResult.error}</span> : null}
          </p>
        ) : null}
      </section>

      <Deliveries endpointId={e.id} events={e.events} eventName={eventName} />

      <div className="border-t border-border pt-4">
        <Button variant="destructive" className="h-11 lg:h-9" onClick={() => setConfirm("delete")} data-testid="delete-endpoint">
          حذف نقطة النهاية
        </Button>
      </div>

      <Sheet open={!!ui.edit} onOpenChange={(o) => !o && void setUi({ edit: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-xl" data-testid="edit-sheet">
          <SheetTitle className="text-lg">تعديل نقطة النهاية</SheetTitle>
          <SheetDescription className="pb-4">السرّ لا يتغير بالتعديل — استخدم «تدوير السرّ» لذلك.</SheetDescription>
          {ui.edit ? (
            <EndpointForm
              initial={e}
              submitLabel="حفظ التغييرات"
              pending={patch.isPending}
              onSubmit={async (json) => {
                await patch.mutateAsync(json);
                toast.success("حُفظت نقطة النهاية");
                void setUi({ edit: null });
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirm === "rotate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="تدوير السرّ؟"
        description="سيتوقف السرّ الحالي فوراً، وسيرفض نظامك الخارجي كل التوقيعات حتى تحدّثه بالسرّ الجديد. لا يمكن التراجع."
        confirmLabel="تدوير السرّ"
        destructive
        pending={rotate.isPending}
        onConfirm={() =>
          void act(async () => {
            const res = await rotate.mutateAsync();
            setConfirm(null);
            setSecret(res.secret);
          })
        }
        testId="confirm-rotate"
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف نقطة النهاية؟"
        description="لن نرسل إليها أي حدث بعد الآن، ويُحذف سجل تسليمها."
        confirmLabel="حذف"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          void act(async () => {
            await remove.mutateAsync(e.id);
            toast.success("حُذفت نقطة النهاية");
            router.replace("/dashboard/settings/webhooks");
          })
        }
        testId="confirm-delete-endpoint"
      />
      <SecretDialog secret={secret} rotated onClose={() => setSecret(null)} />
    </div>
  );
}

const filterParsers = {
  status: parseAsStringLiteral(DELIVERY_STATUSES),
  event: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
};

function DateFilter({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
      <span className="text-xs text-muted-foreground md:whitespace-nowrap">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className={cn(inputClass, "font-mono md:h-8 md:w-36", value && "border-foreground/40")} data-testid={testId} />
    </label>
  );
}

function RedeliverButton({ d, onDone }: { d: WebhookDelivery; onDone: (r: WebhookDelivery) => void }) {
  const redeliver = useRedeliver();
  return (
    <Button
      variant="outline"
      className="h-11 lg:h-8"
      disabled={redeliver.isPending}
      onClick={async (ev) => {
        ev.stopPropagation();
        try {
          const r = await redeliver.mutateAsync(d.id);
          onDone(r);
          if (r.status === "delivered") toast.success(`أُعيد الإرسال — سُلِّم (${r.response_code})`);
          else toast.error(`أُعيد الإرسال وفشل مجدداً (${r.response_code ?? "—"})`);
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
      data-testid={`redeliver-${d.id}`}
    >
      {redeliver.isPending ? "جارٍ الإرسال…" : "إعادة الإرسال"}
    </Button>
  );
}

function Deliveries({ endpointId, events, eventName }: { endpointId: number; events: string[]; eventName: (c: string) => string }) {
  const [filters, setFilters] = useQueryStates(filterParsers, { history: "replace" });
  const table = useTableUrlState();
  const [lastResult, setLastResult] = useState<WebhookDelivery | null>(null);
  const params = { status: filters.status ?? undefined, event: filters.event || undefined, from: filters.from || undefined, to: filters.to || undefined, page: table.page, page_size: table.pageSize };
  const list = useDeliveries(endpointId, params);
  const activeCount = Number(!!filters.status) + Number(!!filters.event) + Number(!!filters.from) + Number(!!filters.to);
  const set = (patch: Partial<Record<keyof typeof filterParsers, string | null>>) => {
    void setFilters(patch as Parameters<typeof setFilters>[0]);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<WebhookDelivery, unknown>[]>(
    () => [
      {
        id: "event",
        header: headerLabel("الحدث"),
        cell: ({ row }) => (
          <span className="flex flex-col gap-0.5">
            <span className="text-sm">{eventName(row.original.event)}</span>
            <Mono className="text-xs text-muted-foreground">{row.original.event}</Mono>
          </span>
        ),
      },
      { id: "time", header: headerLabel("الوقت"), cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.created_at)}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <StatusText tone={DELIVERY_TONE[row.original.status]}>{DELIVERY_STATUS_LABELS[row.original.status]}</StatusText> },
      { id: "code", meta: { numeric: true }, header: headerLabel("رمز الاستجابة"), cell: ({ row }) => <Mono className={cn(row.original.response_code && row.original.response_code >= 400 && "text-destructive")}>{row.original.response_code ?? "—"}</Mono> },
      { id: "duration", meta: { numeric: true }, header: headerLabel("المدة (ms)"), cell: ({ row }) => <Mono>{row.original.duration_ms ?? "—"}</Mono> },
      { id: "attempt", meta: { numeric: true }, header: headerLabel("المحاولة"), cell: ({ row }) => <Mono>{row.original.attempt}</Mono> },
      { id: "actions", meta: { srOnlyHeader: true }, header: headerLabel("إجراءات"), cell: ({ row }) => (row.original.status === "failed" ? <RedeliverButton d={row.original} onDone={setLastResult} /> : null) },
    ],
    [eventName],
  );

  return (
    <section className="flex flex-col gap-3" aria-label="سجل التسليم" data-testid="deliveries">
      <h3 className="text-base font-semibold">سجل التسليم</h3>
      {lastResult ? (
        <p role="status" className="text-sm" data-testid="redeliver-result" data-status={lastResult.status}>
          آخر إعادة إرسال: <StatusText tone={DELIVERY_TONE[lastResult.status]}>{DELIVERY_STATUS_LABELS[lastResult.status]}</StatusText> · الرمز <Mono>{lastResult.response_code ?? "—"}</Mono> · المحاولة <Mono>{lastResult.attempt}</Mono>
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={list.data?.results}
        getRowId={(d) => String(d.id)}
        caption="سجل التسليم"
        total={list.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        isFiltered={activeCount > 0}
        emptyState={<EmptyState title="لا تسليمات بعد" description="ستظهر هنا كل محاولة إرسال لهذه النقطة. جرّب «إرسال حدث تجريبي»." />}
        noResultsState={<EmptyState title="لا تسليمات مطابقة" description="غيّر الحالة أو الحدث أو النطاق الزمني." />}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={() => set({ status: null, event: null, from: null, to: null })}>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => set({ status: v || null })} options={DELIVERY_STATUSES.map((s) => ({ value: s, label: DELIVERY_STATUS_LABELS[s] }))} testId="delivery-status" />
            <FilterSelect label="الحدث" value={filters.event} onChange={(v) => set({ event: v || null })} options={[...events, WEBHOOK_TEST_EVENT].map((c) => ({ value: c, label: eventName(c) }))} testId="delivery-event" />
            <DateFilter label="من" value={filters.from} onChange={(v) => set({ from: v || null })} testId="delivery-from" />
            <DateFilter label="إلى" value={filters.to} onChange={(v) => set({ to: v || null })} testId="delivery-to" />
          </FilterBar>
        }
        renderMobileCard={(d) => (
          <div className="flex flex-col gap-2 p-3" data-testid="delivery-card">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm">{eventName(d.event)}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</span>
              </span>
              <StatusText tone={DELIVERY_TONE[d.status]}>{DELIVERY_STATUS_LABELS[d.status]}</StatusText>
            </div>
            <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>
                الرمز <Mono className={cn(d.response_code && d.response_code >= 400 && "text-destructive")}>{d.response_code ?? "—"}</Mono>
              </span>
              <span>
                <Mono>{d.duration_ms ?? "—"}</Mono> ms
              </span>
              <span>
                المحاولة <Mono>{d.attempt}</Mono>
              </span>
            </span>
            {d.status === "failed" ? <RedeliverButton d={d} onDone={setLastResult} /> : null}
          </div>
        )}
        testId="deliveries-table"
      />
    </section>
  );
}
