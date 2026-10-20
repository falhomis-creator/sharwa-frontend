"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Ltr, Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiError } from "@/lib/api-error";
import { prettyPhone } from "@/lib/format";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { useProviderWrites, useProviders, useStaffOptions } from "@/features/shipping/api";
import { CARRIER_CODES, CARRIER_LABELS, PROVIDER_TABS, PROVIDER_TAB_LABELS, providerFormSchema, type Provider, type ProviderForm, type ProviderTab } from "@/features/shipping/schemas";
import { ActiveDot, ConfirmDelete, ConnectionText, FormSheet, OwnerGate, SheetActions, ShippingSubnav, ghostButton, primaryButton } from "@/features/shipping/components/bits";

/**
 * `/dashboard/shipping/providers?tab=agents|companies` (US-15.3, FR-15.03): ONE entity
 * (`ShippingProvider`) split by `carrier_code` — empty = «مندوب شروة شيب», else a company
 * with the carrier connection state from US-15.4. One form in a Sheet (`?provider=`).
 * The hazardous rule (only `accepts_hazardous=true` offered for an `is_hazardous` order)
 * is documented here and enforced in M06.
 */
export function ProvidersScreen() {
  const { canFeature } = useAccess();
  // Either feature opens the screen; each tab needs its own (FR-15.07).
  const feature = canFeature("shipping_providers") ? "shipping_providers" : "shipping_companies";
  return (
    <AccessGate feature={feature}>
      <OwnerGate>
        <ProvidersBody />
      </OwnerGate>
    </AccessGate>
  );
}

function ProvidersBody() {
  const { canFeature } = useAccess();
  const tabs = PROVIDER_TABS.filter((t) => canFeature(t === "agents" ? "shipping_providers" : "shipping_companies"));
  const [tabParam, setTab] = useQueryState("tab", parseAsStringLiteral(PROVIDER_TABS).withDefault(tabs[0] ?? "agents").withOptions({ history: "replace" }));
  const tab: ProviderTab = tabs.includes(tabParam) ? tabParam : (tabs[0] ?? "agents");
  const table = useTableUrlState();
  const [openId, setOpenId] = useQueryState("provider", parseAsString.withOptions({ history: "replace" }));
  const query = useProviders({ kind: tab, page: table.page, page_size: table.pageSize });
  const writes = useProviderWrites();
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const rows = query.data?.results;
  const editing = openId && openId !== "new" ? rows?.find((p) => String(p.id) === openId) : undefined;

  const columns: ColumnDef<Provider, unknown>[] = [
    {
      id: "name",
      header: headerLabel("الاسم"),
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.carrier_code ? CARRIER_LABELS[row.original.carrier_code] : "مندوب شروة شيب"}</span>
        </span>
      ),
    },
    { id: "phone", header: headerLabel("الهاتف"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <Ltr className="font-mono text-sm tabular-nums">{prettyPhone(row.original.phone_number)}</Ltr> },
    { id: "weight", meta: { numeric: true }, header: headerLabel("أقصى وزن/بوليصة (كغ)"), cell: ({ row }) => <Mono>{row.original.max_weight_per_awb}</Mono> },
    { id: "items", meta: { numeric: true }, header: headerLabel("أقصى قطع"), cell: ({ row }) => <Mono>{row.original.max_items_per_awb}</Mono> },
    { id: "divisor", meta: { numeric: true }, header: headerLabel("المقسوم الحجمي"), cell: ({ row }) => <Mono>{row.original.volumetric_divisor}</Mono> },
    { id: "hazardous", header: headerLabel("مواد خطرة"), cell: ({ row }) => <span className={row.original.accepts_hazardous ? "" : "text-muted-foreground"}>{row.original.accepts_hazardous ? "يقبل" : "لا يقبل"}</span> },
    {
      id: "link",
      header: headerLabel(tab === "agents" ? "حساب الموظف" : "ربط الناقل"),
      cell: ({ row }) => <LinkCell p={row.original} />,
    },
    { id: "active", header: headerLabel("الحالة"), cell: ({ row }) => <ActiveDot active={row.original.is_active} /> },
    {
      id: "actions",
      meta: { srOnlyHeader: true, className: "w-px whitespace-nowrap" },
      header: headerLabel("إجراءات"),
      cell: ({ row }) => (
        <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={ghostButton} onClick={() => void setOpenId(String(row.original.id))} data-testid="provider-edit">
            تعديل
          </button>
          <button type="button" className={`${ghostButton} text-destructive`} onClick={() => setDeleting(row.original)}>
            حذف
          </button>
        </span>
      ),
    },
  ];

  const add = (
    <button type="button" className={primaryButton} onClick={() => void setOpenId("new")} data-testid="add-provider">
      <Plus className="size-4" aria-hidden /> {tab === "agents" ? "مندوب" : "شركة شحن"}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="providers-screen">
      <PageHeader title="المندوبون وشركات الشحن" description="حدود كل جهة لكل بوليصة: الوزن والقطع والمقسوم الحجمي والمواد الخطرة." actions={add} />
      <ShippingSubnav />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          void setTab(v as ProviderTab);
          table.resetPage();
        }}
      >
        <TabsList variant="line" className="h-11 border-b border-border lg:h-9" aria-label="نوع الجهة">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="min-h-11 gap-1.5 px-3 lg:min-h-8" data-testid={`providers-tab-${t}`}>
              {PROVIDER_TAB_LABELS[t]}
              <Mono className="text-xs text-muted-foreground">{query.data?.counts[t] ?? "–"}</Mono>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">عند وجود منتج خطر في الطلب تُعرض في شاشة الطلب الجهات التي تقبل المواد الخطرة فقط.</p>

      <DataTable<Provider>
        testId="providers-table"
        caption={PROVIDER_TAB_LABELS[tab]}
        columns={columns}
        data={rows}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowOpen={(p) => void setOpenId(String(p.id))}
        emptyState={
          <EmptyState
            title={tab === "agents" ? "لا مندوبين بعد — أضف مندوبك الأول واربطه بحساب موظف" : "لا شركات شحن — أضف أرامكس أو سمسا ثم اربط حسابك"}
            description={tab === "agents" ? "المندوب الداخلي يستلم البوالص في تطبيق المندوب ضمن حدوده." : "اربط بيانات الاعتماد من شاشة الناقلين ليصدر المتجر البوالص تلقائياً."}
            action={add}
          />
        }
        renderMobileCard={(p) => (
          <div className="flex flex-col gap-1.5 p-3" data-testid="provider-card">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-medium">{p.name}</span>
              <ActiveDot active={p.is_active} />
            </span>
            <span className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
              <Ltr className="font-mono tabular-nums">{prettyPhone(p.phone_number)}</Ltr>
              <span>
                <Mono>{p.max_weight_per_awb}</Mono> كغ · <Mono>{p.max_items_per_awb}</Mono> قطعة
              </span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <LinkCell p={p} />
              <button type="button" className={ghostButton} onClick={() => void setOpenId(String(p.id))}>
                تعديل
              </button>
            </span>
          </div>
        )}
      />

      <ProviderSheet open={openId === "new" || Boolean(editing)} provider={editing} defaultCarrier={tab === "companies" ? "aramex" : ""} onOpenChange={(o) => (o ? null : void setOpenId(null))} />
      <ConfirmDelete
        open={deleting !== null}
        title={`حذف «${deleting?.name ?? ""}»؟`}
        description="لن تُسند إليه بوالص جديدة؛ البوالص الصادرة تبقى كما هي."
        pending={writes.remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          writes.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("حُذفت الجهة.");
              setDeleting(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
          })
        }
      />
    </div>
  );
}

