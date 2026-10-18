"use client";

import { useEffect, useMemo, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { useDeliveryMethods, useMethodWrites, useShippingSettings } from "@/features/shipping/api";
import { methodFormSchema, type DeliveryMethod, type MethodForm } from "@/features/shipping/schemas";
import { ActiveDot, ConfirmDelete, FormSheet, OWNER_ONLY_TITLE, SharwaTag, SheetActions, ghostButton, primaryButton, useIsOwner } from "@/features/shipping/components/bits";

const OFFICIAL_TITLE = "طرق شروة شيب الرسمية للقراءة فقط — تُدار من المنصة";

/**
 * Delivery methods (US-15.1.2/3): name, price as the server formats it with its currency
 * (YER_NEW), estimated time, active. `is_sharwa_official` rows carry «شروة شيب» and are
 * read-only. The form opens in a Sheet whose id lives in the URL (`?method=<id|new>`).
 * One component serves `/dashboard/shipping` and `/dashboard/shipping/delivery-methods`.
 */
export function DeliveryMethodsPanel({ withPreview = false }: { withPreview?: boolean }) {
  const isOwner = useIsOwner();
  const table = useTableUrlState();
  const [openId, setOpenId] = useQueryState("method", parseAsString.withOptions({ history: "replace" }));
  const query = useDeliveryMethods({ page: table.page, page_size: table.pageSize });
  const writes = useMethodWrites();
  const [deleting, setDeleting] = useState<DeliveryMethod | null>(null);
  const rows = query.data?.results;
  const editing = openId && openId !== "new" ? rows?.find((m) => String(m.id) === openId) : undefined;

  const columns = useMemo<ColumnDef<DeliveryMethod, unknown>[]>(
    () => [
      {
        id: "name",
        header: headerLabel("الطريقة"),
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_sharwa_official ? <SharwaTag /> : null}
          </span>
        ),
      },
      {
        id: "price",
        meta: { numeric: true },
        header: headerLabel("السعر"),
        cell: ({ row }) => <PriceCell m={row.original} />,
      },
      { id: "estimated_time", header: headerLabel("المدة المتوقعة"), cell: ({ row }) => <span className="text-muted-foreground">{row.original.estimated_time || "—"}</span> },
      { id: "is_active", header: headerLabel("الحالة"), cell: ({ row }) => <ActiveDot active={row.original.is_active} /> },
      {
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-px whitespace-nowrap" },
        header: headerLabel("إجراءات"),
        cell: ({ row }) => <RowActions m={row.original} isOwner={isOwner} onEdit={() => void setOpenId(String(row.original.id))} onDelete={() => setDeleting(row.original)} />,
      },
    ],
    [isOwner, setOpenId],
  );

  const addButton = (
    <button type="button" className={primaryButton} disabled={!isOwner} title={isOwner ? undefined : OWNER_ONLY_TITLE} onClick={() => void setOpenId("new")} data-testid="add-method">
      <Plus className="size-4" aria-hidden /> طريقة توصيل
    </button>
  );

  const list = (
    <DataTable<DeliveryMethod>
      testId="methods-table"
      caption="طرق التوصيل"
      columns={columns}
      data={rows}
      getRowId={(r) => String(r.id)}
      total={query.data?.count ?? 0}
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      isLoading={query.isPending}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      onRowOpen={(m) => (m.is_sharwa_official ? undefined : void setOpenId(String(m.id)))}
      emptyState={<EmptyState title="لا طرق توصيل — أضف طريقة ليتمكن العميل من الطلب" description="كل طريقة باسمها وسعرها بالريال اليمني الجديد ومدتها المتوقعة؛ تظهر النشطة فقط في صفحة الدفع." action={isOwner ? addButton : undefined} />}
      renderMobileCard={(m) => (
        <div className="flex flex-col gap-1.5 p-3" data-testid="method-card">
          <div className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {m.name}
              {m.is_sharwa_official ? <SharwaTag /> : null}
            </span>
            <PriceCell m={m} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{m.estimated_time || "—"}</span>
            <ActiveDot active={m.is_active} />
          </div>
          <RowActions m={m} isOwner={isOwner} onEdit={() => void setOpenId(String(m.id))} onDelete={() => setDeleting(m)} />
        </div>
      )}
    />
  );

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="methods-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="methods-h" className="text-base font-semibold">
          طرق التوصيل
        </h2>
        {rows && rows.length > 0 ? addButton : null}
      </div>
      {withPreview ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">{list}</div>
          <CustomerPreview />
        </div>
      ) : (
        list
      )}

      <MethodSheet open={openId !== null && (openId === "new" || Boolean(editing))} method={editing} onOpenChange={(o) => (o ? null : void setOpenId(null))} />
      <ConfirmDelete
        open={deleting !== null}
        title={`حذف «${deleting?.name ?? ""}»؟`}
        description="تختفي الطريقة من صفحة الدفع فوراً، وتُحذف قواعد SLA المرتبطة بها. الطلبات السابقة تحتفظ باسمها."
        pending={writes.remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          writes.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("حُذفت طريقة التوصيل.");
              setDeleting(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
          })
        }
      />
    </section>
  );
}

