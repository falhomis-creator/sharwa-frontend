"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useWebhookEvents } from "@/features/integrations/api";
import { applyServerErrors, CopyButton, errorMessage, StatusText } from "@/features/integrations/components/shared";
import { webhookInputSchema, type WebhookEndpoint, type WebhookInput } from "@/features/integrations/schemas";

/** Shared webhook pieces: endpoint state text, the create/edit form, the one-time secret dialog. */

export function EndpointState({ e }: { e: Pick<WebhookEndpoint, "is_active" | "auto_disabled"> }) {
  if (e.auto_disabled) return <StatusText tone="destructive">معطّلة تلقائياً</StatusText>;
  return e.is_active ? <StatusText tone="success">مفعّلة</StatusText> : <StatusText tone="muted">موقوفة</StatusText>;
}

export function EndpointForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial?: WebhookEndpoint;
  submitLabel: string;
  pending: boolean;
  onSubmit: (json: WebhookInput) => Promise<unknown>;
}) {
  const events = useWebhookEvents();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<WebhookInput>({
    resolver: zodResolver(webhookInputSchema),
    defaultValues: { url: initial?.url ?? "", events: initial?.events ?? [], description: initial?.description ?? "", is_active: initial?.is_active ?? true },
  });
  const { errors } = form.formState;
  const submit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await onSubmit({ ...v, url: v.url.trim(), description: v.description.trim() });
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" data-testid="endpoint-form">
      <Field label="عنوان نقطة النهاية" htmlFor="url" required error={errors.url?.message} hint="https فقط. نرسل إليه طلب POST بحمولة JSON موقَّعة بالسرّ.">
        <input id="url" {...form.register("url")} dir="ltr" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://example.com/hooks/sharwa" className={`${inputClass} font-mono`} aria-invalid={!!errors.url} data-testid="endpoint-url" />
      </Field>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.events ? "events-error" : undefined}>
        <legend className="pb-1 text-sm font-medium">
          الأحداث<span aria-hidden className="ms-0.5 text-muted-foreground">*</span>
        </legend>
        {events.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : events.isError ? (
          <p className="text-sm text-destructive">
            تعذّر تحميل قائمة الأحداث.{" "}
            <button type="button" className="inline-flex min-h-11 items-center underline lg:min-h-0" onClick={() => void events.refetch()}>
              إعادة المحاولة
            </button>
          </p>
        ) : (
          <Controller
            control={form.control}
            name="events"
            render={({ field }) => (
              <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden" data-testid="event-options">
                {(events.data ?? []).map((ev) => {
                  const checked = field.value.includes(ev.code);
                  return (
                    <li key={ev.code}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 p-3">
                        <Checkbox
                          className="mt-0.5"
                          checked={checked}
                          onCheckedChange={(c) => field.onChange(c === true ? [...field.value, ev.code] : field.value.filter((x) => x !== ev.code))}
                          data-testid={`event-${ev.code}`}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                            {ev.name}
                            <Mono className="text-xs font-normal text-muted-foreground">{ev.code}</Mono>
                          </span>
                          <span className="text-xs text-muted-foreground">{ev.description}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          />
        )}
        {errors.events ? (
          <p role="alert" id="events-error" className="text-xs text-destructive">
            {errors.events.message}
          </p>
        ) : null}
      </fieldset>

      <Field label="الوصف" htmlFor="description" error={errors.description?.message} hint="اختياري — لتتذكر الغرض منها.">
        <input id="description" {...form.register("description")} className={inputClass} autoComplete="off" />
      </Field>

      <Controller control={form.control} name="is_active" render={({ field }) => <ToggleRow id="is_active" label="مفعّلة" description="عند الإيقاف لا نرسل إليها أي حدث." checked={field.value} onCheckedChange={field.onChange} />} />

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div>
        <Button type="submit" className="h-11 lg:h-9" disabled={pending} data-testid="endpoint-submit">
          {pending ? "جارٍ الحفظ…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * The secret, shown ONCE (US-19.3.2, FR-19.04). It lives only in the caller's state while this
 * dialog is open; closing it drops it — there is no way to read it again.
 */
export function SecretDialog({ secret, onClose, rotated }: { secret: string | null; onClose: () => void; rotated?: boolean }) {
  return (
    <Dialog open={secret !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} data-testid="secret-dialog">
        <DialogTitle>{rotated ? "السرّ الجديد" : "سرّ التوقيع"}</DialogTitle>
        <DialogDescription>انسخه الآن واحفظه في نظامك — لن يُعرض مجدداً. نستخدمه لتوقيع كل طلب في الترويسة <Mono>X-Sharwa-Signature</Mono>.</DialogDescription>
        {secret ? (
          <div className="flex items-center gap-2 surface-card p-2">
            <Mono className="min-w-0 flex-1 break-all text-sm" data-testid="secret-value">
              {secret}
            </Mono>
            <CopyButton value={secret} label="السرّ" testId="copy-secret" />
          </div>
        ) : null}
        <p className="text-sm font-medium text-warning">لن يُعرض مجدداً.</p>
        <DialogFooter>
          <Button
            className="h-11 lg:h-9"
            onClick={() => {
              onClose();
              toast("أُغلق السرّ — استخدم «تدوير السرّ» إن فقدته");
            }}
            data-testid="secret-done"
          >
            نسخته، أغلق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
