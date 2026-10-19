"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime, formatRelative } from "@/lib/format";
import { isApiError } from "@/lib/api-error";
import { useBulkOverride, useDeleteOverride, useFeatures, useOverrides } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { groupFeatures } from "@/features/platform-admin/components/billing/feature-groups";
import { BTN, Field, INPUT, SkeletonRows, StorePicker, Table, Td, Th } from "@/features/platform-admin/components/billing/ui";
import type { ClientOption, Feature, FeatureOverride } from "@/features/platform-admin/schemas";

/**
 * `/features/overrides` (M46 US-46.3): the per-store exceptions with `feature`/`schema` in
 * the URL, a bulk editor (many stores × one feature) and delete. An override wins over the
 * global kill switch and the plan (step 1 of the resolution order).
 */
const parsers = { feature: parseAsString.withDefault(""), schema: parseAsString.withDefault("") };

export function OverridesScreen() {
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const list = useOverrides({ feature: f.feature, schema: f.schema, page_size: 100 });
  const features = useFeatures();
  const canWrite = useCanWrite("billing");
  const del = useDeleteOverride();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleting, setDeleting] = useState<FeatureOverride | null>(null);
  const [now] = useState(() => new Date());
  const names = new Map((features.data ?? []).map((x) => [x.code, x.name]));

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toastResult({ detail: `أُزيل استثناء «${names.get(deleting.feature_code) ?? deleting.feature_code}» لـ ${deleting.store_name}.` });
      setDeleting(null);
    } catch (err) {
      toastError(err);
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="استثناءات المتاجر"
        description="استثناء المتجر يفوز على الإيقاف العالمي والباقة."
        actions={
          <Button className={BTN} disabled={!canWrite} onClick={() => setBulkOpen(true)} data-testid="bulk-open">
            استثناء جماعي
          </Button>
        }
      />
      {!canWrite ? <ReadOnlyNote /> : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-end" data-testid="override-filters">
        <Field label="الميزة" htmlFor="filter-feature">
          <FeatureSelect id="filter-feature" features={features.data ?? []} value={f.feature} onChange={(v) => void setF({ feature: v || null })} allLabel="كل الميزات" />
        </Field>
        <Field label="المخطط" htmlFor="filter-schema">
          <Input id="filter-schema" dir="ltr" className={`${INPUT} font-mono`} defaultValue={f.schema} onBlur={(e) => void setF({ schema: e.target.value.trim() || null })} onKeyDown={(e) => e.key === "Enter" && void setF({ schema: (e.target as HTMLInputElement).value.trim() || null })} placeholder="schema_name" />
        </Field>
        {f.feature || f.schema ? (
          <Button variant="ghost" className={BTN} onClick={() => void setF({ feature: null, schema: null })}>
            مسح الفلاتر
          </Button>
        ) : null}
      </div>
      {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && list.data.count === 0 ? (
        <EmptyState title={f.feature || f.schema ? "لا استثناءات تطابق الفلاتر" : "لا استثناءات"} description="كل المتاجر تتبع الباقة والمفتاح العالمي." />
      ) : (
        <Table caption="استثناءات الميزات" testId="overrides-table">
          <thead>
            <tr>
              <Th>الميزة</Th>
              <Th>المتجر</Th>
              <Th>القيمة</Th>
              <Th>ملاحظة</Th>
              <Th>آخر تحديث</Th>
              <Th>
                <span className="sr-only">إجراءات</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? <SkeletonRows cols={6} /> : null}
            {list.data?.results.map((o) => (
              <tr key={o.id} data-testid="override-row" data-schema={o.schema_name} data-feature={o.feature_code}>
                <Td>
                  <span className="flex flex-col">
                    <span>{names.get(o.feature_code) ?? o.feature_code}</span>
                    <Code className="text-muted-foreground">{o.feature_code}</Code>
                  </span>
                </Td>
                <Td>
                  <Link href={`/stores/${encodeURIComponent(o.schema_name)}`} className="flex flex-col hover:underline">
                    <span>{o.store_name}</span>
                    <Code className="text-muted-foreground">{o.schema_name}</Code>
                  </Link>
                </Td>
                <Td>
                  <span className="flex flex-col gap-0.5">
                    {o.is_enabled ? <StatusText tone="success">مفعّلة</StatusText> : <StatusText tone="destructive">معطّلة</StatusText>}
                    <span className="text-[11px] text-muted-foreground">يفوز على الإيقاف العالمي والباقة</span>
                  </span>
                </Td>
                <Td className="max-w-64 text-xs text-muted-foreground">{o.notes || "—"}</Td>
                <Td>
                  <time dateTime={o.updated_at} title={formatDateTime(o.updated_at)} className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatRelative(o.updated_at, now)}
                  </time>
                </Td>
                <Td>
                  <Button variant="ghost" className={`${BTN} text-destructive`} disabled={!canWrite} onClick={() => setDeleting(o)} data-testid="override-delete">
                    إزالة
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {list.data ? (
        <p className="text-xs text-muted-foreground">
          <Mono>{list.data.count}</Mono> استثناء
        </p>
      ) : null}

      {bulkOpen ? <BulkEditor features={features.data ?? []} initialFeature={f.feature} onClose={() => setBulkOpen(false)} /> : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="إزالة الاستثناء"
        impact={deleting ? `يعود «${names.get(deleting.feature_code) ?? deleting.feature_code}» لدى ${deleting.store_name} إلى الحسم الموروث (المفتاح العالمي ثم الباقة).` : null}
        confirmLabel="إزالة"
        destructive
        pending={del.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

export function FeatureSelect({ id, features, value, onChange, allLabel, testId }: { id?: string; features: Feature[]; value: string; onChange: (v: string) => void; allLabel?: string; testId?: string }) {
  return (
    <NativeSelect id={id} className={INPUT} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
      <option value="">{allLabel ?? "اختر ميزة"}</option>
      {groupFeatures(features).map((g) => (
        <optgroup key={g.key} label={g.label}>
          {g.items.map((x) => (
            <option key={x.code} value={x.code}>
              {x.name} ({x.code})
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}

function BulkEditor({ features, initialFeature, onClose }: { features: Feature[]; initialFeature: string; onClose: () => void }) {
  const bulk = useBulkOverride();
  const [feature, setFeature] = useState(initialFeature);
  const [stores, setStores] = useState<ClientOption[]>([]);
  const [value, setValue] = useState<"on" | "off" | "remove">("on");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);

  async function submit() {
    const e: Record<string, string> = {};
    if (!feature) e.feature_code = "اختر ميزة.";
    if (!stores.length) e.schema_names = "اختر متجراً واحداً على الأقل.";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const res = await bulk.mutateAsync({ feature_code: feature, schema_names: stores.map((s) => s.schema_name), is_enabled: value === "remove" ? null : value === "on", notes });
      setSummary(res.detail);
      toastResult({ detail: res.detail });
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      toastError(err);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !bulk.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="bulk-editor">
        <DialogHeader>
          <DialogTitle>استثناء جماعي</DialogTitle>
          <DialogDescription>ميزة واحدة لعدة متاجر. يُنشأ الاستثناء أو يُحدَّث لكل متجر.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="الميزة" htmlFor="bulk-feature" error={errors.feature_code}>
            <FeatureSelect id="bulk-feature" features={features} value={feature} onChange={setFeature} testId="bulk-feature" />
          </Field>
          <Field label="المتاجر" htmlFor="bulk-stores" error={errors.schema_names}>
            <StorePicker id="bulk-stores" value={stores} onChange={setStores} multiple testId="bulk-stores" />
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-sm font-medium">القيمة</legend>
            {(
              [
                ["on", "تفعيل — تعمل الميزة لهذه المتاجر"],
                ["off", "تعطيل — تُحجب عن هذه المتاجر"],
                ["remove", "إزالة الاستثناء — العودة إلى الموروث"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
                <input type="radio" name="bulk-value" value={v} checked={value === v} onChange={() => setValue(v)} data-testid={`bulk-value-${v}`} className="size-4 accent-foreground" />
                {label}
              </label>
            ))}
          </fieldset>
          <Field label="ملاحظة" htmlFor="bulk-notes">
            <Input id="bulk-notes" className={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="سبب الاستثناء — يراه فريق المنصة" />
          </Field>
          {summary ? (
            <p role="status" data-testid="bulk-summary" className="rounded-md border border-border px-3 py-2 text-sm">
              {summary}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" className={BTN} onClick={onClose} disabled={bulk.isPending}>
            {summary ? "إغلاق" : "إلغاء"}
          </Button>
          <Button className={BTN} onClick={() => void submit()} disabled={bulk.isPending} data-testid="bulk-apply">
            {bulk.isPending ? "جارٍ التطبيق…" : `تطبيق على ${stores.length} ${stores.length === 1 ? "متجر" : "متاجر"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

