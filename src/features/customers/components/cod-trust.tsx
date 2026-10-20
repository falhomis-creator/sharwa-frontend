"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useSetCod } from "@/features/customers/api";
import { COD_CONFIRM_WORD, codFormSchema, type CodForm, type CustomerDetail } from "@/features/customers/schemas";

/**
 * COD trust (FR-07.03): the platform's `CentralCustomerTrust` and this store's
 * `CustomerReliabilityRecord` are ALWAYS two separate readings — never merged into one
 * number (SC-07.2). The percentage is Mono + a word in a semantic TEXT colour only
 * (constitution I: no gauge, no coloured bar).
 */
export function trustOf(riskPercentage: number | null): { percent: number; word: string; tone: string } | null {
  if (riskPercentage === null) return null;
  const percent = Math.max(0, Math.min(100, Math.round(100 - riskPercentage)));
  if (percent > 80) return { percent, word: "ثقة عالية", tone: "text-success" };
  if (percent >= 50) return { percent, word: "ثقة متوسطة", tone: "text-warning" };
  return { percent, word: "ثقة منخفضة", tone: "text-destructive" };
}

export function TrustText({ riskPercentage, className }: { riskPercentage: number | null; className?: string }) {
  const t = trustOf(riskPercentage);
  if (!t) return <span className={cn("whitespace-nowrap text-xs text-muted-foreground", className)}>لا بيانات ثقة بعد</span>;
  return (
    <span className={cn("whitespace-nowrap text-sm", t.tone, className)} data-testid="trust-text" data-percent={t.percent}>
      <Mono>{t.percent}%</Mono> — {t.word}
    </span>
  );
}

