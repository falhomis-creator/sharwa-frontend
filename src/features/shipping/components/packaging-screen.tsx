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
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { isApiError } from "@/lib/api-error";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { usePackaging, usePackagingWrites } from "@/features/shipping/api";
import { packagingFormSchema, type Packaging, type PackagingForm } from "@/features/shipping/schemas";
import { ConfirmDelete, FormSheet, OwnerGate, SheetActions, ShippingSubnav, ghostButton, primaryButton } from "@/features/shipping/components/bits";

/**
 * `/dashboard/shipping/packaging` (US-15.5.2): packaging profiles with the fields the
 * server defines (name, L×W×H cm, empty weight g, default). The default one is used when
 * a waybill is issued (M39). Only one default — the server clears the others.
 */
export function PackagingScreen() {
  return (
    <OwnerGate>
      <PackagingBody />
    </OwnerGate>
  );
}

function PackagingBody() {
  const table = useTableUrlState();
  const [openId, setOpenId] = useQueryState("profile", parseAsString.withOptions({ history: "replace" }));
  const query = usePackaging({ page: table.page, page_size: table.pageSize });
  const writes = usePackagingWrites();
  const [deleting, setDeleting] = useState<Packaging | null>(null);
  const rows = query.data?.results;
  const editing = openId && openId !== "new" ? rows?.find((p) => String(p.id) === openId) : undefined;

  const columns = useMemo<ColumnDef<Packaging, unknown>[]>(
    () => [
      {
        id: "name",
        header: headerLabel("الملف"),
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_default ? <span className="text-xs text-muted-foreground" data-testid="default-profile">· الافتراضي</span> : null}
          </span>
        ),
      },
      { id: "dims", meta: { numeric: true, className: "whitespace-nowrap" }, header: headerLabel("الأبعاد (سم)"), cell: ({ row }) => <Mono>{`${row.original.length_cm} × ${row.original.width_cm} × ${row.original.height_cm}`}</Mono> },
      { id: "weight", meta: { numeric: true }, header: headerLabel("الوزن الفارغ (غ)"), cell: ({ row }) => <Mono>{row.original.empty_weight_g}</Mono> },
      {
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-px whitespace-nowrap" },
        header: headerLabel("إجراءات"),
        cell: ({ row }) => (
          <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={ghostButton} onClick={() => void setOpenId(String(row.original.id))} data-testid="profile-edit">
              تعديل
            </button>
            <button type="button" className={`${ghostButton} text-destructive`} onClick={() => setDeleting(row.original)}>
              حذف
            </button>
          </span>
        ),
      },
    ],
    [setOpenId],
  );

  const add = (
    <button type="button" className={primaryButton} onClick={() => void setOpenId("new")} data-testid="add-profile">
      <Plus className="size-4" aria-hidden /> ملف تغليف
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="packaging-screen">
      <PageHeader title="ملفات التغليف" description="أبعاد العلب ووزنها الفارغ؛ الملف الافتراضي يُستخدم عند إصدار البوليصة لحساب الوزن الحجمي." actions={rows && rows.length > 0 ? add : undefined} />
      <ShippingSubnav />
      <DataTable<Packaging>
        testId="packaging-table"
        caption="ملفات التغليف"
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
        onRowOpen={(p) => void setOpenId(String(p.id))}
        emptyState={<EmptyState title="لا ملفات تغليف — أضف علبتك الأكثر استخداماً" description="بلا ملف تُحسب البوليصة بالوزن الفعلي فقط." action={add} />}
        renderMobileCard={(p) => (
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">
                {p.name}
                {p.is_default ? <span className="text-xs text-muted-foreground"> · الافتراضي</span> : null}
              </span>
              <Mono className="self-start text-xs text-muted-foreground">{`${p.length_cm} × ${p.width_cm} × ${p.height_cm} سم · ${p.empty_weight_g} غ`}</Mono>
            </span>
            <button type="button" className={ghostButton} onClick={() => void setOpenId(String(p.id))}>
              تعديل
            </button>
          </div>
        )}
      />
      <PackagingSheet open={openId === "new" || Boolean(editing)} profile={editing} onOpenChange={(o) => (o ? null : void setOpenId(null))} />
      <ConfirmDelete
        open={deleting !== null}
        title={`حذف «${deleting?.name ?? ""}»؟`}
        description="البوالص الصادرة به لا تتأثر."
        pending={writes.remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          writes.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("حُذف ملف التغليف.");
              setDeleting(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
          })
        }
      />
    </div>
  );
}

const EMPTY: PackagingForm = { name: "", length_cm: "", width_cm: "", height_cm: "", empty_weight_g: "", is_default: false };

function PackagingSheet({ open, profile, onOpenChange }: { open: boolean; profile?: Packaging; onOpenChange: (o: boolean) => void }) {
  const writes = usePackagingWrites();
  const form = useForm<PackagingForm>({ resolver: zodResolver(packagingFormSchema), defaultValues: EMPTY });
  const { register, control, handleSubmit, reset, formState } = form;
  useEffect(() => {
    if (open) reset(profile ? { name: profile.name, length_cm: profile.length_cm, width_cm: profile.width_cm, height_cm: profile.height_cm, empty_weight_g: String(profile.empty_weight_g), is_default: profile.is_default } : EMPTY);
  }, [open, profile, reset]);

  const submit = handleSubmit(async (v) => {
    try {
      await writes.save.mutateAsync({ id: profile?.id ?? null, body: { ...v, empty_weight_g: Number(v.empty_weight_g) } });
      toast.success(profile ? "حُفظ ملف التغليف." : "أُضيف ملف التغليف.");
      onOpenChange(false);
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  const dim = (name: "length_cm" | "width_cm" | "height_cm", label: string) => (
    <Field label={label} htmlFor={`pk-${name}`} required error={formState.errors[name]?.message}>
      <input id={`pk-${name}`} dir="ltr" inputMode="decimal" className={numericInputClass} aria-invalid={Boolean(formState.errors[name])} {...register(name)} />
    </Field>
  );

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={profile ? "تعديل ملف التغليف" : "ملف تغليف جديد"} description="الأبعاد بالسنتيمتر والوزن بالغرام." testId="packaging-form">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        <Field label="الاسم" htmlFor="pk-name" required error={formState.errors.name?.message}>
          <input id="pk-name" className={inputClass} aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          {dim("length_cm", "الطول")}
          {dim("width_cm", "العرض")}
          {dim("height_cm", "الارتفاع")}
        </div>
        <Field label="الوزن الفارغ (غ)" htmlFor="pk-weight" required error={formState.errors.empty_weight_g?.message}>
          <input id="pk-weight" dir="ltr" inputMode="numeric" className={numericInputClass} aria-invalid={Boolean(formState.errors.empty_weight_g)} {...register("empty_weight_g")} />
        </Field>
        <div className="surface-card px-3">
          <Controller control={control} name="is_default" render={({ field }) => <ToggleRow id="pk-default" label="الافتراضي" description="يُستخدم تلقائياً عند إصدار البوليصة." checked={field.value} onCheckedChange={field.onChange} />} />
        </div>
        <SheetActions onCancel={() => onOpenChange(false)} submitLabel={profile ? "حفظ" : "إضافة"} pending={formState.isSubmitting} testId="profile-submit" />
      </form>
    </FormSheet>
  );
}