function LinkCell({ p }: { p: Provider }) {
  if (p.carrier_code) {
    return (
      <span className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {p.carrier_connection ? <ConnectionText connection={p.carrier_connection} /> : null}
        <Link href={`/dashboard/shipping/carriers/${p.carrier_code}`} className="inline-flex min-h-11 items-center text-xs underline underline-offset-4 lg:min-h-0">
          إعدادات الربط
        </Link>
      </span>
    );
  }
  if (!p.staff_account_name) return <span className="text-sm text-muted-foreground">بلا حساب</span>;
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      {p.staff_account_name}
      {p.staff_account_terminated ? (
        <span className="inline-flex items-center gap-1 text-xs text-warning" data-testid="terminated-badge">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          الحساب مُنهى
        </span>
      ) : null}
    </span>
  );
}

function toForm(p: Provider | undefined, defaultCarrier: "" | "aramex"): ProviderForm {
  if (!p) return { name: "", phone_number: "", is_active: true, max_weight_per_awb: "25", max_items_per_awb: "10", accepts_hazardous: false, volumetric_divisor: "5000", carrier_code: defaultCarrier, staff_account: "" };
  return {
    name: p.name,
    phone_number: p.phone_number,
    is_active: p.is_active,
    max_weight_per_awb: p.max_weight_per_awb,
    max_items_per_awb: String(p.max_items_per_awb),
    accepts_hazardous: p.accepts_hazardous,
    volumetric_divisor: String(p.volumetric_divisor),
    carrier_code: p.carrier_code,
    staff_account: p.staff_account ? String(p.staff_account) : "",
  };
}

