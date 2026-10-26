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
          {code !== "flat_feed" && c.webhook_supported !== false ? <WebhookSection code={code} configured={c.webhook_configured} /> : null}
          <DisconnectSection code={code} />
        </>
      ) : (
        <>
          {c.reauth_required ? (
            <p className="max-w-md text-sm text-destructive" role="alert" data-testid="reauth-required">
              انتهى الربط أو أُلغي{c.last_error ? ` — ${c.last_error}` : ""}. أعد الربط بمفتاح جديد.
            </p>
          ) : null}
          <ConnectForm code={code} fields={c.credential_fields} />
        </>
      )}
    </div>
  );
}

type CredentialField = NonNullable<Connection["credential_fields"]>[number];
const DEFAULT_FIELDS: CredentialField[] = [{ name: "api_key", label: "مفتاح API", type: "password", help: "" }];

/** The credential inputs come from Django's supplier registry (`credential_fields`, INT-039); never shown back. */
function ConnectForm({ code, fields: declared }: { code: SupplierCode; fields?: CredentialField[] }) {
  const id = useId();
  const connect = useConnect(code);
  const fields = declared ?? (code === "flat_feed" ? [] : DEFAULT_FIELDS);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="flex max-w-md flex-col gap-4"
      data-testid="connect-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await connect.mutateAsync(Object.fromEntries(fields.map((f) => [f.name, (values[f.name] ?? "").trim()])));
          toast.success(`رُبط ${SUPPLIER_LABELS[code]}`);
          setValues({});
        } catch (err) {
          if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace("credentials.", ""), v[0] ?? ""])));
          else toast.error(isApiError(err) ? err.userMessage : "تعذّر الربط");
        }
      }}
    >
      {!fields.length ? (
        <p className="text-sm text-muted-foreground">الملف المسطّح لا يحتاج بيانات اعتماد — يُنشأ الاتصال ثم تُرفع الملفات من «الملفات».</p>
      ) : (
        fields.map((f, i) => (
          <Field key={f.name} label={f.label} htmlFor={`${id}-${f.name}`} required error={errors[f.name]} hint={[f.help, "يُحفظ مشفّراً ولا يُعرض مجدداً."].filter(Boolean).join(" ")}>
            <input
              id={`${id}-${f.name}`}
              type={f.type === "password" ? "password" : "text"}
              autoComplete="off"
              dir="ltr"
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className={cn(inputClass, "font-mono")}
              data-testid={i === 0 ? "connect-key" : `connect-${f.name}`}
            />
          </Field>
        ))
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
      forward_enabled: s.orders?.forward_enabled ?? true,
      forward_cod: s.orders?.forward_cod ?? false,
      default_country_code: s.orders?.default_country_code ?? "",
      shipping_method: s.orders?.shipping_method ?? "",
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
        ...(s.orders ? { orders: { forward_enabled: v.forward_enabled, forward_cod: v.forward_cod, default_country_code: v.default_country_code.toUpperCase(), shipping_method: v.shipping_method.trim() } } : {}),
      });
      toast.success("حُفظت إعدادات المزامنة");
    } catch (e) {
      if (isApiError(e) && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k.replace("intervals.", "").replace("orders.", "") as FieldPath<SettingsForm>, { message: m[0] });
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
    }
  });
  const rows: Array<{ toggle: "sync_products" | "sync_prices" | "sync_inventory"; interval: "products_minutes" | "prices_minutes" | "inventory_minutes"; label: string; hint: string }> = [
    { toggle: "sync_products", interval: "products_minutes", label: "مزامنة المنتجات", hint: "60 دقيقة على الأقل" },
    { toggle: "sync_prices", interval: "prices_minutes", label: "مزامنة الأسعار", hint: "إعادة تسعير دورية — 60 دقيقة على الأقل" },
    { toggle: "sync_inventory", interval: "inventory_minutes", label: "مزامنة المخزون", hint: "15 دقيقة على الأقل" },
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
      <ul className="divide-y divide-border/60 surface-card overflow-hidden">
        {rows.map((r) => (
          <li key={r.toggle} className="flex flex-wrap items-center gap-3 p-3">
            <Controller control={control} name={r.toggle} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={r.label} />} />
            <span className="flex min-w-32 flex-1 flex-col text-sm">
              {r.label}
              <span className="text-xs text-muted-foreground">{r.hint}</span>
            </span>
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
      {s.orders && code !== "flat_feed" ? (
        <fieldset className="flex flex-col gap-3 border-t border-border pt-4" data-testid="order-settings">
          <legend className="text-base font-medium">إحالة الطلبات</legend>
          {(
            [
              { name: "forward_enabled", label: "إرسال الطلبات للمورد آلياً" },
              { name: "forward_cod", label: "إرسال طلبات الدفع عند الاستلام آلياً (وإلا تنتظر مراجعتك)" },
            ] as const
          ).map((t) => (
            <Controller
              key={t.name}
              control={control}
              name={t.name}
              render={({ field }) => (
                <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
                  <span>{t.label}</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t.label} />
                </label>
              )}
            />
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="دولة الشحن الافتراضية (ISO)" htmlFor={`${id}-country`} error={err("default_country_code")} hint="مثل YE أو SA — حين لا يحدد العنوان دولة.">
              <input id={`${id}-country`} dir="ltr" maxLength={2} {...register("default_country_code")} className={cn(inputClass, "font-mono uppercase")} />
            </Field>
            <Field label="طريقة شحن المورد" htmlFor={`${id}-ship`} error={err("shipping_method")} hint="فارغ = الأرخص المتاح وقت الإرسال.">
              <input id={`${id}-ship`} dir="ltr" {...register("shipping_method")} className={inputClass} />
            </Field>
          </div>
        </fieldset>
      ) : null}
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
  const [rotated, setRotated] = useState<{ url: string; secret: string | null; baseMissing: boolean } | null>(null);
  return (
    <section className="flex max-w-2xl flex-col gap-3 border-t border-border pt-6" aria-labelledby="wh">
      <h2 id="wh" className="text-base font-medium">
        Webhook المورد
      </h2>
      <p className="text-sm text-muted-foreground">{configured ? "الرمز الحالي مخفي. التدوير يُبطل الرابط القديم فوراً." : "لا رابط بعد — دوّر الرمز لإنشائه."}</p>
      {rotated ? (
        <div className="flex flex-col gap-2 surface-card p-4" data-testid="webhook-url">
          <span className="text-xs text-muted-foreground">انسخه الآن — لن يُعرض مرة أخرى.</span>
          <CopyLine label="نسخ الرابط" value={rotated.url} done="نُسخ الرابط" />
          {rotated.secret ? (
            <>
              <span className="text-xs text-muted-foreground">سرّ التوقيع — يُلصق لدى المورد مع الرابط.</span>
              <CopyLine label="نسخ السر" value={rotated.secret} done="نُسخ السر" testId="webhook-secret" />
            </>
          ) : null}
          {rotated.baseMissing ? <span className="text-xs text-destructive">نطاق Webhooks العام غير مضبوط على الخادم — الرابط نسبي.</span> : null}
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
                  setRotated({ url: r.webhook_url, secret: r.webhook_secret ?? null, baseMissing: r.base_url_missing ?? false });
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

function CopyLine({ label, value, done, testId }: { label: string; value: string; done: string; testId?: string }) {
  return (
    <span className="flex items-center gap-2" data-testid={testId}>
      <Mono className="min-w-0 flex-1 break-all text-xs">{value}</Mono>
      <Button
        variant="outline"
        size="icon"
        className="size-11 lg:size-8"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success(done);
          } catch {
            toast.error("تعذّر النسخ");
          }
        }}
      >
        <Copy className="size-4" aria-hidden />
      </Button>
    </span>
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
