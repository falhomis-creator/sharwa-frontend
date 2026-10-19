"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDate, toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConnect, useConnection, useDisconnectSupplier, useRotateWebhook, useSaveSyncSettings } from "@/features/dropshipping/api";
import { SUPPLIER_LABELS, settingsFormSchema, type Connection, type SettingsForm, type SupplierCode } from "@/features/dropshipping/schemas";
import { DropshippingGate, DropshippingNav, StatusText } from "@/features/dropshipping/components/bits";

/**
 * `/dashboard/channels/dropshipping/suppliers/[code]` (US-29.1, FR-29.03): connect with
 * credentials (never shown back), sync toggles + intervals + stock buffer + hide-when-out,
 * webhook rotation whose new URL is shown ONCE with a copy button.
 */
export function SupplierSettingsScreen({ code }: { code: SupplierCode }) {
  return (
    <DropshippingGate>
      <Inner code={code} />
    </DropshippingGate>
  );
}

function Inner({ code }: { code: SupplierCode }) {
  const q = useConnection(code);
  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const c = q.data;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={code}
        title={SUPPLIER_LABELS[code]}
        description={c.connected && c.connected_at ? `مربوط منذ ${formatDate(c.connected_at)}` : "غير مربوط"}
        actions={<StatusText tone={c.connected ? "success" : "muted"} label={c.connected ? "مربوط" : "غير مربوط"} />}
      />
      <DropshippingNav active={null} />
      {c.connected ? (
        <>
          <SettingsFormView key={JSON.stringify(c.settings)} code={code} c={c} />
          {code !== "flat_feed" ? <WebhookSection code={code} configured={c.webhook_configured} /> : null}
          <DisconnectSection code={code} />
        </>
      ) : (
        <ConnectForm code={code} />
      )}
    </div>
  );
}

function ConnectForm({ code }: { code: SupplierCode }) {
  const id = useId();
  const connect = useConnect(code);
  const [apiKey, setApiKey] = useState("");
  const [storeId, setStoreId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="flex max-w-md flex-col gap-4"
      data-testid="connect-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await connect.mutateAsync(code === "flat_feed" ? {} : { api_key: apiKey.trim(), ...(code === "makhazen" ? { store_id: storeId.trim() } : {}) });
          toast.success(`رُبط ${SUPPLIER_LABELS[code]}`);
          setApiKey("");
        } catch (err) {
          if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace("credentials.", ""), v[0] ?? ""])));
          else toast.error(isApiError(err) ? err.userMessage : "تعذّر الربط");
        }
      }}
    >
      {code === "flat_feed" ? (
        <p className="text-sm text-muted-foreground">الملف المسطّح لا يحتاج بيانات اعتماد — يُنشأ الاتصال ثم تُرفع الملفات من «الملفات».</p>
      ) : (
        <>
          <Field label="مفتاح API" htmlFor={`${id}-key`} required error={errors.api_key} hint="يُحفظ مشفّراً ولا يُعرض مجدداً.">
            <input id={`${id}-key`} type="password" autoComplete="off" dir="ltr" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={cn(inputClass, "font-mono")} data-testid="connect-key" />
          </Field>
          {code === "makhazen" ? (
            <Field label="معرّف المتجر لدى مخازن" htmlFor={`${id}-store`} required error={errors.store_id}>
              <input id={`${id}-store`} dir="ltr" value={storeId} onChange={(e) => setStoreId(e.target.value)} className={cn(inputClass, "font-mono")} />
            </Field>
          ) : null}
        </>
      )}
      <div>
        <Button type="submit" className="h-11 lg:h-9" disabled={connect.isPending} data-testid="connect-save">
          حفظ وربط
        </Button>
      </div>
    </form>
  );
}