function ProviderSheet({ open, provider, defaultCarrier, onOpenChange }: { open: boolean; provider?: Provider; defaultCarrier: "" | "aramex"; onOpenChange: (o: boolean) => void }) {
  const writes = useProviderWrites();
  const staff = useStaffOptions(open);
  const form = useForm<ProviderForm>({ resolver: zodResolver(providerFormSchema), defaultValues: toForm(undefined, defaultCarrier) });
  const { register, control, handleSubmit, reset, formState } = form;
  useEffect(() => {
    if (open) reset(toForm(provider, defaultCarrier));
  }, [open, provider, defaultCarrier, reset]);
  const carrier = useWatch({ control, name: "carrier_code" });
  const staffId = useWatch({ control, name: "staff_account" });
  const linked = staff.data?.find((s) => String(s.id) === staffId);

  const submit = handleSubmit(async (v) => {
    const body = { ...v, max_items_per_awb: Number(v.max_items_per_awb), volumetric_divisor: Number(v.volumetric_divisor), staff_account: v.carrier_code || !v.staff_account ? null : Number(v.staff_account) };
    try {
      await writes.save.mutateAsync({ id: provider?.id ?? null, body });
      toast.success(provider ? "حُفظت الجهة." : v.carrier_code ? "أُضيفت شركة الشحن." : "أُضيف المندوب.");
      onOpenChange(false);
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={provider ? `تعديل «${provider.name}»` : carrier ? "شركة شحن جديدة" : "مندوب جديد"} description="الحدود تُطبَّق عند إصدار كل بوليصة." testId="provider-form">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        <Field label="الجهة" htmlFor="provider-carrier" hint="فارغ = مندوب شروة شيب الداخلي." error={formState.errors.carrier_code?.message}>
          <NativeSelect id="provider-carrier" className="h-11 md:h-8" data-testid="provider-carrier" {...register("carrier_code")}>
            <option value="">مندوب شروة شيب (داخلي)</option>
            {CARRIER_CODES.map((c) => (
              <option key={c} value={c}>
                {CARRIER_LABELS[c]} ({c})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="الاسم" htmlFor="provider-name" required error={formState.errors.name?.message}>
          <input id="provider-name" className={inputClass} aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="رقم الهاتف" htmlFor="provider-phone" required error={formState.errors.phone_number?.message}>
          <input id="provider-phone" dir="ltr" inputMode="tel" placeholder="967770000000" className={`${inputClass} font-mono text-start`} aria-invalid={Boolean(formState.errors.phone_number)} {...register("phone_number")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="أقصى وزن (كغ)" htmlFor="provider-weight" required error={formState.errors.max_weight_per_awb?.message}>
            <input id="provider-weight" dir="ltr" inputMode="decimal" className={numericInputClass} aria-invalid={Boolean(formState.errors.max_weight_per_awb)} {...register("max_weight_per_awb")} />
          </Field>
          <Field label="أقصى قطع" htmlFor="provider-items" required error={formState.errors.max_items_per_awb?.message}>
            <input id="provider-items" dir="ltr" inputMode="numeric" className={numericInputClass} aria-invalid={Boolean(formState.errors.max_items_per_awb)} {...register("max_items_per_awb")} />
          </Field>
        </div>
        <Field label="المقسوم الحجمي" htmlFor="provider-divisor" required error={formState.errors.volumetric_divisor?.message} hint="الوزن الحجمي = الطول × العرض × الارتفاع ÷ هذا الرقم.">
          <input id="provider-divisor" dir="ltr" inputMode="numeric" className={numericInputClass} aria-invalid={Boolean(formState.errors.volumetric_divisor)} {...register("volumetric_divisor")} />
        </Field>
        {!carrier ? (
          <Field
            label="حساب الموظف"
            htmlFor="provider-staff"
            error={formState.errors.staff_account?.message}
            hint={linked?.is_terminated ? <span className="text-warning">الحساب مُنهى — اختر موظفاً نشطاً لإعادة الربط.</span> : "يدخل المندوب تطبيق المندوب بحساب هذا الموظف."}
          >
            <NativeSelect id="provider-staff" className="h-11 md:h-8" aria-invalid={Boolean(formState.errors.staff_account)} data-testid="provider-staff" {...register("staff_account")}>
              <option value="">بلا ربط</option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id} disabled={s.is_terminated && String(s.id) !== staffId}>
                  {s.full_name}
                  {s.is_terminated ? " — الحساب مُنهى" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <div className="divide-y divide-border/60 surface-card px-3 overflow-hidden">
          <Controller control={control} name="accepts_hazardous" render={({ field }) => <ToggleRow id="provider-hazard" label="يقبل المواد الخطرة" description="العطور والبطاريات وما يعلَّم «خطر» في المنتج." checked={field.value} onCheckedChange={field.onChange} />} />
          <Controller control={control} name="is_active" render={({ field }) => <ToggleRow id="provider-active" label="نشط" description="غير النشط لا تُسند إليه بوالص جديدة." checked={field.value} onCheckedChange={field.onChange} />} />
        </div>
        <SheetActions onCancel={() => onOpenChange(false)} submitLabel={provider ? "حفظ" : "إضافة"} pending={formState.isSubmitting} testId="provider-submit" />
      </form>
    </FormSheet>
  );
}
