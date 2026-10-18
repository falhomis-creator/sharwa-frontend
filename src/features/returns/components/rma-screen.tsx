"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Plus, ScanLine } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCreateRma, useReturnOptions, useReturnableItems, useRmas } from "@/features/returns/api";
import { FEE_PAYER_LABELS, RMA_REASONS, RMA_REASON_LABELS, RMA_STATUSES, RMA_STATUS_LABELS, newRmaSchema, type NewRmaInput, type Rma } from "@/features/returns/schemas";
import { RmaStatusText } from "@/features/returns/components/status";
import { RmaDetailView } from "@/features/returns/components/rma-detail";

/**
 * `/dashboard/returns/rma` (M24 US-24.4): the RMA list (`[NEEDS BACKEND]` row), a text strip
 * of the seven states, `status`/`q` in the URL, row → the `?rma=` sheet (same detail as
 * `/dashboard/returns/rma/[id]`), and «RMA جديد» in a side sheet → `returns/rma/create/`.
 */
const parsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(RMA_STATUSES),
  rma: parseAsInteger,
};

export function RmaScreen() {
  return (
    <AccessGate feature="refunds" permission="orders.process_returns">
      <RmaInner />
    </AccessGate>
  );
}

function RmaInner() {
  const router = useRouter();
  const table = useTableUrlState();
  const [{ q, status, rma: openId }, setParams] = useQueryStates(parsers, { history: "replace" });
  const [creating, setCreating] = useState(false);
  const [now] = useState(() => new Date());
  const query = useRmas({ status: status ?? undefined, q: q || undefined, page: table.page, page_size: table.pageSize });
  const data = query.data;
  const set = (patch: Partial<{ q: string | null; status: (typeof RMA_STATUSES)[number] | null }>) => {
    void setParams(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<Rma, unknown>[]>(
    () => [
      { id: "id", meta: { className: "whitespace-nowrap" }, header: headerLabel("RMA"), cell: ({ row }) => <Mono>RMA-{row.original.id}</Mono> },
      {
        id: "order",
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <Link href={`/dashboard/orders?order=${row.original.order_id}`} tabIndex={-1} className="text-muted-foreground hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
            <Mono>#{row.original.order_id}</Mono>
          </Link>
        ),
      },
      {
        id: "item",
        header: headerLabel("العنصر"),
        cell: ({ row }) => (
          <span className="flex min-w-32 flex-col leading-tight">
            <span className="truncate">{row.original.fulfillment_item.product_name}</span>
            <span className="text-[11px] text-muted-foreground">{row.original.customer_name}</span>
          </span>
        ),
      },
      { id: "qty", meta: { numeric: true }, header: headerLabel("الكمية"), cell: ({ row }) => <Mono>{row.original.quantity}</Mono> },
      { id: "reason", header: headerLabel("السبب"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{RMA_REASON_LABELS[row.original.reason]}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <RmaStatusText status={row.original.status} /> },
      { id: "dest", header: headerLabel("الوجهة"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.destination_location?.name ?? "—"}</span> },
      { id: "fee", header: headerLabel("الرسوم على"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{FEE_PAYER_LABELS[row.original.fee_payer]}</span> },
      {
        id: "created_at",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("التاريخ"),
        cell: ({ row }) =>
          row.original.created_at ? (
            <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="text-xs text-muted-foreground">
              {formatRelative(row.original.created_at, now)}
            </time>
          ) : null,
      },
    ],
    [now],
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/returns" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> المرتجعات
      </Link>
      <PageHeader
        title="مسار RMA"
        description="المرتجع اللوجستي من العميل إلى المستودع ثم قرار الفحص: إعادة للمخزون أو إعدام."
        actions={
          <>
            <Link href="/dashboard/returns/rma/scan" className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1.5 lg:h-9")} data-testid="rma-scan-link">
              <ScanLine className="size-4" aria-hidden /> مسح الاستلام
            </Link>
            <Button className="h-11 gap-1.5 lg:h-9" onClick={() => setCreating(true)} data-testid="rma-new">
              <Plus className="size-4" aria-hidden /> RMA جديد
            </Button>
          </>
        }
      />

      <StatStrip
        label="حالات RMA"
        items={RMA_STATUSES.filter((s) => s !== "received_at_warehouse").map((s) => ({
          key: s,
          label: RMA_STATUS_LABELS[s],
          count: data?.counts?.[s],
          tone: s === "qa_pending" ? ("warning" as const) : undefined,
          active: status === s,
          onSelect: () => set({ status: status === s ? null : s }),
        }))}
      />

      <DataTable<Rma>
        testId="rma-table"
        caption="طلبات RMA"
        columns={columns}
        data={data?.results}
        getRowId={(r) => String(r.id)}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(status || q)}
        onRowOpen={(row) => void setParams({ rma: row.id })}
        toolbar={
          <FilterBar activeCount={status ? 1 : 0} onClear={() => set({ q: null, status: null })} search={<SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder="رقم RMA أو الطلب أو الهاتف" label="بحث في RMA" />}>
            <FilterSelect
              label="الحالة"
              value={status ?? ""}
              onChange={(v) => set({ status: (v || null) as (typeof RMA_STATUSES)[number] | null })}
              options={RMA_STATUSES.map((s) => ({ value: s, label: RMA_STATUS_LABELS[s] }))}
              testId="rma-filter-status"
            />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <button type="button" onClick={() => router.push(`/dashboard/returns/rma/${r.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="rma-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline gap-2">
                <Mono className="text-sm font-medium">RMA-{r.id}</Mono>
                <span className="truncate text-sm">{r.fulfillment_item.product_name}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <RmaStatusText status={r.status} className="text-xs" />
                <span>{RMA_REASON_LABELS[r.reason]}</span>
              </span>
            </span>
            <Mono className="text-sm text-muted-foreground">×{r.quantity}</Mono>
          </button>
        )}
        emptyState={<EmptyState title="لا مرتجعات لوجستية بعد" description="أنشئ RMA من عنصر تنفيذ عندما يعيد العميل شحنة أو يرفض استلامها." />}
        noResultsState={
          <EmptyState
            title="لا RMA يطابق البحث أو الحالة"
            action={
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} onClick={() => set({ q: null, status: null })}>
                مسح الفلاتر
              </button>
            }
          />
        }
      />

      <Sheet open={openId !== null} onOpenChange={(o) => !o && void setParams({ rma: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-2xl" data-testid="rma-sheet">
          <SheetTitle className="sr-only">تفاصيل RMA {openId ?? ""}</SheetTitle>
          <SheetDescription className="sr-only">مسار الحالات والأحداث وقرار الفحص</SheetDescription>
          {openId !== null ? <RmaDetailView key={openId} rmaId={openId} variant="sheet" /> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-md" data-testid="rma-create-sheet">
          <SheetTitle className="text-lg font-semibold">RMA جديد</SheetTitle>
          <SheetDescription className="pb-4 text-sm text-muted-foreground">من عنصر تنفيذ في طلب مُنفَّذ إلى موقع الوجهة.</SheetDescription>
          {creating ? (
            <CreateRmaForm
              onDone={(r) => {
                setCreating(false);
                void setParams({ rma: r.id });
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CreateRmaForm({ onDone }: { onDone: (r: Rma) => void }) {
  const { canPermission } = useAccess();
  const canWrite = canPermission("orders.process_returns");
  const create = useCreateRma();
  const locations = useReturnOptions().data?.locations ?? [];
  const [formError, setFormError] = useState<string | null>(null);
  const [orderLoaded, setOrderLoaded] = useState<number | null>(null);
  const form = useForm<NewRmaInput>({
    resolver: zodResolver(newRmaSchema),
    defaultValues: { order_id: "", fulfillment_item_id: "", destination_location_id: "1", quantity: "1", reason: undefined },
  });
  const { register, handleSubmit, formState, setError, control } = form;
  const orderDraft = useWatch({ control, name: "order_id" });
  const items = useReturnableItems(orderLoaded);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const res = await create.mutateAsync({
        order_id: Number(v.order_id),
        fulfillment_item_id: Number(v.fulfillment_item_id),
        destination_location_id: Number(v.destination_location_id),
        ...(v.quantity ? { quantity: Number(v.quantity) } : {}),
        reason: v.reason,
      });
      toast.success(`أُنشئ RMA-${res.id}`);
      onDone(res);
    } catch (e) {
      if (!isApiError(e)) return setFormError("تعذّر الاتصال.");
      let any = false;
      for (const key of ["order_id", "fulfillment_item_id", "destination_location_id", "quantity", "reason"] as const) {
        const msg = e.fields?.[key]?.[0];
        if (msg) {
          setError(key, { message: msg }, { shouldFocus: !any });
          any = true;
        }
      }
      if (!any) setFormError(e.userMessage);
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate data-testid="rma-form">
      <Field label="رقم الطلب" htmlFor="rma-order" required error={formState.errors.order_id?.message ?? (isApiError(items.error) ? items.error.userMessage : undefined)}>
        <div className="flex gap-2">
          <input id="rma-order" inputMode="numeric" dir="ltr" className={cn(numericInputClass, "text-start")} {...register("order_id")} data-testid="rma-order" />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 md:h-8"
            onClick={() => {
              const n = Number(String(orderDraft).trim());
              if (Number.isInteger(n) && n > 0) setOrderLoaded(n);
              else setError("order_id", { message: "أدخل رقم الطلب." });
            }}
            data-testid="rma-order-load"
          >
            تحميل
          </Button>
        </div>
      </Field>
      <Field label="عنصر التنفيذ" htmlFor="rma-item" required error={formState.errors.fulfillment_item_id?.message} hint={orderLoaded && items.data && !items.data.length ? "لا عناصر تنفيذ في هذا الطلب." : undefined}>
        <NativeSelect id="rma-item" className="h-11 md:h-8" disabled={!items.data?.length} {...register("fulfillment_item_id")} data-testid="rma-item">
          <option value="">{items.isFetching ? "جارٍ التحميل…" : "اختر العنصر"}</option>
          {(items.data ?? []).map((it) => (
            <option key={it.fulfillment_item_id} value={it.fulfillment_item_id}>
              {it.product_name} × {it.quantity}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الكمية" htmlFor="rma-qty" error={formState.errors.quantity?.message}>
          <input id="rma-qty" inputMode="numeric" dir="ltr" className={numericInputClass} {...register("quantity")} data-testid="rma-qty" />
        </Field>
        <Field label="السبب" htmlFor="rma-reason" required error={formState.errors.reason?.message}>
          <NativeSelect id="rma-reason" className="h-11 md:h-8" {...register("reason")} data-testid="rma-reason">
            <option value="">اختر</option>
            {RMA_REASONS.map((r) => (
              <option key={r} value={r}>
                {RMA_REASON_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="موقع الوجهة" htmlFor="rma-dest" required error={formState.errors.destination_location_id?.message}>
        <NativeSelect id="rma-dest" className="h-11 md:h-8" {...register("destination_location_id")} data-testid="rma-dest">
          <option value="">اختر</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <span title={canWrite ? undefined : "يتطلب صلاحية «معالجة المرتجعات»"} className="self-start">
        <Button type="submit" className="h-11 lg:h-9" disabled={!canWrite || create.isPending} data-testid="rma-submit">
          {create.isPending ? "جارٍ الإنشاء…" : "إنشاء RMA"}
        </Button>
      </span>
    </form>
  );
}
