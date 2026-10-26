"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useApp, useAppAction, useAppCharges, useAppEvents, useApps } from "@/features/apps/api";
import { APP_EVENT_LABELS, APP_PANELS, CHARGE_STATUS_LABELS, INTERVAL_LABELS, type AppDetail, type Installation, type StoreApp } from "@/features/apps/schemas";
import { Notice, StatusDot, type Tone } from "@/features/inbox/components/bits";
import { ConfirmDialog } from "@/features/inbox/components/confirm-dialog";

const DAY = 86_400_000;

export function installationState(i: Installation | null, nowMs: number = new Date().getTime()): { tone: Tone; label: string; value: string } {
  if (!i) return { tone: "muted", label: "غير مثبَّت", value: "not_installed" };
  if (i.suspended_by_platform) return { tone: "destructive", label: "معلَّق من المنصة", value: "suspended" };
  if (i.subscription_expires_at && Date.parse(i.subscription_expires_at) < nowMs) return { tone: "warning", label: "الاشتراك منتهٍ", value: "expired" };
  return i.is_active ? { tone: "success", label: "مفعّل", value: "active" } : { tone: "muted", label: "معطّل", value: "inactive" };
}

function priceText(a: Pick<StoreApp, "is_free" | "display_price" | "billing_interval">) {
  return a.is_free || !a.display_price ? (
    <span className="text-sm">مجاني</span>
  ) : (
    <span className="text-sm">
      <Money value={a.display_price} /> <span className="text-muted-foreground">{INTERVAL_LABELS[a.billing_interval]}</span>
    </span>
  );
}

/**
 * `/dashboard/apps` (M30 US-30.1, FR-30.02): listed apps as rows whose height follows their
 * content — no grid of equal cards, no ratings, no «الأكثر شيوعاً».
 */
export function AppsCatalogScreen() {
  return (
    <AccessGate feature="app_marketplace">
      <CatalogInner />
    </AccessGate>
  );
}

