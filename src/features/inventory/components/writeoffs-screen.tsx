"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { AccessGate } from "@/components/shared/access-gate";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useOrderFormOptions } from "@/features/orders/api";
import { useInventory, useRequestWriteoff, useWriteoffs } from "@/features/inventory/api";
import { InventoryNav } from "@/features/inventory/components/inventory-nav";
import { formatQty, WRITEOFF_STATUS_LABELS, type InventoryUnit, type Writeoff } from "@/features/inventory/schemas";

/**
 * `/dashboard/inventory/writeoffs` (M21 US-21.7, FR-21.09): a write-off never touches the
 * quantity directly — it is an approval request (`stock_writeoff`) that the owner decides
 * on in M34. The list shows every request with its status; the Sheet files a new one.
 */
const STATUS_TEXT: Record<Writeoff["status"], string> = { pending: "text-warning", approved: "text-success", rejected: "text-destructive" };

export function WriteoffsScreen() {
  return (
    <AccessGate feature="inventory" permission="inventory.view">
      <WriteoffsTable />
    </AccessGate>
  );
}

function WriteoffsTable() {
  const table = useTableUrlState();
  const { canPermission } = useAccess();
  const canRequest = canPermission("inventory.writeoff");
  const [open, setOpen] = useQueryState("new", parseAsBoolean.withDefault(false).withOptions({ history: "replace" }));
  const query = useWriteoffs();
  const data = query.data;
  const pending = data?.results.filter((w) => w.status === "pending").length ?? 0;

  const columns = useMemo<ColumnDef<Writeoff, unknown>[]>(
    () => [
      {
        id: "created_at",
        header: headerLabel("التاريخ"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} className="whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </time>
        ),
      },
      {
        id: "product",
        header: headerLabel("المنتج"),
        cell: ({ row }) => (
          <span className="flex min-w-40 flex-col leading-tight">
            <Link href={`/dashboard/products/${row.original.product_id}`} className="truncate hover:underline">
              {row.original.product_name}
            </Link>
            {row.original.variant_label ? <span className="text-[11px] text-muted-foreground">{row.original.variant_label}</span> : null}
          </span>
        ),
      },
      { id: "location", header: headerLabel("الموقع"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.location_name ?? "—"}</span> },
      { id: "quantity", meta: { numeric: true }, header: headerLabel("الكمية"), cell: ({ row }) => <Mono>{formatQty(row.original.quantity)}</Mono> },
      { id: "note", header: headerLabel("السبب"), cell: ({ row }) => <span className="block max-w-72 truncate text-muted-foreground">{row.original.note}</span> },
      { id: "requester", header: headerLabel("الطالب"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.requester_name}</span> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => (
          <span className={cn("whitespace-nowrap", STATUS_TEXT[row.original.status])} data-testid="writeoff-status">
            {WRITEOFF_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="طلبات الإعدام"
        description="إعدام المخزون التالف أو المفقود يمرّ عبر موافقة المالك — لا يُخفَّض الرقم مباشرة."
        actions={
          canRequest ? (
            <Button className="h-11 lg:h-9" onClick={() => void setOpen(true)} data-testid="new-writeoff">
              طلب إعدام
            </Button>
          ) : (
            <Button className="h-11 lg:h-9" disabled title="تحتاج صلاحية طلب الإعدام" data-testid="new-writeoff-disabled">
              طلب إعدام
            </Button>
          )
        }
      />
      <InventoryNav />

      <p className="text-sm text-muted-foreground" data-testid="writeoffs-summary">
        <Mono className="text-foreground">{data?.count ?? "—"}</Mono> طلب · <Mono className={pending ? "text-warning" : "text-foreground"}>{data ? pending : "—"}</Mono> بانتظار الموافقة
        {pending > 0 ? (
          <>
            {" "}
            ·{" "}
            <Link href="/dashboard/staff/approvals?type=stock_writeoff" className="underline underline-offset-4">
              القرار من صندوق الموافقات
            </Link>
          </>
        ) : null}
      </p>

      <DataTable<Writeoff>
        testId="writeoffs-table"
        caption="طلبات إعدام المخزون"
        columns={columns}
        data={data?.results}
        getRowId={(w) => String(w.id)}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyState={
          <EmptyState
            title="لا طلبات إعدام"
            description="عند تلف أو فقدان كمية، أرسل طلباً هنا ليقرّه المالك ويُخصم من المخزون."
            action={canRequest ? <Button className="h-11 lg:h-9" onClick={() => void setOpen(true)}>طلب إعدام</Button> : undefined}
          />
        }
        renderMobileCard={(w) => (
          <div className="flex flex-col gap-1 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{w.product_name}</span>
                <span className="block truncate text-xs text-muted-foreground">{w.note}</span>
              </span>
              <Mono>{formatQty(w.quantity)}</Mono>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{w.requester_name}</span>
              <span className={STATUS_TEXT[w.status]}>{WRITEOFF_STATUS_LABELS[w.status]}</span>
            </div>
          </div>
        )}
      />

      {canRequest ? <WriteoffSheet open={open} onClose={() => void setOpen(null)} /> : null}
    </div>
  );
}

const writeoffFormSchema = z.object({
  unit: z.string().min(1, "اختر المنتج."),
  location_id: z.string(),
  quantity: z.string().trim().regex(/^\d+(\.\d{1,3})?$/, "رقم أكبر من صفر حتى 3 خانات عشرية.").refine((v) => Number(v) > 0, "أدخل كمية أكبر من صفر."),
  note: z.string().trim().min(1, "الملاحظة مطلوبة لطلب الإعدام.").max(300, "300 حرف على الأكثر."),
});
type WriteoffForm = z.infer<typeof writeoffFormSchema>;

function WriteoffSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:sm:max-w-md" data-testid="writeoff-sheet">
        <SheetTitle>طلب إعدام مخزون</SheetTitle>
        <SheetDescription className="mb-4">يُرسل الطلب إلى صندوق الموافقات ولا تُخصم الكمية حتى يُعتمد.</SheetDescription>
        {open ? <WriteoffFormBody onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function WriteoffFormBody({ onClose }: { onClose: () => void }) {
  const id = useId();
  const request = useRequestWriteoff();
  const [detail, setDetail] = useState<string | null>(null);
  const inventory = useInventory({ page_size: 100 });
  const locations = useOrderFormOptions().data?.locations ?? [];
  const multi = inventory.data?.multi_location ?? false;

  const units = useMemo(() => {
    const out: Array<{ key: string; label: string; unit: InventoryUnit }> = [];
    for (const p of inventory.data?.results ?? []) {
      if (p.is_serialized || p.is_bundle || p.is_auction) continue;
      if (p.variants.length) for (const v of p.variants) out.push({ key: `${v.product_id}:${v.variant_id ?? 0}`, label: `${p.name} — ${v.variant_label}`, unit: v });
      else out.push({ key: `${p.product_id}:0`, label: p.name, unit: p });
    }
    return out;
  }, [inventory.data]);

  const form = useForm<WriteoffForm>({
    resolver: zodResolver(writeoffFormSchema),
    defaultValues: { unit: "", location_id: locations[0] ? String(locations[0].id) : "", quantity: "", note: "" },
  });
  const { register, handleSubmit, control, setError, formState } = form;
  const unitKey = useWatch({ control, name: "unit" });
  const picked = units.find((u) => u.key === unitKey);

  const submit = handleSubmit(async (values) => {
    setDetail(null);
    const [productId, variantId] = values.unit.split(":").map(Number);
    try {
      await request.mutateAsync({
        product_id: productId,
        variant_id: variantId || null,
        location_id: multi ? Number(values.location_id || (locations[0] ? String(locations[0].id) : "")) || null : null,
        quantity: values.quantity,
        note: values.note,
      });
      toast.success("أُرسل طلب الإعدام للموافقة");
      onClose();
    } catch (e) {
      if (isApiError(e)) {
        let placed = false;
        for (const [k, msgs] of Object.entries(e.fields ?? {})) {
          const key = k === "product_id" || k === "variant_id" ? "unit" : k;
          if (["unit", "location_id", "quantity", "note"].includes(key)) {
            setError(key as keyof WriteoffForm, { message: msgs[0] });
            placed = true;
          }
        }
        if (!placed) setDetail(e.userMessage);
      } else setDetail("تعذّر الاتصال. أعد المحاولة.");
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate data-testid="writeoff-form">
      <Field label="المنتج" htmlFor={`${id}-unit`} error={formState.errors.unit?.message} required>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <NativeSelect id={`${id}-unit`} value={field.value} onChange={(e) => field.onChange(e.target.value)} className="h-11 md:h-9" data-testid="writeoff-unit">
              <option value="">— اختر —</option>
              {units.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
          )}
        />
      </Field>
      {picked ? (
        <p className="text-xs text-muted-foreground">
          المتاح الآن: <Mono className="text-foreground">{formatQty(picked.unit.stock, picked.unit.unit)}</Mono>
        </p>
      ) : null}

      {multi ? (
        <Field label="الموقع" htmlFor={`${id}-location`} error={formState.errors.location_id?.message} required>
          <Controller
            control={control}
            name="location_id"
            render={({ field }) => (
              <NativeSelect id={`${id}-location`} value={field.value} onChange={(e) => field.onChange(e.target.value)} className="h-11 md:h-9" data-testid="writeoff-location">
                {locations.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          />
        </Field>
      ) : null}

      <Field label="الكمية" htmlFor={`${id}-qty`} error={formState.errors.quantity?.message} required>
        <input id={`${id}-qty`} dir="ltr" inputMode="decimal" {...register("quantity")} aria-invalid={Boolean(formState.errors.quantity)} className={cn(numericInputClass, "h-11 md:h-9")} data-testid="writeoff-quantity" />
      </Field>

      <Field label="سبب الإعدام" htmlFor={`${id}-note`} error={formState.errors.note?.message} required>
        <textarea id={`${id}-note`} rows={3} {...register("note")} aria-invalid={Boolean(formState.errors.note)} className={cn(inputClass, "h-auto py-2")} placeholder="تالف أثناء النقل، انتهت الصلاحية، فقدان…" data-testid="writeoff-note" />
      </Field>

      {detail ? (
        <p role="alert" className="text-sm text-destructive" data-testid="writeoff-detail">
          {detail}
        </p>
      ) : null}

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="h-11 flex-1 md:h-9" disabled={request.isPending} data-testid="writeoff-submit">
          إرسال للموافقة
        </Button>
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
