"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBox } from "@/components/shared/data-table";
import { formatDate } from "@/lib/format";
import { isApiError } from "@/lib/api-error";
import { useAssignPlan, usePlans, useSubscriptions } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ReadOnlyNote, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { BTN, Field, INPUT, SkeletonRows, StorePicker, Table, Td, Th, YesNo, clientFromSchema } from "@/features/platform-admin/components/billing/ui";
import { SUBSCRIPTION_LABELS, SUBSCRIPTION_STATUSES, type ClientOption, type SubscriptionStatus } from "@/features/platform-admin/schemas";

/**
 * `/subscriptions` (M46 US-46.4): every subscription row, history included, filters in the
 * URL; «تغيير الباقة» runs `assign_plan` — the current row ends (`is_current=false`) and a
 * new one starts, so the history stays visible.
 */
const parsers = {
  q: parseAsString.withDefault(""),
  schema: parseAsString.withDefault(""),
  plan: parseAsString.withDefault(""),
  status: parseAsStringLiteral(SUBSCRIPTION_STATUSES),
  current: parseAsStringLiteral(["true"] as const),
};

const TONE: Record<SubscriptionStatus, "success" | "muted" | "warning"> = { active: "success", cancelled: "muted", expired: "warning" };

export function SubscriptionsScreen() {
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const subs = useSubscriptions({ q: f.q, schema: f.schema, status: f.status, current: f.current, page_size: 100 });
  const plans = usePlans();
  const canWrite = useCanWrite("billing");
  const [assigning, setAssigning] = useState<ClientOption[] | null>(null);
  // The list endpoint filters by store/status/current; the plan filter (from `/plans`) is applied here.
  const rows = (subs.data?.results ?? []).filter((r) => !f.plan || r.plan.code === f.plan);
  const filtered = Boolean(f.q || f.schema || f.plan || f.status || f.current);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الاشتراكات"
        description="اشتراك واحد حالي لكل متجر؛ التغيير يُنهي الحالي ويبدأ جديداً."
        actions={
          <Button className={BTN} disabled={!canWrite} onClick={() => setAssigning(f.schema ? [clientFromSchema(f.schema)] : [])} data-testid="assign-open">
            تغيير الباقة
          </Button>
        }
      />
      {!canWrite ? <ReadOnlyNote /> : null}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end" data-testid="subscription-filters">
        <SearchBox value={f.q} onChange={(v) => void setF({ q: v || null })} placeholder="اسم المتجر أو المخطط" label="بحث في الاشتراكات" className="md:w-72" />
        <NativeSelect className={`${INPUT} md:w-40`} aria-label="الحالة" value={f.status ?? ""} onChange={(e) => void setF({ status: (e.target.value || null) as SubscriptionStatus | null })} data-testid="filter-status">
          <option value="">كل الحالات</option>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SUBSCRIPTION_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect className={`${INPUT} md:w-44`} aria-label="الباقة" value={f.plan} onChange={(e) => void setF({ plan: e.target.value || null })} data-testid="filter-plan">
          <option value="">كل الباقات</option>
          {plans.data?.map((p) => (
            <option key={p.id} value={p.code}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
          <input type="checkbox" className="size-4 accent-foreground" checked={f.current === "true"} onChange={(e) => void setF({ current: e.target.checked ? "true" : null })} data-testid="filter-current" />
          الحالية فقط
        </label>
        {f.schema ? (
          <span className="flex items-center gap-1 text-sm">
            المتجر <Code>{f.schema}</Code>
            <Button variant="ghost" className={BTN} onClick={() => void setF({ schema: null })}>
              إزالة
            </Button>
          </span>
        ) : null}
      </div>
      {subs.error ? <ErrorState error={subs.error} onRetry={() => void subs.refetch()} /> : null}
      {subs.data && rows.length === 0 ? (
        <EmptyState title={filtered ? "لا اشتراكات تطابق الفلاتر" : "لا اشتراكات"} />
      ) : (
        <Table caption="الاشتراكات" testId="subscriptions-table">
          <thead>
            <tr>
              <Th>المتجر</Th>
              <Th>الباقة</Th>
              <Th>الحالة</Th>
              <Th>الحالي</Th>
              <Th>البداية</Th>
              <Th>نهاية الفترة</Th>
              <Th>ملاحظات</Th>
              <Th>
                <span className="sr-only">إجراءات</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {subs.isLoading ? <SkeletonRows cols={8} /> : null}
            {rows.map((r) => (
              <tr key={r.id} data-testid="subscription-row" data-schema={r.schema_name} data-current={r.is_current ? "true" : "false"} className={r.is_current ? "" : "text-muted-foreground"}>
                <Td>
                  <Link href={`/stores/${encodeURIComponent(r.schema_name)}`} className="flex flex-col hover:underline">
                    <span>{r.store_name}</span>
                    <Code className="text-muted-foreground">{r.schema_name}</Code>
                  </Link>
                </Td>
                <Td className="whitespace-nowrap">{r.plan.name}</Td>
                <Td>
                  <StatusText tone={TONE[r.status]}>{SUBSCRIPTION_LABELS[r.status]}</StatusText>
                </Td>
                <Td>
                  <YesNo value={r.is_current} />
                </Td>
                <Td>
                  <Mono className="text-xs">{formatDate(r.started_at)}</Mono>
                </Td>
                <Td>{r.current_period_end ? <Mono className="text-xs">{formatDate(r.current_period_end)}</Mono> : <span className="text-xs text-muted-foreground">—</span>}</Td>
                <Td className="max-w-56 text-xs text-muted-foreground">{r.notes || "—"}</Td>
                <Td>
                  {r.is_current ? (
                    <Button variant="ghost" className={BTN} disabled={!canWrite} onClick={() => setAssigning([{ schema_name: r.schema_name, name: r.store_name, merchant_phone: null, primary_domain: "", current_plan: r.plan.name }])} data-testid="row-assign">
                      تغيير
                    </Button>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {assigning ? <AssignDialog initial={assigning} onClose={() => setAssigning(null)} /> : null}
    </div>
  );
}

function AssignDialog({ initial, onClose }: { initial: ClientOption[]; onClose: () => void }) {
  const plans = usePlans();
  const assign = useAssignPlan();
  const [store, setStore] = useState<ClientOption[]>(initial);
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const active = (plans.data ?? []).filter((p) => p.is_active);

  async function submit() {
    const e: Record<string, string> = {};
    if (!store[0]) e.schema_name = "اختر متجراً.";
    if (!planId) e.plan_id = "اختر باقة.";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const row = await assign.mutateAsync({ schema_name: store[0]!.schema_name, plan_id: Number(planId), status, current_period_end: periodEnd || undefined, notes });
      toastResult({ detail: `أُسندت الباقة «${row.plan.name}» إلى ${row.store_name}.` });
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      toastError(err);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !assign.isPending && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="assign-dialog">
        <DialogHeader>
          <DialogTitle>تغيير باقة متجر</DialogTitle>
          <DialogDescription>يُنهى الاشتراك الحالي ويُنشأ اشتراك جديد (assign_plan).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="المتجر" htmlFor="assign-store" error={errors.schema_name}>
            <StorePicker id="assign-store" value={store} onChange={setStore} testId="assign-store" />
          </Field>
          <Field label="الباقة" htmlFor="assign-plan" error={errors.plan_id}>
            <NativeSelect id="assign-plan" className={INPUT} value={planId} onChange={(e) => setPlanId(e.target.value)} data-testid="assign-plan">
              <option value="">اختر باقة</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.display_price}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحالة" htmlFor="assign-status">
              <NativeSelect id="assign-status" className={INPUT} value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SUBSCRIPTION_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="نهاية الفترة" htmlFor="assign-end" hint="اختياري">
              <Input id="assign-end" type="date" dir="ltr" className={`${INPUT} font-mono`} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </Field>
          </div>
          <Field label="ملاحظات" htmlFor="assign-notes">
            <Input id="assign-notes" className={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" className={BTN} onClick={onClose} disabled={assign.isPending}>
            إلغاء
          </Button>
          <Button className={BTN} onClick={() => void submit()} disabled={assign.isPending} data-testid="assign-submit">
            {assign.isPending ? "جارٍ الإسناد…" : "إسناد الباقة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
