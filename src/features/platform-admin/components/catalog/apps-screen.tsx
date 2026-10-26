"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/schemas/money";
import { isApiError } from "@/lib/api-error";
import { useAppOverrides, useApps, useCreateAppOverride, useDeleteAppOverride, useSaveApp } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError } from "@/features/platform-admin/components/bits";
import { BTN, Field, INPUT, SkeletonRows, StorePicker, Table, Td, Th, YesNo } from "@/features/platform-admin/components/billing/ui";
import { APP_INTERVALS, APP_INTERVAL_LABELS, appInputSchema, type App, type AppInput, type AppOverride, type ClientOption } from "@/features/platform-admin/schemas";

/**
 * `/apps` (M46 US-46.5, M20 US-20.6 a2): the app catalogue + per-store billing overrides
 * (`AppBillingOverride`, unique per (app, store)). App icons are names, not brand marks.
 */
export function AppsScreen() {
  const apps = useApps();
  const canWrite = useCanWrite("apps");
  const [editing, setEditing] = useState<App | "new" | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="التطبيقات"
        description="كتالوج متجر التطبيقات وتسعيره، واستثناءات الفوترة لكل متجر."
        actions={
          <Button className={BTN} disabled={!canWrite} onClick={() => setEditing("new")} data-testid="app-new">
            تطبيق جديد
          </Button>
        }
      />
      {!canWrite ? <ReadOnlyNote /> : null}
      {apps.error ? <ErrorState error={apps.error} onRetry={() => void apps.refetch()} /> : null}
      {apps.data && apps.data.length === 0 ? (
        <EmptyState title="لا تطبيقات في الكتالوج" />
      ) : (
        <Table caption="التطبيقات" testId="apps-table" tableClassName="min-w-[52rem]">
          <thead>
            <tr>
              <Th>التطبيق</Th>
              <Th>الكود</Th>
              <Th>مُدرج</Th>
              <Th>مجاني</Th>
              <Th numeric>السعر</Th>
              <Th>الفترة</Th>
              <Th>الفوترة</Th>
              <Th numeric>التثبيتات</Th>
              <Th>
                <span className="sr-only">إجراءات</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {apps.isLoading ? <SkeletonRows cols={9} /> : null}
            {apps.data?.map((a) => (
              <tr key={a.code} data-testid="app-row" data-code={a.code}>
                <Td>
                  <span className="flex flex-col">
                    <span className="whitespace-nowrap font-medium">{a.name}</span>
                    <span className="line-clamp-1 max-w-64 text-xs text-muted-foreground">{a.description}</span>
                  </span>
                </Td>
                <Td>
                  <Code>{a.code}</Code>
                </Td>
                <Td>{a.is_listed ? <StatusText tone="success">مُدرج</StatusText> : <StatusText tone="muted">مخفي</StatusText>}</Td>
                <Td>
                  <YesNo value={a.is_free} />
                </Td>
                <Td numeric>
                  <Money value={a.display_price} />
                </Td>
                <Td>{APP_INTERVAL_LABELS[a.billing_interval]}</Td>
                <Td>
                  <span className="flex flex-col">
                    <YesNo value={a.billing_enabled} yes="مفعّلة" no="متوقفة" />
                    {a.is_free && a.billing_enabled ? (
                      <span className="text-[11px] text-warning" data-testid="app-conflict">
                        تعارض: مجاني والفوترة مفعّلة — الباك إند يحسم
                      </span>
                    ) : null}
                  </span>
                </Td>
                <Td numeric>
                  <Mono>{a.installations}</Mono>
                </Td>
                <Td>
                  <Button variant="ghost" className={BTN} onClick={() => setEditing(a)} data-testid="app-edit">
                    {canWrite ? "تعديل" : "عرض"}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <AppOverrides apps={apps.data ?? []} canWrite={canWrite} />
      <AppSheet key={editing === "new" ? "new" : editing?.code ?? "none"} app={editing} canWrite={canWrite} onClose={() => setEditing(null)} />
    </div>
  );
}

function toForm(a: App | null): AppInput {
  if (!a) return { code: "", name: "", description: "", icon: "", is_listed: true, is_free: false, price: "0.00", currency: "SAR", billing_interval: "monthly", billing_enabled: true };
  return { code: a.code, name: a.name, description: a.description, icon: a.icon, is_listed: a.is_listed, is_free: a.is_free, price: a.price, currency: a.currency, billing_interval: a.billing_interval, billing_enabled: a.billing_enabled };
}

function AppSheet({ app, canWrite, onClose }: { app: App | "new" | null; canWrite: boolean; onClose: () => void }) {
  const existing = app && app !== "new" ? app : null;
  const save = useSaveApp(existing?.code ?? null);
  const form = useForm<AppInput>({ resolver: zodResolver(appInputSchema), defaultValues: toForm(existing) });
  const { errors } = form.formState;
  const [isFree, billing] = useWatch({ control: form.control, name: ["is_free", "billing_enabled"] });

  const submit = form.handleSubmit(async (v) => {
    try {
      const saved = await save.mutateAsync(v);
      toast.success(existing ? `حُفظ «${saved.name}».` : `أُضيف «${saved.name}».`);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) for (const [k, m] of Object.entries(err.fields)) form.setError(k as keyof AppInput, { message: m[0] });
      toastError(err);
    }
  });

  const sw = (name: "is_listed" | "is_free" | "billing_enabled", label: string) => (
    <label className="flex min-h-11 items-center justify-between gap-3 lg:min-h-8">
      <span className="text-sm">{label}</span>
      <Controller control={form.control} name={name} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canWrite} data-testid={`app-${name}`} />} />
    </label>
  );

  return (
    <Sheet open={app !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-lg" data-testid="app-sheet">
        <SheetHeader>
          <SheetTitle>{existing ? `«${existing.name}»` : "تطبيق جديد"}</SheetTitle>
          <SheetDescription>حقول App كما هي.</SheetDescription>
        </SheetHeader>
        <form id="app-form" onSubmit={submit} noValidate className="flex flex-col gap-4 px-4">
          <fieldset disabled={!canWrite} className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الكود" htmlFor="app-code" error={errors.code?.message}>
                <Input id="app-code" dir="ltr" className={`${INPUT} font-mono`} readOnly={Boolean(existing)} {...form.register("code")} />
              </Field>
              <Field label="الاسم" htmlFor="app-name" error={errors.name?.message}>
                <Input id="app-name" className={INPUT} {...form.register("name")} />
              </Field>
            </div>
            <Field label="الوصف" htmlFor="app-description">
              <Textarea id="app-description" rows={2} {...form.register("description")} />
            </Field>
            <Field label="اسم الأيقونة" htmlFor="app-icon" hint="اسم أيقونة من المكتبة (مثل message-circle) — لا شعارات.">
              <Input id="app-icon" dir="ltr" className={`${INPUT} font-mono`} {...form.register("icon")} />
            </Field>
            {sw("is_listed", "مُدرج في المتجر")}
            {sw("is_free", "مجاني")}
            <div className="grid grid-cols-2 gap-3">
              <Field label="السعر" htmlFor="app-price" error={errors.price?.message}>
                <Input id="app-price" dir="ltr" inputMode="decimal" className={`${INPUT} font-mono`} {...form.register("price")} />
              </Field>
              <Field label="العملة" htmlFor="app-currency">
                <NativeSelect id="app-currency" className={INPUT} {...form.register("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="الفترة" htmlFor="app-interval">
              <NativeSelect id="app-interval" className={INPUT} {...form.register("billing_interval")}>
                {APP_INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {APP_INTERVAL_LABELS[i]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {sw("billing_enabled", "الفوترة مفعّلة")}
            {isFree && billing ? (
              <p role="note" className="text-xs text-warning" data-testid="app-sheet-conflict">
                تعارض: مجاني والفوترة مفعّلة — الباك إند يحسم.
              </p>
            ) : null}
          </fieldset>
        </form>
        <SheetFooter className="flex-row justify-end border-t border-border">
          <Button variant="outline" className={BTN} onClick={onClose}>
            إغلاق
          </Button>
          {canWrite ? (
            <Button type="submit" form="app-form" className={BTN} disabled={save.isPending} data-testid="app-save">
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AppOverrides({ apps, canWrite }: { apps: App[]; canWrite: boolean }) {
  const list = useAppOverrides();
  const create = useCreateAppOverride();
  const del = useDeleteAppOverride();
  const [appCode, setAppCode] = useState("");
  const [store, setStore] = useState<ClientOption[]>([]);
  const [billed, setBilled] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<AppOverride | null>(null);
  const duplicate = store[0] && appCode ? (list.data ?? []).find((o) => o.app_code === appCode && o.schema_name === store[0]!.schema_name) : undefined;

  async function submit() {
    const e: Record<string, string> = {};
    if (!appCode) e.app_code = "اختر تطبيقاً.";
    if (!store[0]) e.schema_name = "اختر متجراً.";
    if (duplicate) e.schema_name = "لهذا المتجر استثناء على هذا التطبيق — عدّل القائم.";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const row = await create.mutateAsync({ app_code: appCode, schema_name: store[0]!.schema_name, is_billed: billed, notes });
      toast.success(`استثناء «${row.app_name}» لـ ${row.store_name}: ${row.is_billed ? "يُفوتر" : "بلا فوترة"}.`);
      setStore([]);
      setNotes("");
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      toastError(err);
    }
  }

  return (
    <section aria-labelledby="app-ov-h" className="flex flex-col gap-4">
      <h2 id="app-ov-h" className="text-base font-medium">
        استثناءات الفوترة
      </h2>
      <Table caption="استثناءات فوترة التطبيقات" testId="app-overrides-table" tableClassName="min-w-[40rem]">
        <thead>
          <tr>
            <Th>التطبيق</Th>
            <Th>المتجر</Th>
            <Th>يُفوتر</Th>
            <Th>ملاحظة</Th>
            <Th>
              <span className="sr-only">إجراءات</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {list.isLoading ? <SkeletonRows cols={5} rows={2} /> : null}
          {list.data?.length === 0 ? (
            <tr>
              <Td colSpan={5} className="text-sm text-muted-foreground">
                لا استثناءات — كل التثبيتات تتبع إعداد التطبيق.
              </Td>
            </tr>
          ) : null}
          {list.data?.map((o) => (
            <tr key={o.id} data-testid="app-override-row" data-schema={o.schema_name} data-app={o.app_code}>
              <Td className="whitespace-nowrap">{o.app_name}</Td>
              <Td className="whitespace-nowrap">
                <Link href={`/stores/${encodeURIComponent(o.schema_name)}`} className="flex flex-col hover:underline">
                  <span>{o.store_name}</span>
                  <Code className="text-muted-foreground">{o.schema_name}</Code>
                </Link>
              </Td>
              <Td>{o.is_billed ? <StatusText tone="success">يُفوتر</StatusText> : <StatusText tone="muted">بلا فوترة</StatusText>}</Td>
              <Td className="text-xs text-muted-foreground">{o.notes || "—"}</Td>
              <Td>
                <Button variant="ghost" className={`${BTN} text-destructive`} disabled={!canWrite} onClick={() => setDeleting(o)} data-testid="app-override-delete">
                  حذف
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <fieldset disabled={!canWrite} className="grid gap-3 surface-card p-5 lg:p-6 md:grid-cols-2" data-testid="app-override-form">
        <legend className="px-1 text-sm font-medium">استثناء جديد</legend>
        <Field label="التطبيق" htmlFor="ov-app" error={errors.app_code}>
          <NativeSelect id="ov-app" className={INPUT} value={appCode} onChange={(e) => setAppCode(e.target.value)} data-testid="ov-app">
            <option value="">اختر تطبيقاً</option>
            {apps.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="المتجر" htmlFor="ov-store" error={errors.schema_name}>
          <StorePicker id="ov-store" value={store} onChange={setStore} disabled={!canWrite} testId="ov-store" />
          {duplicate && !errors.schema_name ? (
            <p className="text-xs text-warning" data-testid="ov-duplicate">
              لهذا المتجر استثناء على هذا التطبيق — عدّل القائم أو احذفه أولاً.
            </p>
          ) : null}
        </Field>
        <label className="flex min-h-11 items-center justify-between gap-3 lg:min-h-8">
          <span className="text-sm">يُفوتر</span>
          <Switch checked={billed} onCheckedChange={setBilled} data-testid="ov-billed" />
        </label>
        <Field label="ملاحظة" htmlFor="ov-notes">
          <Input id="ov-notes" className={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} />
        </Field>
        <div className="md:col-span-2">
          <Button className={BTN} onClick={() => void submit()} disabled={create.isPending} data-testid="ov-submit">
            {create.isPending ? "جارٍ الحفظ…" : "إضافة الاستثناء"}
          </Button>
        </div>
      </fieldset>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف استثناء الفوترة"
        impact={deleting ? `يعود «${deleting.app_name}» لدى ${deleting.store_name} إلى إعداد التطبيق العام.` : null}
        confirmLabel="حذف"
        destructive
        pending={del.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await del.mutateAsync(deleting.id);
            toast.success("حُذف الاستثناء.");
          } catch (err) {
            toastError(err);
          }
          setDeleting(null);
        }}
      />
    </section>
  );
}
