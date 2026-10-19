"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { isApiError } from "@/lib/api-error";
import { useAddDomain, useSetPrimaryDomain } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError } from "@/features/platform-admin/components/bits";
import { ADMIN_ROLE_LABELS, SUBSCRIPTION_LABELS, type StoreDetail, type SubscriptionStatus } from "@/features/platform-admin/schemas";
import { toast } from "sonner";

const SUB_TONE: Record<SubscriptionStatus, "success" | "muted" | "warning"> = { active: "success", cancelled: "muted", expired: "warning" };

const TH = "h-10 px-3 text-start text-xs font-normal text-muted-foreground";
const TD = "h-11 px-3 align-middle";

export function SubscriptionTab({ detail }: { detail: StoreDetail }) {
  const sub = detail.subscription;
  return (
    <div className="flex flex-col gap-6" data-testid="subscription-tab">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">الاشتراك الحالي</h2>
        {sub ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border p-4 text-sm md:grid-cols-4">
            <Item label="الباقة">
              {sub.plan.name} <Code className="text-muted-foreground">{sub.plan.code}</Code>
            </Item>
            <Item label="الحالة">
              <StatusText tone={SUB_TONE[sub.status]}>{SUBSCRIPTION_LABELS[sub.status]}</StatusText>
            </Item>
            <Item label="البداية">{formatDate(sub.started_at)}</Item>
            <Item label="نهاية الفترة">{sub.current_period_end ? formatDate(sub.current_period_end) : "—"}</Item>
          </dl>
        ) : (
          <EmptyState title="بلا اشتراك حالي" description="الباقات غير مفعّلة أو لم يُسنَد للمتجر اشتراك بعد." />
        )}
        <Link href={`/subscriptions?schema=${encodeURIComponent(detail.schema_name)}`} className="self-start text-sm text-muted-foreground hover:text-foreground hover:underline">
          إدارة الاشتراك وتغيير الباقة
        </Link>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">السجل</h2>
        {detail.subscription_history.length ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">سجل الاشتراكات</caption>
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>الباقة</th>
                  <th className={TH}>الحالة</th>
                  <th className={TH}>حالي</th>
                  <th className={TH}>البداية</th>
                  <th className={TH}>الإلغاء</th>
                  <th className={TH}>ملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.subscription_history.map((h) => (
                  <tr key={h.id}>
                    <td className={TD}>{h.plan.name}</td>
                    <td className={TD}>
                      <StatusText tone={SUB_TONE[h.status]}>{SUBSCRIPTION_LABELS[h.status]}</StatusText>
                    </td>
                    <td className={TD}>{h.is_current ? "نعم" : <span className="text-muted-foreground">لا</span>}</td>
                    <td className={`${TD} whitespace-nowrap text-xs`}>{formatDate(h.started_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-xs`}>{h.cancelled_at ? formatDate(h.cancelled_at) : "—"}</td>
                    <td className={`${TD} text-xs text-muted-foreground`}>{h.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا سجل.</p>
        )}
      </section>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function DomainsTab({ detail }: { detail: StoreDetail }) {
  const canWrite = useCanWrite("stores");
  const add = useAddDomain(detail.schema_name);
  const primary = useSetPrimaryDomain(detail.schema_name);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: number; domain: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await add.mutateAsync(value.trim());
      toast.success(`أُضيف النطاق ${value.trim()}.`);
      setValue("");
    } catch (err) {
      setError(isApiError(err) ? (err.fields?.domain?.[0] ?? err.userMessage) : "تعذّر إضافة النطاق.");
    }
  }

  async function makePrimary() {
    if (!target) return;
    try {
      await primary.mutateAsync(target.id);
      toast.success(`أصبح ${target.domain} النطاق الأساسي.`);
      setTarget(null);
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="domains-tab">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {detail.domains.map((d) => (
          <li key={d.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-2" data-testid="domain-row">
            <span className="flex items-center gap-3">
              <Code>{d.domain}</Code>
              {d.is_primary ? <StatusText tone="success">أساسي</StatusText> : null}
            </span>
            {!d.is_primary ? (
              <Button variant="ghost" size="sm" className="h-11 lg:h-7" disabled={!canWrite} onClick={() => setTarget({ id: d.id, domain: d.domain })} data-testid="make-primary">
                اجعله أساسياً
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-1.5" noValidate>
          <label htmlFor="new-domain" className="text-sm">
            إضافة نطاق
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="new-domain" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="shop.example.com" className="h-11 sm:max-w-sm lg:h-8" aria-invalid={Boolean(error)} data-testid="domain-input" />
            <Button type="submit" variant="outline" className="h-11 lg:h-8" disabled={!value.trim() || add.isPending} data-testid="domain-add">
              أضف
            </Button>
          </div>
          {error ? (
            <p className="text-xs text-destructive" data-testid="domain-error">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <ReadOnlyNote />
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={`النطاق الأساسي لـ«${detail.name}»`}
        impact={target ? <>يصبح <Code>{target.domain}</Code> عنوان المتجر الذي تُوجَّه إليه الروابط والرسائل.</> : null}
        confirmLabel="اجعله أساسياً"
        pending={primary.isPending}
        onConfirm={() => void makePrimary()}
      />
    </div>
  );
}

export function AppsTab({ detail }: { detail: StoreDetail }) {
  if (!detail.installations.length) return <EmptyState title="لا تطبيقات مثبّتة" />;
  return (
    <div className="flex flex-col gap-3" data-testid="apps-tab">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">التطبيقات المثبّتة</caption>
          <thead className="border-b border-border">
            <tr>
              <th className={TH}>التطبيق</th>
              <th className={TH}>الحالة</th>
              <th className={TH}>انتهاء الاشتراك</th>
              <th className={TH}>ثُبِّت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {detail.installations.map((i) => (
              <tr key={i.id}>
                <td className={TD}>
                  {i.app_name} <Code className="text-muted-foreground">{i.app_code}</Code>
                </td>
                <td className={TD}>
                  {i.suspended_by_platform ? (
                    <StatusText tone="destructive" testId="app-suspended">
                      معلَّق من المنصة حتى السداد
                    </StatusText>
                  ) : i.is_active ? (
                    <StatusText tone="success">نشط</StatusText>
                  ) : (
                    <StatusText tone="muted">غير نشط</StatusText>
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap text-xs`}>{i.subscription_expires_at ? formatDate(i.subscription_expires_at) : "—"}</td>
                <td className={`${TD} whitespace-nowrap text-xs`}>{formatDate(i.installed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href={`/dues/${encodeURIComponent(detail.schema_name)}`} className="self-start text-sm text-muted-foreground hover:text-foreground hover:underline">
        تعليق تطبيق أو إعادة تفعيله من المستحقات
      </Link>
    </div>
  );
}

export function ActionsTab({ detail }: { detail: StoreDetail }) {
  if (!detail.recent_actions.length) return <EmptyState title="لا إجراءات مسجّلة على هذا المتجر" />;
  return (
    <div className="overflow-x-auto rounded-lg border border-border" data-testid="actions-tab">
      <table className="w-full text-sm">
        <caption className="sr-only">آخر الإجراءات (FR-20.07)</caption>
        <thead className="border-b border-border">
          <tr>
            <th className={TH}>الوقت</th>
            <th className={TH}>المنفّذ</th>
            <th className={TH}>الإجراء</th>
            <th className={TH}>التفاصيل</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {detail.recent_actions.map((a) => (
            <tr key={a.id} data-testid="action-row">
              <td className={`${TD} whitespace-nowrap text-xs text-muted-foreground`}>
                <time dateTime={a.at}>{formatDateTime(a.at)}</time>
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <Code>{a.actor.username}</Code> <span className="text-xs text-muted-foreground">· {ADMIN_ROLE_LABELS[a.actor.role]}</span>
              </td>
              <td className={TD}>
                <Code className="text-muted-foreground">{a.action}</Code>
              </td>
              <td className={`${TD} min-w-48`}>{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