function SettingsFormView({ code, c }: { code: SupplierCode; c: Connection }) {
  const id = useId();
  const save = useSaveSyncSettings(code);
  const s = c.settings;
  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      sync_products: s.sync_products,
      sync_prices: s.sync_prices,
      sync_inventory: s.sync_inventory,
      products_minutes: String(s.intervals.products_minutes),
      prices_minutes: String(s.intervals.prices_minutes),
      inventory_minutes: String(s.intervals.inventory_minutes),
      stock_buffer: String(s.stock_buffer),
      hide_when_out_of_stock: s.hide_when_out_of_stock,
    },
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const hide = useWatch({ control, name: "hide_when_out_of_stock" });
  const err = (k: keyof SettingsForm) => formState.errors[k]?.message;
  const digits = { setValueAs: (v: string) => toWesternDigits(String(v)) };
  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        sync_products: v.sync_products,
        sync_prices: v.sync_prices,
        sync_inventory: v.sync_inventory,
        intervals: { products_minutes: Number(v.products_minutes), prices_minutes: Number(v.prices_minutes), inventory_minutes: Number(v.inventory_minutes) },
        stock_buffer: Number(v.stock_buffer),
        hide_when_out_of_stock: v.hide_when_out_of_stock,
      });
      toast.success("حُفظت إعدادات المزامنة");
    } catch (e) {
      if (isApiError(e) && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k.replace("intervals.", "") as FieldPath<SettingsForm>, { message: m[0] });
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
    }
  });
  const rows: Array<{ toggle: "sync_products" | "sync_prices" | "sync_inventory"; interval: "products_minutes" | "prices_minutes" | "inventory_minutes"; label: string }> = [
    { toggle: "sync_products", interval: "products_minutes", label: "مزامنة المنتجات" },
    { toggle: "sync_prices", interval: "prices_minutes", label: "مزامنة الأسعار" },
    { toggle: "sync_inventory", interval: "inventory_minutes", label: "مزامنة المخزون" },
  ];
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex max-w-2xl flex-col gap-4"
      data-testid="sync-settings"
    >
      <h2 className="text-base font-medium">المزامنة</h2>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <li key={r.toggle} className="flex flex-wrap items-center gap-3 p-3">
            <Controller control={control} name={r.toggle} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={r.label} />} />
            <span className="min-w-32 flex-1 text-sm">{r.label}</span>
            <Field label="كل (دقيقة)" htmlFor={`${id}-${r.interval}`} error={err(r.interval)} className="w-32">
              <input id={`${id}-${r.interval}`} inputMode="numeric" dir="ltr" {...register(r.interval, digits)} className={numericInputClass} />
            </Field>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="احتياطي المخزون" htmlFor={`${id}-buf`} error={err("stock_buffer")} hint="وحدات تُطرح من مخزون المورد قبل العرض.">
          <input id={`${id}-buf`} inputMode="numeric" dir="ltr" {...register("stock_buffer", digits)} className={numericInputClass} />
        </Field>
        <Controller
          control={control}
          name="hide_when_out_of_stock"
          render={({ field }) => (
            <label className="flex min-h-11 items-center justify-between gap-3 self-end text-sm">
              <span>إخفاء المنتج عند نفاد مخزون المورد</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="إخفاء عند النفاد" data-testid="hide-oos" />
            </label>
          )}
        />
      </div>
      {hide ? <p className="text-sm text-muted-foreground" data-testid="hide-oos-hint">سيُخفى المنتج من المتجر عند نفاد مخزون المورد.</p> : null}
      <div>
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="sync-save">
          حفظ
        </Button>
      </div>
    </form>
  );
}

function WebhookSection({ code, configured }: { code: SupplierCode; configured: boolean }) {
  const rotate = useRotateWebhook(code);
  const [confirm, setConfirm] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  return (
    <section className="flex max-w-2xl flex-col gap-3 border-t border-border pt-6" aria-labelledby="wh">
      <h2 id="wh" className="text-base font-medium">
        Webhook المورد
      </h2>
      <p className="text-sm text-muted-foreground">{configured ? "الرمز الحالي مخفي. التدوير يُبطل الرابط القديم فوراً." : "لا رابط بعد — دوّر الرمز لإنشائه."}</p>
      {url ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3" data-testid="webhook-url">
          <span className="text-xs text-muted-foreground">انسخه الآن — لن يُعرض مرة أخرى.</span>
          <span className="flex items-center gap-2">
            <Mono className="min-w-0 flex-1 break-all text-xs">{url}</Mono>
            <Button
              variant="outline"
              size="icon"
              className="size-11 lg:size-8"
              aria-label="نسخ الرابط"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("نُسخ الرابط");
                } catch {
                  toast.error("تعذّر النسخ");
                }
              }}
            >
              <Copy className="size-4" aria-hidden />
            </Button>
          </span>
        </div>
      ) : null}
      <div>
        <Button variant="outline" className="h-11 lg:h-9" onClick={() => setConfirm(true)} data-testid="webhook-rotate">
          تدوير رمز Webhook
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>تدوير الرمز؟</DialogTitle>
          <DialogDescription>سيتوقف الرابط الحالي عن العمل. حدّث الرابط لدى المورد بعد التدوير.</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className="h-11 lg:h-9" onClick={() => setConfirm(false)}>
              تراجع
            </Button>
            <Button
              className="h-11 lg:h-9"
              data-testid="webhook-rotate-confirm"
              onClick={async () => {
                setConfirm(false);
                try {
                  const r = await rotate.mutateAsync();
                  setUrl(r.webhook_url);
                } catch (e) {
                  toast.error(isApiError(e) ? e.userMessage : "تعذّر التدوير");
                }
              }}
            >
              تدوير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DisconnectSection({ code }: { code: SupplierCode }) {
  const disconnect = useDisconnectSupplier(code);
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="flex max-w-2xl flex-col gap-2 border-t border-border pt-6">
      <Button variant="destructive" className="h-11 self-start lg:h-9" onClick={() => setConfirm(true)}>
        فصل المورد
      </Button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>فصل {SUPPLIER_LABELS[code]}؟</DialogTitle>
          <DialogDescription>تتوقف المزامنة وإحالة الطلبات. المنتجات المستوردة تبقى في متجرك.</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className="h-11 lg:h-9" onClick={() => setConfirm(false)}>
              تراجع
            </Button>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              onClick={async () => {
                setConfirm(false);
                try {
                  await disconnect.mutateAsync();
                  toast.success("فُصل المورد");
                } catch (e) {
                  toast.error(isApiError(e) ? e.userMessage : "تعذّر الفصل");
                }
              }}
            >
              فصل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