function CatalogInner() {
  const q = useApps();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="متجر التطبيقات" description="تطبيقات تضيف قنوات وأتمتة لمتجرك. الرسوم تُضاف إلى مستحقات المنصة." />
      {q.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={cn("w-full", i % 2 ? "h-16" : "h-24")} />
          ))}
        </div>
      ) : !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="لا تطبيقات مدرجة حالياً" />
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border" data-testid="apps-catalog">
          {q.data.map((a) => {
            const s = installationState(a.installation);
            const panel = APP_PANELS[a.code];
            return (
              <li key={a.code} className="flex flex-col gap-2 py-4 md:flex-row md:items-start md:gap-8" data-testid="app-row" data-code={a.code}>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <Link href={`/dashboard/apps/${a.code}`} className="text-base font-medium hover:underline">
                      {a.name}
                    </Link>
                    {a.is_listed === false ? (
                      <span className="text-xs text-muted-foreground" data-testid="app-delisted">
                        لم يعد متاحاً للتثبيت
                      </span>
                    ) : null}
                  </span>
                  <p className="max-w-prose text-sm text-muted-foreground">{a.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:w-[26rem] md:shrink-0 md:justify-end">
                  {priceText(a)}
                  <StatusDot tone={s.tone} label={s.label} testId="app-state" value={s.value} />
                  {a.installation && panel && s.value === "active" ? (
                    <Link href={panel} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-8")}>
                      افتح
                    </Link>
                  ) : (
                    <Link href={`/dashboard/apps/${a.code}`} className={cn(buttonVariants({ variant: a.installation ? "ghost" : "outline" }), "h-11 lg:h-8")} data-testid="app-open">
                      {a.installation ? "التفاصيل" : "تثبيت"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** `/dashboard/apps/[code]` (US-30.1 – 30.4): description, price, the three states, events, fees. */
export function AppPageScreen({ code }: { code: string }) {
  return (
    <AccessGate feature="app_marketplace">
      <AppInner code={code} />
    </AccessGate>
  );
}

function AppInner({ code }: { code: string }) {
  const q = useApp(code);
  if (q.isLoading) return <Skeleton className="h-72" />;
  if (!q.data) {
    if (isApiError(q.error) && q.error.status === 404) return <EmptyState title="التطبيق غير موجود" description="ربما أُزيل من الكتالوج." action={<Link href="/dashboard/apps" className="underline">متجر التطبيقات</Link>} />;
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <AppDetailView app={q.data} />;
}

function AppDetailView({ app }: { app: AppDetail }) {
  const { session } = useAccess();
  const owner = session.kind === "merchant";
  const action = useAppAction(app.code);
  const events = useAppEvents(app.code, Boolean(app.installation));
  const charges = useAppCharges(app.code, Boolean(app.installation) && !app.is_free);
  const [confirm, setConfirm] = useState<"install" | "deactivate" | null>(null);
  const [nowMs] = useState(() => new Date().getTime());
  const inst = app.installation;
  const s = installationState(inst, nowMs);
  const suspended = Boolean(inst?.suspended_by_platform);
  const expiresSoon = inst?.subscription_expires_at ? Date.parse(inst.subscription_expires_at) - nowMs : null;
  const panel = APP_PANELS[app.code];

  const run = (a: "install" | "activate" | "deactivate") =>
    action.mutate(a, {
      onSuccess: () => {
        setConfirm(null);
        toast.success(a === "install" ? `ثُبّت «${app.name}».` : a === "activate" ? "فُعّل التطبيق." : "عُطّل التطبيق.");
      },
      onError: (e) => {
        setConfirm(null);
        toast.error(isApiError(e) ? e.userMessage : "تعذّر تنفيذ الإجراء.");
      },
    });

  return (
    <div className="flex flex-col gap-8" data-testid="app-page" data-code={app.code}>
      <PageHeader
        eyebrow={app.code}
        title={app.name}
        description={app.description}
        actions={
          owner ? (
            !inst ? (
              <Button className="h-11 lg:h-9" onClick={() => (app.install_preview ? setConfirm("install") : run("install"))} disabled={action.isPending || app.is_listed === false} data-testid="app-install">
                تثبيت
              </Button>
            ) : (
              <>
                {panel && s.value === "active" ? (
                  <Link href={panel} className={cn(buttonVariants(), "h-11 lg:h-9")} data-testid="app-panel">
                    افتح
                  </Link>
                ) : null}
                {inst.is_active ? (
                  <Button variant="outline" className="h-11 lg:h-9" disabled={suspended || action.isPending} title={suspended ? "تواصل مع الدعم" : undefined} onClick={() => setConfirm("deactivate")} data-testid="app-deactivate">
                    تعطيل
                  </Button>
                ) : (
                  <Button variant="outline" className="h-11 lg:h-9" disabled={suspended || action.isPending} title={suspended ? "تواصل مع الدعم" : undefined} onClick={() => run("activate")} data-testid="app-activate">
                    تفعيل
                  </Button>
                )}
              </>
            )
          ) : null
        }
      />
      {suspended ? (
        <Notice tone="destructive" testId="app-suspended" action={<Link href="/dashboard/wallet/tickets" className="text-sm underline underline-offset-4">تواصل مع الدعم</Link>}>
          معلَّق من المنصة{app.suspension_reason ? ` — ${app.suspension_reason}` : ""}. التحكم في التطبيق معطَّل حتى ترفع المنصة التعليق.
        </Notice>
      ) : null}
      {s.value === "expired" ? <Notice tone="warning">انتهى الاشتراك في <Mono>{formatDate(inst!.subscription_expires_at!)}</Mono> — يُجدَّد من المنصة عند تحصيل الرسوم.</Notice> : null}
      {s.value === "active" && expiresSoon !== null && expiresSoon > 0 && expiresSoon < 7 * DAY ? (
        <Notice testId="app-expiring">
          ينتهي الاشتراك في <Mono>{formatDate(inst!.subscription_expires_at!)}</Mono>.
        </Notice>
      ) : null}
      {!owner ? <p className="text-sm text-muted-foreground">تثبيت التطبيقات وتفعيلها لمالك المتجر.</p> : null}
      {app.is_listed === false ? <Notice testId="app-delisted">أُزيل هذا التطبيق من الكتالوج — يبقى تثبيتك الحالي ولا يمكن تثبيته من جديد.</Notice> : null}

      <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">السعر</dt>
        <dd>{priceText(app)}</dd>
        <dt className="text-muted-foreground">الحالة</dt>
        <dd>
          <StatusDot tone={s.tone} label={s.label} testId="app-state" value={s.value} />
        </dd>
        {inst ? (
          <>
            <dt className="text-muted-foreground">مفعّل</dt>
            <dd>{inst.is_active ? "نعم" : "لا"}</dd>
            <dt className="text-muted-foreground">معلَّق من المنصة</dt>
            <dd>{inst.suspended_by_platform ? "نعم" : "لا"}</dd>
            <dt className="text-muted-foreground">ينتهي الاشتراك</dt>
            <dd>{inst.subscription_expires_at ? <Mono>{formatDate(inst.subscription_expires_at)}</Mono> : <span className="text-muted-foreground">بلا انتهاء</span>}</dd>
          </>
        ) : null}
      </dl>

      {inst ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">سجل التطبيق</h2>
          {events.data?.length ? (
            <ol className="flex flex-col border-s border-border" data-testid="app-events">
              {events.data.map((e, i) => (
                <li key={`${e.event}-${e.created_at}-${i}`} className="relative flex flex-wrap items-baseline gap-x-3 py-1.5 ps-4 text-sm">
                  <span aria-hidden className="absolute -start-[3.5px] top-3 size-1.5 rounded-full bg-muted-foreground" />
                  <span className="font-medium">{APP_EVENT_LABELS[e.event]}</span>
                  <Mono className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</Mono>
                  {e.note ? <span className="text-xs text-muted-foreground">{e.note}</span> : null}
                </li>
              ))}
            </ol>
          ) : events.isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <p className="text-sm text-muted-foreground">لا أحداث بعد.</p>
          )}
        </section>
      ) : null}

      {inst && !app.is_free ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">رسوم التطبيق</h2>
          <p className="text-xs text-muted-foreground">للقراءة — تُحصَّل الرسوم من مستحقات المنصة.</p>
          {charges.data?.length ? (
            <table className="w-full max-w-xl text-sm" data-testid="app-charges">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 text-start font-normal">الفترة</th>
                  <th className="py-2 text-end font-normal">المبلغ</th>
                  <th className="py-2 text-start font-normal ps-4">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {charges.data.map((c) => (
                  <tr key={c.id} className="h-11 border-b border-border">
                    <td>
                      <Mono>{c.period_label}</Mono>
                    </td>
                    <td className="text-end">
                      <Money value={c.display_amount} />
                    </td>
                    <td className="ps-4">
                      <StatusDot tone={c.status === "pending" ? "warning" : c.status === "collected" ? "success" : "muted"} label={CHARGE_STATUS_LABELS[c.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : charges.isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <p className="text-sm text-muted-foreground">لا رسوم مسجّلة بعد.</p>
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={confirm === "install"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`تثبيت «${app.name}»`}
        description={
          app.install_preview ? (
            <>
              الرسوم: <Money value={app.install_preview.display_price} /> {app.install_preview.interval_label}. {app.install_preview.note}
            </>
          ) : null
        }
        confirmLabel="تأكيد التثبيت"
        pending={action.isPending}
        onConfirm={() => run("install")}
      />
      <ConfirmDialog
        open={confirm === "deactivate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`تعطيل «${app.name}»؟`}
        description="تتوقف الرسائل والأتمتة الآلية لهذا التطبيق حتى تعيد تفعيله. لا يُلغى الاشتراك ولا تُسترد رسوم الفترة الحالية."
        confirmLabel="تعطيل"
        destructive
        pending={action.isPending}
        onConfirm={() => run("deactivate")}
      />
    </div>
  );
}
