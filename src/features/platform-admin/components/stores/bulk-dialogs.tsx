"use client";

import { useState } from "react";
import { BulkActionDialog } from "@/components/shared/data-table";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useBulkOverride, useFeatures, useReprovision } from "@/features/platform-admin/api/hooks";
import { toastResult } from "@/features/platform-admin/components/bits";
import { groupByModule } from "@/features/platform-admin/components/stores/store-bits";
import type { StoreRow } from "@/features/platform-admin/schemas";

/**
 * Bulk «إعادة التجهيز» (US-20.2 a2): preview splits the selection into eligible
 * (failed / stalled) and not, then reports per store from the server's own results.
 */
export function ReprovisionDialog({ open, onOpenChange, stores, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; stores: StoreRow[]; onDone: () => void }) {
  const run = useReprovision();
  const eligible = stores.filter((s) => s.provisioning_status === "failed" || s.is_stalled).length;
  return (
    <BulkActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="إعادة تجهيز المتاجر المحددة"
      count={stores.length}
      description={`المؤهَّل منها (فاشل أو متعثّر): ${eligible}. البقية تُرفض بسببها.`}
      confirmLabel="أرسل مهام إعادة التجهيز"
      confirmDisabled={stores.length === 0}
      run={async () => {
        const res = await run.mutateAsync(stores.map((s) => s.schema_name));
        toastResult({ detail: res.detail });
        return {
          succeeded: res.results.filter((r) => r.queued).length,
          failed: res.results.filter((r) => !r.queued).map((r) => ({ id: r.schema_name, label: stores.find((s) => s.schema_name === r.schema_name)?.name ?? r.schema_name, reason: r.reason ?? "رُفض" })),
        };
      }}
      onDone={onDone}
    >
      <p className="text-xs text-muted-foreground">
        تُرسَل <Mono>provision_tenant_schema</Mono> لكل متجر مؤهَّل؛ تتحدّث الحالة تلقائياً حتى «جاهز».
      </p>
    </BulkActionDialog>
  );
}

type Value = "on" | "off" | "remove";

/** Bulk feature override on the selected stores (US-20.2 a4 → `feature-overrides/bulk`). */
export function BulkOverrideDialog({ open, onOpenChange, schemas, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; schemas: string[]; onDone: () => void }) {
  const features = useFeatures();
  const bulk = useBulkOverride();
  const [code, setCode] = useState("");
  const [value, setValue] = useState<Value>("on");
  const [notes, setNotes] = useState("");
  const groups = groupByModule(features.data ?? []);

  return (
    <BulkActionDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setCode("");
          setValue("on");
          setNotes("");
        }
      }}
      title="استثناء ميزة للمتاجر المحددة"
      count={schemas.length}
      description="الاستثناء يفوز على الإيقاف العالمي والباقة."
      confirmLabel="طبّق الاستثناء"
      confirmDisabled={!code || schemas.length === 0}
      run={async () => {
        const res = await bulk.mutateAsync({ feature_code: code, schema_names: schemas, is_enabled: value === "remove" ? null : value === "on", notes });
        toastResult({ detail: res.detail });
        return { succeeded: value === "remove" ? res.removed : res.created + res.updated, failed: [] };
      }}
      onDone={onDone}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        الميزة
        <NativeSelect value={code} onChange={(e) => setCode(e.target.value)} className="h-11 lg:h-8" data-testid="bulk-feature">
          <option value="">اختر ميزة…</option>
          {groups.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.rows.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name} ({f.code})
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </label>
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1.5">القيمة</legend>
        {(
          [
            ["on", "تفعيل"],
            ["off", "تعطيل"],
            ["remove", "إزالة الاستثناء (العودة إلى الموروث)"],
          ] as const
        ).map(([v, label]) => (
          <label key={v} className="flex min-h-11 items-center gap-2 lg:min-h-8">
            <input type="radio" name="bulk-value" value={v} checked={value === v} onChange={() => setValue(v)} className="size-4 accent-foreground" data-testid={`bulk-value-${v}`} />
            {label}
          </label>
        ))}
      </fieldset>
      {value !== "remove" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          ملاحظة
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} rows={2} placeholder="سبب الاستثناء — يظهر في صف المتجر" />
        </label>
      ) : null}
    </BulkActionDialog>
  );
}