function PriceCell({ m }: { m: DeliveryMethod }) {
  return (
    <span className="inline-flex items-baseline gap-1.5" data-testid="method-price">
      <Money value={m.display_price} />
      <Mono className="text-[11px] text-muted-foreground">{m.currency}</Mono>
    </span>
  );
}

function RowActions({ m, isOwner, onEdit, onDelete }: { m: DeliveryMethod; isOwner: boolean; onEdit: () => void; onDelete: () => void }) {
  const blocked = !isOwner ? OWNER_ONLY_TITLE : m.is_sharwa_official ? OFFICIAL_TITLE : undefined;
  return (
    <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={ghostButton} disabled={Boolean(blocked)} title={blocked} onClick={onEdit} data-testid="method-edit">
        تعديل
      </button>
      <button type="button" className={`${ghostButton} text-destructive`} disabled={Boolean(blocked)} title={blocked} onClick={onDelete} data-testid="method-delete">
        حذف
      </button>
    </span>
  );
}

/** «كما يراها العميل» — active methods only, exactly as the server sends them (US-15.1.3). */
function CustomerPreview() {
  const active = useDeliveryMethods({ is_active: "true", page_size: 100 });
  const settings = useShippingSettings();
  const methods = active.data?.results ?? [];
  return (
    <aside className="flex h-fit flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4" aria-labelledby="preview-h" data-testid="customer-preview">
      <h3 id="preview-h" className="text-sm font-medium">
        كما يراها العميل
      </h3>
      <p className="text-xs text-muted-foreground">صفحة الدفع — طريقة التوصيل</p>
      {active.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : methods.length === 0 ? (
        <p className="text-sm text-warning">لا طريقة نشطة — لن يستطيع العميل اختيار التوصيل.</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="preview-methods">
          {methods.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
              <span aria-hidden className={i === 0 ? "size-3.5 rounded-full border-4 border-foreground" : "size-3.5 rounded-full border border-muted-foreground"} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{m.name}</span>
                {m.estimated_time ? <span className="text-xs text-muted-foreground">{m.estimated_time}</span> : null}
              </span>
              <Money value={m.display_price} className="text-sm" />
            </li>
          ))}
        </ul>
      )}
      {settings.data && Number(settings.data.free_shipping_threshold) > 0 ? (
        <p className="text-xs text-muted-foreground">
          شحن مجاني للطلبات من <Money value={settings.data.display_free_shipping_threshold} className="text-foreground" />
        </p>
      ) : null}
    </aside>
  );
}

const EMPTY: MethodForm = { name: "", price: "", estimated_time: "", is_active: true };

function MethodSheet({ open, method, onOpenChange }: { open: boolean; method?: DeliveryMethod; onOpenChange: (o: boolean) => void }) {
  const writes = useMethodWrites();
  const form = useForm<MethodForm>({ resolver: zodResolver(methodFormSchema), defaultValues: EMPTY });
  const { register, control, handleSubmit, reset, formState } = form;
  useEffect(() => {
    if (open) reset(method ? { name: method.name, price: method.price, estimated_time: method.estimated_time, is_active: method.is_active } : EMPTY);
  }, [open, method, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await writes.save.mutateAsync({ id: method?.id ?? null, body: values });
      toast.success(method ? "حُفظت الطريقة." : `أُضيفت «${saved.name}» بسعر ${saved.display_price}.`);
      onOpenChange(false);
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={method ? "تعديل طريقة التوصيل" : "طريقة توصيل جديدة"} description="السعر يُخزَّن بالريال اليمني الجديد (YER_NEW) ويُحوَّل للعميل حسب أسعار الصرف." testId="method-form">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        <Field label="الاسم" htmlFor="method-name" required error={formState.errors.name?.message}>
          <input id="method-name" className={inputClass} placeholder="توصيل سريع" aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="السعر" htmlFor="method-price" required error={formState.errors.price?.message} hint="مثال: 1500.00">
          <div className="flex items-center gap-2">
            <input id="method-price" dir="ltr" inputMode="decimal" className={numericInputClass} aria-invalid={Boolean(formState.errors.price)} {...register("price")} />
            <Mono className="shrink-0 text-xs text-muted-foreground">YER_NEW</Mono>
          </div>
        </Field>
        <Field label="المدة المتوقعة" htmlFor="method-eta" error={formState.errors.estimated_time?.message} hint="نص يراه العميل، مثل «1-2 يوم».">
          <input id="method-eta" className={inputClass} aria-invalid={Boolean(formState.errors.estimated_time)} {...register("estimated_time")} />
        </Field>
        <div className="rounded-lg border border-border px-3">
          <Controller control={control} name="is_active" render={({ field }) => <ToggleRow id="method-active" label="نشطة" description="المعطّلة لا تظهر في صفحة الدفع." checked={field.value} onCheckedChange={field.onChange} />} />
        </div>
        <SheetActions onCancel={() => onOpenChange(false)} submitLabel={method ? "حفظ" : "إضافة"} pending={formState.isSubmitting} testId="method-submit" />
      </form>
    </FormSheet>
  );
}
