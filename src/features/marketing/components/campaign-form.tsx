"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useCampaign, useCampaignPreview, useChannelStatuses, useSaveCampaign, useSendCampaign } from "@/features/marketing/api";
import { audienceText, CampaignStatusText } from "@/features/marketing/components/campaigns-screen";
import { applyServerErrors, BackToHub, ConfirmDialog, errorMessage, FormActions, FormSkeleton, OwnerGate, ProductPicker, toLocalInput } from "@/features/marketing/components/shared";
import { AUDIENCE_LABELS, AUDIENCES, campaignInputSchema, CHANNEL_LABELS, CHANNELS, type Audience, type Campaign, type CampaignInput } from "@/features/marketing/schemas";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * US-13.4.1 — campaign create/edit. Six channels as radios (unconnected ones disabled with a
 * link «اربط القناة»), four audiences, preview Sheet (`GET …/preview`), send now or schedule
 * (`POST …/send {schedule_at?}`). A sent campaign is read-only; a scheduled one can be cancelled.
 */
export function CampaignFormScreen({ id }: { id: number | null }) {
  return (
    <AccessGate feature="campaigns">
      <OwnerGate description="الحملات مقصورة على مالك المتجر.">
        {id === null ? <NewFromUrl /> : <EditLoader id={id} />}
      </OwnerGate>
    </AccessGate>
  );
}

/** `/new?segment=&product_id=` — M07 deep-links a customer segment or a product here. */
function NewFromUrl() {
  const [q] = useQueryStates({ segment: parseAsString, product_id: parseAsString });
  const productId = q.product_id && /^\d+$/.test(q.product_id) ? q.product_id : undefined;
  return <CampaignForm key={`${q.segment ?? ""}:${productId ?? ""}`} campaign={null} initial={{ segment: q.segment ?? undefined, product_id: productId }} />;
}

function EditLoader({ id }: { id: number }) {
  const q = useCampaign(id);
  if (q.isLoading) return <div className="flex flex-col gap-5"><BackToHub href="/dashboard/marketing/campaigns" label="الحملات" /><FormSkeleton /></div>;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <CampaignForm campaign={q.data} />;
}

function toInput(c: Campaign | null, initial?: { segment?: string; product_id?: string }): CampaignInput {
  const seg = initial?.segment && (AUDIENCES as readonly string[]).includes(initial.segment) ? (initial.segment as Audience) : undefined;
  return {
    name: c?.name ?? "",
    channel: c?.channel ?? "whatsapp",
    audience_type: c?.audience_type ?? seg ?? (initial?.product_id ? "bought_product" : "all"),
    product_id: c?.product ? String(c.product.id) : (initial?.product_id ?? ""),
    message: c?.message ?? "",
  };
}