export function CodTrustBlock({ customer }: { customer: CustomerDetail }) {
  const { canPermission } = useAccess();
  const canEdit = canPermission("customers.edit_profile");
  const [open, setOpen] = useState(false);
  const platform = customer.trust.platform;
  const local = customer.trust.store;
  const t = trustOf(platform ? platform.risk_percentage : null);
  const blocked = canEdit ? null : "تحتاج صلاحية تعديل ملف العميل";

  return (
    <section aria-labelledby="cod-trust-title" className="flex flex-col gap-3" data-testid="cod-trust">
      <h3 id="cod-trust-title" className="text-sm font-medium">
        ثقة الدفع عند الاستلام
      </h3>
      <dl className="grid gap-px overflow-hidden surface-card bg-border sm:grid-cols-2">
        <div className="flex flex-col gap-1 bg-card p-3" data-testid="trust-platform">
          <dt className="text-xs text-muted-foreground">عبر المنصة</dt>
          <dd className="flex flex-col gap-0.5">
            {platform && t ? (
              <>
                <span className={cn("text-base", t.tone)}>
                  <Mono className="font-medium">{t.percent}%</Mono> — {t.word}
                </span>
                <span className="text-xs text-muted-foreground">
                  <Mono className="text-foreground">{platform.successful_cod_orders}</Mono> ناجح / <Mono className="text-foreground">{platform.failed_cod_orders}</Mono> فاشل في كل متاجر شروة
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">لا بيانات ثقة بعد — لم يطلب بالدفع عند الاستلام عبر المنصة.</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-card p-3" data-testid="trust-store">
          <dt className="text-xs text-muted-foreground">في متجرك</dt>
          <dd className="flex flex-col gap-0.5">
            <span className="text-base">
              <Mono className={cn("font-medium", local.cod_refusals_count > 0 && "text-warning")}>{local.cod_refusals_count}</Mono> رفض استلام
            </span>
            <span className={cn("text-xs", local.cod_disabled ? "text-destructive" : "text-muted-foreground")} data-testid="cod-state" data-disabled={local.cod_disabled}>
              {local.cod_disabled ? "الدفع عند الاستلام موقوف لهذا العميل" : "الدفع عند الاستلام متاح"}
            </span>
          </dd>
        </div>
      </dl>
      {local.cod_disabled ? (
        <div className="flex flex-col gap-2 surface-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between" data-testid="cod-disabled-banner">
          <p className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 font-medium text-destructive">
              <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
              الدفع عند الاستلام موقوف لهذا العميل
            </span>
            {local.reason ? <span className="text-xs text-muted-foreground">السبب: {local.reason}</span> : null}
            {local.updated_at ? (
              <span className="text-xs text-muted-foreground">
                {local.updated_by ?? "—"} · <time dateTime={local.updated_at}>{formatDateTime(local.updated_at)}</time>
              </span>
            ) : null}
          </p>
          <Button variant="outline" className="h-11 shrink-0 lg:h-8" disabled={Boolean(blocked)} title={blocked ?? undefined} onClick={() => setOpen(true)} data-testid="cod-enable">
            إعادة التفعيل
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button variant="ghost" className="h-11 text-muted-foreground lg:h-8" disabled={Boolean(blocked)} title={blocked ?? undefined} onClick={() => setOpen(true)} data-testid="cod-disable">
            إيقاف الدفع عند الاستلام لهذا العميل
          </Button>
        </div>
      )}
      {open ? <CodDialog phone={customer.phone} name={customer.name} disable={!local.cod_disabled} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}

function CodDialog({ phone, name, disable, onClose }: { phone: string; name: string; disable: boolean; onClose: () => void }) {
  const mutation = useSetCod(phone);
  const form = useForm<CodForm>({ resolver: zodResolver(codFormSchema), defaultValues: { reason: "", confirm: "" }, shouldFocusError: true });
  const confirm = useWatch({ control: form.control, name: "confirm" }) ?? "";
  const confirmed = disable || confirm.trim() === COD_CONFIRM_WORD;

  async function submit(values: CodForm) {
    if (!confirmed) {
      form.setError("confirm", { message: `اكتب «${COD_CONFIRM_WORD}» للتأكيد.` }, { shouldFocus: true });
      return;
    }
    try {
      await mutation.mutateAsync({ cod_disabled: disable, reason: values.reason });
      toast.success(disable ? `أُوقف الدفع عند الاستلام لـ ${name}` : `أُعيد تفعيل الدفع عند الاستلام لـ ${name}`);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields?.reason?.[0]) form.setError("reason", { message: err.fields.reason[0] }, { shouldFocus: true });
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر الاتصال");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="cod-dialog">
        <DialogHeader>
          <DialogTitle>{disable ? "إيقاف الدفع عند الاستلام" : "إعادة تفعيل الدفع عند الاستلام"}</DialogTitle>
          <DialogDescription>
            {disable
              ? `لن يظهر خيار الدفع عند الاستلام لـ ${name} في متجرك. يُسجَّل الإجراء في سجل التدقيق.`
              : `سيعود خيار الدفع عند الاستلام لـ ${name}. يُسجَّل الإجراء وسببه في سجل التدقيق.`}
          </DialogDescription>
        </DialogHeader>
        <form id="cod-form" onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3" noValidate>
          <Field label="السبب" htmlFor="cod-reason" error={form.formState.errors.reason?.message} required>
            <input id="cod-reason" className={inputClass} aria-invalid={Boolean(form.formState.errors.reason)} {...form.register("reason")} data-testid="cod-reason" />
          </Field>
          {!disable ? (
            <Field label={<>اكتب «{COD_CONFIRM_WORD}» للتأكيد</>} htmlFor="cod-confirm" error={form.formState.errors.confirm?.message}>
              <input id="cod-confirm" className={inputClass} autoComplete="off" aria-invalid={Boolean(form.formState.errors.confirm)} {...form.register("confirm")} data-testid="cod-confirm" />
            </Field>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="outline" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="cod-form" variant={disable ? "destructive" : "default"} className="h-11 lg:h-9" disabled={mutation.isPending || !confirmed} data-testid="cod-submit">
            {mutation.isPending ? "جارٍ الحفظ…" : disable ? "إيقاف" : "إعادة التفعيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
