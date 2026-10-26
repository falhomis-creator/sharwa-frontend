"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { DataTable, headerLabel } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/schemas/money";
import { useDeleteZone, useSaveZone, useZones } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError } from "@/features/platform-admin/components/bits";
import { ZoneMap } from "@/features/platform-admin/components/zones/zone-map";
import { zoneInputSchema, zoneUpdateSchema, type Zone } from "@/features/platform-admin/schemas";
import { toast } from "sonner";

/**
 * `console.<base>/sharwa-ship/zones` (M20 US-20.6 a1). The zones the merchant's M15
 * «شروة شيب» screen reads (read-only there). Superuser writes only (FR-20.09); an operator
 * sees the table and the map with the controls disabled.
 */
type FormValues = {
  code: string;
  name: string;
  price: string;
  currency: (typeof CURRENCIES)[number];
  volumetric_divisor: string;
  center_latitude: string;
  center_longitude: string;
  radius_km: string;
  is_active: boolean;
  sort_order: string;
};

const EMPTY: FormValues = { code: "", name: "", price: "", currency: "YER_NEW", volumetric_divisor: "5000", center_latitude: "", center_longitude: "", radius_km: "", is_active: true, sort_order: "0" };

const fromZone = (z: Zone): FormValues => ({
  code: z.code,
  name: z.name,
  price: z.price,
  currency: z.currency,
  volumetric_divisor: String(z.volumetric_divisor),
  center_latitude: z.center_latitude ?? "",
  center_longitude: z.center_longitude ?? "",
  radius_km: z.radius_km ?? "",
  is_active: z.is_active,
  sort_order: String(z.sort_order),
});