function CampaignForm({ campaign, initial }: { campaign: Campaign | null; initial?: { segment?: string; product_id?: string } }) {
  const router = useRouter();
  const channels = useChannelStatuses();
  const save = useSaveCampaign(campaign?.id ?? null);
  const send = useSendCampaign(campaign?.id ?? 0);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState<"now" | "schedule" | "cancel" | null>(null);
  const [scheduleAt, setScheduleAt] = useState(() => toLocalInput(campaign?.scheduled_at ?? new Date(Date.now() + 3_600_000).toISOString()));
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const readOnly = campaign?.status === "sent";
  const form = useForm<CampaignInput>({ resolver: zodResolver(campaignInputSchema), defaultValues: toInput(campaign, initial), disabled: readOnly || undefined });
  const { register, control, formState: { errors, isDirty } } = form;
  const audience = useWatch({ control, name: "audience_type" });
  const channel = useWatch({ control, name: "channel" });
  const message = useWatch({ control, name: "message" });
  const connected = (ch: string) => channels.data?.find((c) => c.channel === ch)?.connected ?? ch === "whatsapp";

  const persist = async (v: CampaignInput) => {
    const saved = await save.mutateAsync({ name: v.name, channel: v.channel, audience_type: v.audience_type, product_id: v.audience_type === "bought_product" ? Number(v.product_id) : null, message: v.message });
    return saved;
  };
  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const saved = await persist(v);
      toast.success(campaign ? "حُفظت الحملة" : "أُنشئت الحملة كمسودة");
      if (!campaign) router.replace(`/dashboard/marketing/campaigns/${saved.id}`);
      else form.reset(toInput(saved));
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  const doSend = (schedule_at?: string) => {
    setScheduleError(null);
    send.mutate(schedule_at ? { schedule_at } : {}, {
      onSuccess: (c) => { setSendOpen(null); toast.success(c.status === "sent" ? `أُرسلت إلى ${formatNumber(c.recipients.sent)} مستلم` : `جُدولت للإرسال ${formatDateTime(c.scheduled_at!)}`); form.reset(toInput(c)); },
      onError: (e) => { if (schedule_at) setScheduleError(errorMessage(e)); else toast.error(errorMessage(e)); },
    });
  };
  const cancelSchedule = () => save.mutate({ status: "draft" }, { onSuccess: () => { setSendOpen(null); toast.success("أُلغيت الجدولة — عادت الحملة مسودة"); }, onError: (e) => toast.error(errorMessage(e)) });

  return (
    <div className="flex flex-col gap-5" data-testid="campaign-form">
      <BackToHub href="/dashboard/marketing/campaigns" label="الحملات" />
      <PageHeader title={campaign ? campaign.name : "حملة جديدة"} eyebrow={campaign ? `#${campaign.id}` : undefined} description={campaign ? undefined : "تُحفظ كمسودة أولاً، ثم تُراجَع وتُرسل."} actions={campaign ? <CampaignStatusText status={campaign.status} /> : null} />
      {campaign && campaign.status !== "draft" ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-border pb-4 text-sm md:grid-cols-4" data-testid="campaign-stats">
          {campaign.status === "scheduled" ? <div><dt className="text-xs text-muted-foreground">موعد الإرسال</dt><dd>{formatDateTime(campaign.scheduled_at!)}</dd></div> : <div><dt className="text-xs text-muted-foreground">أُرسلت</dt><dd>{formatDateTime(campaign.sent_at!)}</dd></div>}
          <div><dt className="text-xs text-muted-foreground">{campaign.status === "scheduled" ? "بانتظار الإرسال" : "وصلت"}</dt><dd><Mono>{formatNumber(campaign.status === "scheduled" ? campaign.recipients.pending : campaign.recipients.sent)}</Mono></dd></div>
          {campaign.recipients.failed ? <div><dt className="text-xs text-muted-foreground">فشلت</dt><dd><Mono className="text-destructive">{formatNumber(campaign.recipients.failed)}</Mono></dd></div> : null}
        </dl>
      ) : null}
      {readOnly ? <p className="text-sm text-muted-foreground">الحملة المرسلة للقراءة فقط.</p> : null}

      <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-5">
        <Field label="اسم الحملة" htmlFor="name" error={errors.name?.message} required hint="للاستخدام الداخلي — لا يراه العميل.">
          <input id="name" {...register("name")} className={inputClass} aria-invalid={!!errors.name} data-testid="name" />
        </Field>

        <fieldset className="flex flex-col gap-1" data-testid="channels">
          <legend className="pb-1.5 text-sm font-medium">القناة</legend>
          {errors.channel ? <p role="alert" className="text-xs text-destructive">{errors.channel.message}</p> : null}
          <div className="grid gap-1 rounded-lg border border-border p-1 sm:grid-cols-2">
            {CHANNELS.map((ch) => {
              const on = connected(ch);
              const href = channels.data?.find((c) => c.channel === ch)?.manage_href ?? null;
              return (
                <label key={ch} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted lg:min-h-9", !on && "cursor-not-allowed text-muted-foreground", channel === ch && "bg-muted")} data-channel={ch} data-connected={on}>
                  <input type="radio" value={ch} {...register("channel")} disabled={readOnly || !on} className="size-4 accent-foreground" />
                  <span className="flex-1">{CHANNEL_LABELS[ch]}</span>
                  {!on ? (href ? <Link href={href} className="inline-flex min-h-11 items-center text-xs underline-offset-4 hover:underline lg:min-h-0" onClick={(e) => e.stopPropagation()}>اربط القناة</Link> : <span className="text-xs">اربط القناة</span>) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1" data-testid="audience">
          <legend className="pb-1.5 text-sm font-medium">الجمهور</legend>
          <div className="grid gap-1 rounded-lg border border-border p-1 sm:grid-cols-2">
            {AUDIENCES.map((a) => (
              <label key={a} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted lg:min-h-9", audience === a && "bg-muted")}>
                <input type="radio" value={a} {...register("audience_type")} disabled={readOnly} className="size-4 accent-foreground" data-testid={`audience-${a}`} />
                <span>{AUDIENCE_LABELS[a]}</span>
              </label>
            ))}
          </div>
          {audience === "dormant" ? <p className="text-xs text-muted-foreground">لم يطلبوا منذ 90 يوماً.</p> : null}
        </fieldset>
        {audience === "bought_product" ? <Controller control={control} name="product_id" render={({ field }) => <ProductPicker id="product_id" label="المنتج المشترى" value={field.value ?? ""} onChange={field.onChange} error={errors.product_id?.message} required />} /> : null}

        <Field label="نص الرسالة" htmlFor="message" error={errors.message?.message} required counter={{ value: message.length, max: 1000 }} hint={<span>المتغير <Mono className="text-[11px]">{"{customer_name}"}</Mono> يُستبدل باسم العميل.</span>}>
          <Textarea id="message" {...register("message")} rows={5} aria-invalid={!!errors.message} data-testid="message" />
        </Field>

        {!readOnly ? (
          <FormActions
            pending={save.isPending}
            saveLabel={campaign ? "حفظ" : "حفظ كمسودة"}
            cancelHref="/dashboard/marketing/campaigns"
            error={formError}
            extra={
              campaign ? (
                <span className="ms-auto flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => setPreviewOpen(true)} disabled={isDirty} title={isDirty ? "احفظ التعديلات أولاً" : undefined} data-testid="preview">معاينة</Button>
                  {campaign.status === "draft" ? (
                    <>
                      <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => setSendOpen("schedule")} disabled={isDirty || !connected(campaign.channel)} data-testid="schedule">جدولة</Button>
                      <Button type="button" className="h-11 lg:h-9" onClick={() => setSendOpen("now")} disabled={isDirty || !connected(campaign.channel)} data-testid="send-now">إرسال الآن</Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => setSendOpen("cancel")} data-testid="cancel-schedule">إلغاء الجدولة</Button>
                  )}
                </span>
              ) : null
            }
          />
        ) : null}
      </form>
      {campaign && !connected(campaign.channel) && campaign.status === "draft" ? <p className="text-xs text-muted-foreground">القناة «{CHANNEL_LABELS[campaign.channel]}» غير مربوطة — الإرسال متوقف حتى ربطها.</p> : null}

      {campaign ? <PreviewSheet id={campaign.id} open={previewOpen} onOpenChange={setPreviewOpen} campaign={campaign} /> : null}
      {campaign ? (
        <>
          <ConfirmDialog open={sendOpen === "now"} onOpenChange={(o) => !o && setSendOpen(null)} title="إرسال الحملة الآن؟" description={`عبر ${CHANNEL_LABELS[campaign.channel]} إلى ${audienceText(campaign)}. لا يمكن التراجع بعد الإرسال.`} confirmLabel="إرسال" pending={send.isPending} onConfirm={() => doSend()} testId="send-dialog" />
          <ConfirmDialog open={sendOpen === "schedule"} onOpenChange={(o) => !o && setSendOpen(null)} title="جدولة الإرسال" description="تُرسل تلقائياً في الوقت المحدد؛ يمكن إلغاؤها قبل ذلك." confirmLabel="جدولة" pending={send.isPending} onConfirm={() => doSend(new Date(scheduleAt).toISOString())} testId="schedule-dialog">
            <Field label="وقت الإرسال" htmlFor="schedule_at" error={scheduleError ?? undefined} required>
              <input id="schedule_at" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={inputClass} dir="ltr" data-testid="schedule_at" />
            </Field>
          </ConfirmDialog>
          <ConfirmDialog open={sendOpen === "cancel"} onOpenChange={(o) => !o && setSendOpen(null)} title="إلغاء الجدولة؟" description="تعود الحملة مسودة ولا يُرسل شيء." confirmLabel="إلغاء الجدولة" destructive pending={save.isPending} onConfirm={cancelSchedule} testId="cancel-dialog" />
        </>
      ) : null}
    </div>
  );
}

function PreviewSheet({ id, open, onOpenChange, campaign }: { id: number; open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign }) {
  const preview = useCampaignPreview(id, open);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-md" data-testid="preview-sheet">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle>معاينة الحملة</SheetTitle>
          <SheetDescription>{CHANNEL_LABELS[campaign.channel]} · {audienceText(campaign)}</SheetDescription>
        </SheetHeader>
        {preview.isLoading ? <div className="flex flex-col gap-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-24 w-full" /></div> : null}
        {preview.isError ? <ErrorState error={preview.error} onRetry={() => void preview.refetch()} /> : null}
        {preview.data ? (
          <div className="flex flex-col gap-4 text-sm">
            <p>
              <span className="text-muted-foreground">عدد المستلمين: </span>
              <Mono className="font-medium" data-testid="recipients-count">{formatNumber(preview.data.recipients_count)}</Mono>
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">كما تصل العميل</span>
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 leading-7" data-testid="rendered-message">{preview.data.rendered_message}</p>
            </div>
            {preview.data.recipients_count === 0 ? <p className="text-xs text-warning">لا يوجد مستلمون في هذا الجمهور حالياً.</p> : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
