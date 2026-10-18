"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useGateways, useSaveCredentials, useSetGatewayEnabled } from "@/features/payments/api";
import { GATEWAY_STATE_LABELS, gatewayState, type Gateway, type GatewayField, type GatewayState } from "@/features/payments/schemas";
import { BackLink, PaymentsGate, StatusText } from "@/features/payments/components/shared";

/**
 * The credential form (M14 US-14.1, FR-14.01/02/08): built ONLY from the server's field
 * descriptors. Secrets are write-only `type=password` inputs with `autocomplete="off"`, a
 * show-while-typing toggle, and the server's short mask as the hint; an empty secret keeps
 * the stored value. The same component renders in the overview's sheet and on
 * `/dashboard/payments/gateways/[code]` (the phone's full page).
 */
export const STATE_TONE: Record<GatewayState, { dot: string; text: string }> = {
  unlinked: { dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
  linked_disabled: { dot: "bg-warning", text: "text-warning" },
  linked_enabled: { dot: "bg-success", text: "text-success" },
};

export function GatewayStatus({ gateway }: { gateway: Gateway }) {
  const s = gatewayState(gateway);
  return <StatusText label={GATEWAY_STATE_LABELS[s]} dot={STATE_TONE[s].dot} text={STATE_TONE[s].text} testId={`gateway-state-${gateway.gateway_code}`} />;
}

/** `is_enabled` — disabled until credentials exist; turning off asks first; saved at once with a 5 s undo (FR-14.05). */
export function GatewayToggle({ gateway, label = true }: { gateway: Gateway; label?: boolean }) {
  const mutation = useSetGatewayEnabled();
  const [confirming, setConfirming] = useState(false);
  const id = `gw-enabled-${gateway.gateway_code}`;

  function apply(next: boolean, undoable = true) {
    mutation.mutate(
      { code: gateway.gateway_code, is_enabled: next },
      {
        onSuccess: () => {
          if (!undoable) return;
          toast.success(next ? `فُعّلت «${gateway.name}» في صفحة الدفع` : `عُطّلت «${gateway.name}»`, {
            duration: 5000,
            action: { label: "تراجع", onClick: () => apply(!next, false) },
          });
        },
        onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ."),
      },
    );
  }

  return (
    <>
      <span className="flex min-h-11 items-center gap-2 lg:min-h-8">
        {label ? (
          <label htmlFor={id} className="text-xs text-muted-foreground">
            مفعّلة
          </label>
        ) : null}
        <Switch
          id={id}
          checked={gateway.is_enabled}
          disabled={!gateway.has_credentials || mutation.isPending}
          title={!gateway.has_credentials ? "أدخل بيانات الاعتماد واحفظها أولاً" : undefined}
          aria-label={`تفعيل ${gateway.name}`}
          onCheckedChange={(next) => (next ? apply(true) : setConfirming(true))}
          data-testid={`gateway-toggle-${gateway.gateway_code}`}
        />
      </span>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-sm" data-testid="gateway-disable-confirm">
          <DialogTitle>تعطيل «{gateway.name}»؟</DialogTitle>
          <DialogDescription>ستختفي البوابة من صفحة الدفع فوراً. تبقى بيانات الاعتماد محفوظة ويمكنك إعادة التفعيل في أي وقت.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setConfirming(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              onClick={() => {
                setConfirming(false);
                apply(false);
              }}
              data-testid="gateway-disable-ok"
            >
              تعطيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GatewayFormView({ code, variant, onDone }: { code: string; variant: "sheet" | "page"; onDone?: () => void }) {
  const query = useGateways();
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const gateway = query.data.find((g) => g.gateway_code === code);
  if (!gateway) return <EmptyState title="البوابة غير موجودة" description="لم يُعِد الخادم بوابة بهذا الرمز. ارجع إلى قائمة البوابات." />;
  // Remount on save so the secret inputs empty and the masks refresh from the server.
  return <GatewayForm key={`${gateway.gateway_code}:${gateway.updated_at ?? ""}`} gateway={gateway} variant={variant} onDone={onDone} />;
}

function GatewayForm({ gateway, variant, onDone }: { gateway: Gateway; variant: "sheet" | "page"; onDone?: () => void }) {
  const save = useSaveCredentials(gateway.gateway_code);
  const defaults = Object.fromEntries(gateway.fields.map((f) => [f.name, f.is_secret ? "" : (f.value ?? "")]));
  const form = useForm<Record<string, string>>({ defaultValues: defaults, shouldFocusError: true });
  const [failed, setFailed] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setFailed(null);
    let firstMissing: string | null = null;
    for (const f of gateway.fields) {
      const stored = f.is_secret ? Boolean(f.masked_hint) : Boolean(f.value);
      if (f.required && !values[f.name]?.trim() && !stored) {
        form.setError(f.name, { message: "هذا الحقل مطلوب." });
        firstMissing ??= f.name;
      }
    }
    if (firstMissing) {
      form.setFocus(firstMissing);
      return;
    }
    // Every descriptor is sent; an empty value means «keep what is stored» (§7).
    const payload = Object.fromEntries(gateway.fields.map((f) => [f.name, values[f.name]?.trim() ?? ""]));
    try {
      await save.mutateAsync(payload);
      toast.success(gateway.is_enabled ? "حُفظت بيانات الاعتماد" : "حُفظت بيانات الاعتماد — فعّل البوابة لتظهر في صفحة الدفع");
      onDone?.();
    } catch (e) {
      if (isApiError(e) && e.fields) {
        let first: string | null = null;
        for (const [k, msg] of Object.entries(e.fields)) {
          form.setError(k, { message: msg[0] });
          first ??= k;
        }
        if (first) form.setFocus(first);
      } else {
        // Nothing is assumed saved; the typed secrets stay in memory for the retry (§8).
        setFailed(isApiError(e) ? e.userMessage : "تعذّر الحفظ — تحقق من الاتصال وأعد المحاولة.");
      }
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-5" data-testid="gateway-form" data-gateway={gateway.gateway_code} autoComplete="off">
      {variant === "page" ? <BackLink href="/dashboard/payments">المدفوعات</BackLink> : null}
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className={cn("flex flex-wrap items-center justify-between gap-3", variant === "sheet" && "pe-10")}>
          <h2 className="text-xl font-semibold">{gateway.name}</h2>
          <GatewayToggle gateway={gateway} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <GatewayStatus gateway={gateway} />
          {gateway.updated_at ? (
            <>
              <span aria-hidden>·</span>
              <span>
                آخر تحديث <time dateTime={gateway.updated_at}>{formatDateTime(gateway.updated_at)}</time>
              </span>
            </>
          ) : null}
        </div>
        {gateway.description ? <p className="text-sm text-muted-foreground">{gateway.description}</p> : null}
      </header>

      {gateway.has_credentials ? (
        <p className="text-sm text-muted-foreground">القيم السرّية لا تُعرض أبداً. اترك الحقل فارغاً للإبقاء على قيمته، أو اكتب قيمة جديدة لاستبدالها.</p>
      ) : (
        <p className="text-sm text-muted-foreground">أدخل البيانات كما أرسلتها لك {gateway.name} في لوحة التاجر الخاصة بها. تُحفظ مشفّرة ولا تُعرض بعد الحفظ.</p>
      )}

      <div className="flex flex-col gap-4">
        {gateway.fields.map((f) => (
          <CredentialInput key={f.name} field={f} form={form} hasCredentials={gateway.has_credentials} />
        ))}
      </div>

      {failed ? (
        <p role="alert" className="rounded-lg border border-border p-3 text-sm text-destructive" data-testid="gateway-save-failed">
          {failed}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="gateway-save">
          {save.isPending ? "يُحفظ…" : failed ? "إعادة المحاولة" : "حفظ بيانات الاعتماد"}
        </Button>
      </div>
    </form>
  );
}

function CredentialInput({ field, form, hasCredentials }: { field: GatewayField; form: ReturnType<typeof useForm<Record<string, string>>>; hasCredentials: boolean }) {
  const [shown, setShown] = useState(false);
  const id = `cred-${field.name}`;
  const error = form.formState.errors[field.name]?.message;
  const typed = useWatch({ control: form.control, name: field.name }) ?? "";
  const reg = form.register(field.name, { onChange: () => form.clearErrors(field.name) });
  if (!field.is_secret) {
    return (
      <Field label={field.label} htmlFor={id} required={field.required} error={error}>
        <input id={id} dir="ltr" autoComplete="off" spellCheck={false} {...reg} className={cn(inputClass, "font-mono")} aria-invalid={Boolean(error)} data-testid={`cred-${field.name}`} />
      </Field>
    );
  }
  const stored = Boolean(field.masked_hint);
  return (
    <Field
      label={field.label}
      htmlFor={id}
      required={field.required && !stored}
      error={error}
      hint={
        stored ? (
          <span data-testid={`cred-hint-${field.name}`}>
            القيمة المحفوظة <span dir="ltr" className="font-mono">{field.masked_hint}</span>
          </span>
        ) : field.required ? (
          "سرّي — لا يُعرض بعد الحفظ."
        ) : (
          "اختياري — سرّي."
        )
      }
    >
      <div className="relative">
        <input
          id={id}
          type={shown && typed ? "text" : "password"}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          placeholder={stored || hasCredentials ? "اتركه فارغاً للإبقاء على القيمة الحالية" : undefined}
          {...reg}
          onBlur={(e) => {
            setShown(false);
            void reg.onBlur(e);
          }}
          className={cn(inputClass, "pe-12 font-mono placeholder:font-sans")}
          aria-invalid={Boolean(error)}
          data-testid={`cred-${field.name}`}
          data-secret
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShown((v) => !v)}
          disabled={!typed}
          aria-label={shown ? "إخفاء ما كتبته" : "إظهار ما كتبته"}
          aria-pressed={shown}
          title={!typed ? "يظهر ما تكتبه فقط، لا القيمة المحفوظة" : undefined}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
          data-testid={`cred-reveal-${field.name}`}
        >
          {shown && typed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

/** `/dashboard/payments/gateways/[code]` — the full-page form (phones; direct links). */
export function GatewayPageScreen({ code }: { code: string }) {
  return (
    <PaymentsGate anyOf={["payment_gateways"]}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <GatewayFormView code={code} variant="page" />
      </div>
    </PaymentsGate>
  );
}