export function ZonesScreen() {
  const q = useZones();
  const canWrite = useCanWrite("zones");
  const del = useDeleteZone();
  const [editing, setEditing] = useState<Zone | "new" | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const zones = q.data;

  const columns = useMemo<ColumnDef<Zone, unknown>[]>(
    () => [
      { id: "code", header: headerLabel("الكود"), cell: ({ row }) => <Code>{row.original.code}</Code> },
      { id: "name", header: headerLabel("الاسم"), cell: ({ row }) => <span className="whitespace-nowrap">{row.original.name}</span> },
      { id: "price", meta: { numeric: true }, header: headerLabel("السعر"), cell: ({ row }) => <Money value={row.original.display_price} /> },
      { id: "divisor", meta: { numeric: true }, header: headerLabel("المقسوم الحجمي"), cell: ({ row }) => <Mono>{row.original.volumetric_divisor}</Mono> },
      {
        id: "center",
        header: headerLabel("المركز"),
        cell: ({ row }) => (
          row.original.center_latitude && row.original.center_longitude ? (
            <Mono className="whitespace-nowrap text-xs text-muted-foreground">
              {row.original.center_latitude}, {row.original.center_longitude}
            </Mono>
          ) : (
            <span className="text-xs text-muted-foreground">بلا حدود</span>
          )
        ),
      },
      { id: "radius", meta: { numeric: true }, header: headerLabel("نصف القطر (كم)"), cell: ({ row }) => <Mono>{row.original.radius_km ?? "—"}</Mono> },
      { id: "active", header: headerLabel("الحالة"), cell: ({ row }) => (row.original.is_active ? <StatusText tone="success">نشطة</StatusText> : <StatusText tone="muted">غير نشطة</StatusText>) },
      { id: "sort", meta: { numeric: true }, header: headerLabel("الترتيب"), cell: ({ row }) => <Mono className="text-muted-foreground">{row.original.sort_order}</Mono> },
      {
        id: "actions",
        header: () => <span className="sr-only">إجراءات</span>,
        cell: ({ row }) => (
          <span className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-11 lg:h-7" disabled={!canWrite} onClick={() => setEditing(row.original)} data-testid="zone-edit">
              تعديل
            </Button>
            <Button variant="ghost" size="sm" className="h-11 text-destructive lg:h-7" disabled={!canWrite} onClick={() => setDeleting(row.original)} data-testid="zone-delete">
              حذف
            </Button>
          </span>
        ),
      },
    ],
    [canWrite],
  );

  async function remove() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(`حُذفت المنطقة ${deleting.code}.`);
    } catch (err) {
      toastError(err);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مناطق شروة شيب"
        description="مناطق التوصيل الرسمية وأسعارها — يقرؤها التاجر في «شروة شيب» للقراءة فقط."
        actions={
          <Button className="h-11 lg:h-8" disabled={!canWrite} onClick={() => setEditing("new")} data-testid="zone-new">
            منطقة جديدة
          </Button>
        }
      />
      {!canWrite ? <ReadOnlyNote /> : null}
      {zones?.length ? <ZoneMap zones={zones} highlight={highlight} /> : null}
      <div onMouseLeave={() => setHighlight(null)}>
        <DataTable<Zone>
          testId="zones-table"
          caption="مناطق شروة شيب"
          columns={columns}
          data={zones}
          getRowId={(z) => String(z.id)}
          total={zones?.length ?? 0}
          page={1}
          pageSize={Math.max(50, zones?.length ?? 0)}
          onPageChange={() => undefined}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
          onRowOpen={(z) => setHighlight(z.code)}
          emptyState={<EmptyState title="لا مناطق بعد" description="أضف أول منطقة توصيل لشروة شيب." />}
          renderMobileCard={(z) => (
            <div className="flex items-start justify-between gap-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm">
                  {z.name} <Code className="text-muted-foreground">{z.code}</Code>
                </span>
                {z.is_active ? <StatusText tone="success">نشطة</StatusText> : <StatusText tone="muted">غير نشطة</StatusText>}
              </span>
              <span className="flex flex-col items-end gap-1">
                <Money value={z.display_price} />
                <Button variant="ghost" size="sm" className="h-11" disabled={!canWrite} onClick={() => setEditing(z)}>
                  تعديل
                </Button>
              </span>
            </div>
          )}
        />
      </div>

      <ZoneSheet key={editing === "new" ? "new" : (editing?.id ?? "closed")} zone={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`حذف المنطقة ${deleting?.code ?? ""}`}
        impact={`تختفي «${deleting?.name ?? ""}» من شروة شيب لكل المتاجر — لا تُسعَّر طلبات جديدة عليها.`}
        confirmLabel="حذف"
        destructive
        pending={del.isPending}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function ZoneSheet({ zone, onClose }: { zone: Zone | "new" | null; onClose: () => void }) {
  const isNew = zone === "new";
  const existing = zone !== null && zone !== "new" ? zone : null;
  const id = existing?.id ?? null;
  const save = useSaveZone(id);
  const [v, setV] = useState<FormValues>(existing ? fromZone(existing) : EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | "detail", string>>>({});
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // An existing zone keeps its code (issued waybills reference it — Django refuses a change).
    const parsed = isNew ? zoneInputSchema.safeParse(v) : zoneUpdateSchema.safeParse(v);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormValues;
        next[k] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    try {
      await save.mutateAsync(parsed.data);
      toast.success(isNew ? `أُضيفت المنطقة ${v.code}.` : `حُفظت المنطقة ${existing?.code ?? v.code}.`);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        const next: typeof errors = {};
        for (const [k, msgs] of Object.entries(err.fields)) next[k as keyof FormValues] = msgs[0];
        setErrors(next);
      } else toastError(err);
    }
  }

  const field = (k: keyof FormValues, label: string, opts: { dir?: "ltr"; mono?: boolean; inputMode?: "decimal" | "numeric"; placeholder?: string; disabled?: boolean } = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`zone-${k}`}>{label}</Label>
      <Input
        id={`zone-${k}`}
        dir={opts.dir}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        disabled={opts.disabled}
        className={opts.mono ? "h-11 font-mono lg:h-9" : "h-11 lg:h-9"}
        value={String(v[k])}
        onChange={(e) => set(k, e.target.value as never)}
        aria-invalid={Boolean(errors[k])}
        data-testid={`zone-field-${k}`}
      />
      {errors[k] ? (
        <p className="text-xs text-destructive" data-testid={`zone-error-${k}`}>
          {errors[k]}
        </p>
      ) : null}
    </div>
  );

  return (
    <Sheet open={zone !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md" data-testid="zone-sheet">
        <SheetHeader>
          <SheetTitle>{isNew ? "منطقة جديدة" : `تعديل ${existing?.code ?? ""}`}</SheetTitle>
          <SheetDescription>السعر لكل شحنة بالعملة المختارة؛ المقسوم الحجمي الافتراضي 5000.</SheetDescription>
        </SheetHeader>
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4 px-4" id="zone-form">
          {field("code", "الكود", { dir: "ltr", mono: true, placeholder: "SAN-01", disabled: !isNew })}
          {field("name", "الاسم")}
          <div className="grid grid-cols-2 gap-3">
            {field("price", "السعر", { dir: "ltr", mono: true, inputMode: "decimal" })}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zone-currency">العملة</Label>
              <NativeSelect id="zone-currency" className="h-11 lg:h-9" value={v.currency} onChange={(e) => set("currency", e.target.value as FormValues["currency"])}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_LABELS[c]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("center_latitude", "خط العرض", { dir: "ltr", mono: true, inputMode: "decimal" })}
            {field("center_longitude", "خط الطول", { dir: "ltr", mono: true, inputMode: "decimal" })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field("radius_km", "نصف القطر (كم) — اختياري", { dir: "ltr", mono: true, inputMode: "decimal" })}
            {field("volumetric_divisor", "المقسوم الحجمي", { dir: "ltr", mono: true, inputMode: "numeric" })}
            {field("sort_order", "الترتيب", { dir: "ltr", mono: true, inputMode: "numeric" })}
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>نشطة</span>
            <Switch checked={v.is_active} onCheckedChange={(c) => set("is_active", c)} data-testid="zone-active" />
          </label>
        </form>
        <SheetFooter className="flex-row justify-start">
          <Button variant="outline" className="h-11 lg:h-9" onClick={onClose} disabled={save.isPending}>
            إلغاء
          </Button>
          <Button type="submit" form="zone-form" className="h-11 lg:h-9" disabled={save.isPending} data-testid="zone-save">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
