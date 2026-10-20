"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDueAction, useDues } from "@/features/platform-admin/api/hooks";
import { Code, ConfirmDialog, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { WalletBalances } from "@/features/platform-admin/components/money/wallet-balances";
import { COMMISSION_TYPE_LABELS, type DueActionInput } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/dues/<schema>` (M45 US-45.2/45.3). Four collapsible sections + the
 * installed apps, each row with its own action(s) — the 8 actions of FR-45.03, each sent
 * as exactly `{action, record_id | installation_id}` after a confirmation that names the
 * store and the effect (FR-45.06). The server's sentence is shown verbatim (FR-45.04) and
 * the entry it returns replaces the old one, so the row updates in place.
 *
 * Totals are the server's per-currency strings (FR-45.05) — nothing is added up here.
 */
interface Pending {
  input: DueActionInput;
  title: string;
  impact: string;
  confirmLabel: string;
  destructive?: boolean;
}

export function DuesDetailScreen({ schema }: { schema: string }) {
  const q = useDues(schema);
  const act = useDueAction(schema);
  const [pending, setPending] = useState<Pending | null>(null);

  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (q.error || !q.data) {
    const notFound = isApiError(q.error) && q.error.status === 404;
    return (
      <div className="flex flex-col gap-4">
        {notFound ? (
          <EmptyState title={q.error instanceof Error ? q.error.message : "متجر غير معروف أو غير جاهز."} action={<Link href="/dues" className="text-sm underline">العودة إلى المستحقات</Link>} />
        ) : (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        )}
      </div>
    );
  }

  const d = q.data;
  const store = d.name;
  const run = async () => {
    if (!pending) return;
    try {
      const res = await act.mutateAsync(pending.input);
      toastResult(res);
    } catch (err) {
      toastError(err);
    } finally {
      setPending(null);
    }
  };

  const ask = (p: Pending) => setPending(p);

  return (
    <div className="flex flex-col gap-6" data-testid="dues-detail">
      <PageHeader
        title={store}
        eyebrow={d.schema_name}
        description="مستحقات المتجر لدى المنصة — كل إجراء يدوي ويُطلب تأكيده."
        actions={
          <Link href="/dues" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8">
            كل المتاجر
          </Link>
        }
      />

      <section aria-label="المحفظة واللقطة" className="grid gap-4 border-b border-border pb-6 md:grid-cols-3">
        <Fact label="هاتف التاجر">{d.merchant_phone ? <Code>{d.merchant_phone}</Code> : <span className="text-muted-foreground">—</span>}</Fact>
        <Fact label="محفظة شروة باي للتاجر">
          <WalletBalances wallet={d.wallet} className="items-start" />
        </Fact>
        <Fact label="آخر لقطة">
          {d.snapshot ? (
            <span className="flex flex-wrap items-baseline gap-2 text-sm">
              <Mono className="text-xs text-muted-foreground">{d.snapshot.date}</Mono>
              <span>
                <Mono>{d.snapshot.orders_count}</Mono> طلب
              </span>
              <Money value={d.snapshot.display_revenue_sar} />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Fact>
      </section>

      {d.totals.length ? (
        <section aria-labelledby="totals-h" className="flex flex-col gap-2" data-testid="dues-totals">
          <h2 id="totals-h" className="text-sm font-medium">
            المستحق حسب العملة
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {d.totals.map((t) => (
              <li key={t.currency} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Mono className="w-16 text-xs text-muted-foreground">{t.currency}</Mono>
                <span>
                  عمولات <Money value={t.display_commissions} />
                </span>
                <span>
                  فواتير <Money value={t.display_charges} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!d.has_dues ? (
        <EmptyState title="لا مستحقات على هذا المتجر" description="لا عمولات ولا فواتير تطبيقات بانتظار التحصيل." className="py-6" />
      ) : null}

      <Section title="عمولات مستحقة" count={d.pending_commissions.length} testId="sec-commissions" empty="لا عمولات مستحقة.">
        {d.pending_commissions.map((c) => (
          <Row
            key={c.id}
            testId={`commission-${c.id}`}
            main={
              <>
                <span>
                  الطلب <Mono>#{c.order_id}</Mono>
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.plan_name_snapshot} · {COMMISSION_TYPE_LABELS[c.commission_type]}
                  {c.commission_type === "percentage" ? (
                    <>
                      {" "}
                      <Mono>{c.commission_value}%</Mono>
                    </>
                  ) : null}{" "}
                  · {formatDate(c.created_at)}
                </span>
              </>
            }
            amount={<Money value={c.display_amount} />}
            actions={
              <>
                <ActionButton
                  testId="collect"
                  disabledReason={c.collectable ? null : "لا مبلغ للتحصيل — استخدم الإعفاء."}
                  onClick={() =>
                    ask({
                      input: { action: "collect_commission", record_id: c.id },
                      title: `تحصيل عمولة الطلب #${c.order_id}`,
                      impact: `يُخصم ${c.display_amount} من محفظة شروة باي للتاجر «${store}» بسبب platform_fee.`,
                      confirmLabel: "تحصيل",
                    })
                  }
                >
                  تحصيل
                </ActionButton>
                <ActionButton
                  variant="outline"
                  testId="waive"
                  onClick={() =>
                    ask({
                      input: { action: "waive_commission", record_id: c.id },
                      title: `إعفاء عمولة الطلب #${c.order_id}`,
                      impact: `تُعفى عمولة ${c.display_amount} على «${store}» بلا أي خصم.`,
                      confirmLabel: "إعفاء",
                    })
                  }
                >
                  إعفاء
                </ActionButton>
              </>
            }
          />
        ))}
      </Section>

      <Section title="فواتير تطبيقات مستحقة" count={d.pending_charges.length} testId="sec-charges" empty="لا فواتير مستحقة.">
        {d.pending_charges.map((c) => (
          <Row
            key={c.id}
            testId={`charge-${c.id}`}
            main={
              <>
                <span>{c.app_name_snapshot}</span>
                <span className="text-xs text-muted-foreground">
                  الفترة <Code>{c.period_label}</Code>
                </span>
              </>
            }
            amount={<Money value={c.display_price} />}
            actions={
              <>
                <ActionButton
                  testId="collect"
                  onClick={() =>
                    ask({
                      input: { action: "collect_charge", record_id: c.id },
                      title: `تحصيل فاتورة «${c.app_name_snapshot}»`,
                      impact: `يُخصم ${c.display_price} للفترة ${c.period_label} من محفظة شروة باي للتاجر «${store}» بسبب platform_fee.`,
                      confirmLabel: "تحصيل",
                    })
                  }
                >
                  تحصيل
                </ActionButton>
                <ActionButton
                  variant="outline"
                  testId="waive"
                  onClick={() =>
                    ask({
                      input: { action: "waive_charge", record_id: c.id },
                      title: `إعفاء فاتورة «${c.app_name_snapshot}»`,
                      impact: `تُعفى فاتورة ${c.period_label} على «${store}» بلا أي خصم.`,
                      confirmLabel: "إعفاء",
                    })
                  }
                >
                  إعفاء
                </ActionButton>
              </>
            }
          />
        ))}
      </Section>

      <Section title="لم تُولَّد بعد" count={d.uninvoiced.filter((u) => !u.already_generated).length} testId="sec-uninvoiced" empty="كل التثبيتات المدفوعة لها فاتورة للدورة الحالية.">
        {d.uninvoiced.map((u) => (
          <Row
            key={u.installation_id}
            testId={`uninvoiced-${u.installation_id}`}
            main={
              <>
                <span>{u.app_name}</span>
                <span className="text-xs text-muted-foreground">
                  الدورة <Code>{u.period_label}</Code>
                </span>
              </>
            }
            actions={
              <ActionButton
                variant="outline"
                testId="generate"
                disabledReason={u.already_generated ? `فاتورة ${u.period_label} مولَّدة بالفعل لهذا التثبيت.` : null}
                onClick={() =>
                  ask({
                    input: { action: "generate_charge", installation_id: u.installation_id },
                    title: `توليد فاتورة «${u.app_name}»`,
                    impact: `تُنشأ فاتورة مستحقة للفترة ${u.period_label} على «${store}» — لا خصم حتى التحصيل.`,
                    confirmLabel: "توليد فاتورة",
                  })
                }
              >
                توليد فاتورة
              </ActionButton>
            }
          />
        ))}
      </Section>

      <Section title="فواتير مُعفاة" count={d.waived_charges.length} testId="sec-waived" empty="لا فواتير مُعفاة." defaultOpen={false}>
        {d.waived_charges.map((c) => (
          <Row
            key={c.id}
            testId={`waived-${c.id}`}
            main={
              <>
                <span>{c.app_name_snapshot}</span>
                <span className="text-xs text-muted-foreground">
                  الفترة <Code>{c.period_label}</Code>
                </span>
              </>
            }
            amount={<Money value={c.display_price} muted />}
            actions={
              <ActionButton
                variant="outline"
                testId="unwaive"
                onClick={() =>
                  ask({
                    input: { action: "unwaive_charge", record_id: c.id },
                    title: `التراجع عن إعفاء «${c.app_name_snapshot}»`,
                    impact: `تعود فاتورة ${c.period_label} (${c.display_price}) مستحقة على «${store}».`,
                    confirmLabel: "تراجع عن الإعفاء",
                  })
                }
              >
                تراجع عن الإعفاء
              </ActionButton>
            }
          />
        ))}
      </Section>

      <Section title="التطبيقات المثبتة" count={d.installations.length} testId="sec-installations" empty="لا تطبيقات مثبتة." defaultOpen={false}>
        {d.installations.map((i) => (
          <Row
            key={i.installation_id}
            testId={`install-${i.installation_id}`}
            main={
              <>
                <span>{i.app_name}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {i.suspended_by_platform ? <StatusText tone="destructive">معلَّق من المنصة</StatusText> : <StatusText tone="success">يعمل</StatusText>}
                  {i.expired ? <span>انتهى الاشتراك — لا فاتورة للدورة.</span> : i.subscription_expires_at ? <span>حتى {formatDate(i.subscription_expires_at)}</span> : null}
                </span>
              </>
            }
            actions={
              i.suspended_by_platform ? (
                <ActionButton
                  variant="outline"
                  testId="reactivate"
                  onClick={() =>
                    ask({
                      input: { action: "reactivate_app", installation_id: i.installation_id },
                      title: `إعادة تفعيل «${i.app_name}»`,
                      impact: `يعود «${i.app_name}» للعمل لدى «${store}» فوراً.`,
                      confirmLabel: "إعادة تفعيل",
                    })
                  }
                >
                  إعادة تفعيل
                </ActionButton>
              ) : (
                <ActionButton
                  variant="destructive"
                  testId="suspend"
                  onClick={() =>
                    ask({
                      input: { action: "suspend_app", installation_id: i.installation_id },
                      title: `تعليق «${i.app_name}» حتى السداد`,
                      impact: `يتوقف «${i.app_name}» لدى «${store}» حتى السداد. لا يقدر التاجر رفع التعليق بنفسه.`,
                      confirmLabel: "تعليق حتى السداد",
                      destructive: true,
                    })
                  }
                >
                  تعليق حتى السداد
                </ActionButton>
              )
            }
          />
        ))}
      </Section>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.title ?? ""}
        description={
          <>
            المتجر: <strong>{store}</strong> <Code>{d.schema_name}</Code>
          </>
        }
        impact={pending?.impact}
        confirmLabel={pending?.confirmLabel ?? "تأكيد"}
        destructive={pending?.destructive}
        pending={act.isPending}
        onConfirm={() => void run()}
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Section({ title, count, children, empty, testId, defaultOpen = true }: { title: string; count: number; children: ReactNode; empty: string; testId: string; defaultOpen?: boolean }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <details open={defaultOpen || undefined} className="group/sec surface-card" data-testid={testId}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm font-medium marker:content-none">
        <span>{title}</span>
        <Mono className={count ? "text-foreground" : "text-muted-foreground"} data-testid="section-count">
          {count}
        </Mono>
      </summary>
      {hasRows ? <ul className="divide-y divide-border border-t border-border">{children}</ul> : <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{empty}</p>}
    </details>
  );
}

function Row({ main, amount, actions, testId }: { main: ReactNode; amount?: ReactNode; actions: ReactNode; testId: string }) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center" data-testid={testId}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">{main}</div>
      {amount ? <div className="text-sm md:w-40 md:text-end">{amount}</div> : null}
      <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
  disabledReason = null,
  testId,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  disabledReason?: string | null;
  testId: string;
}) {
  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        data-testid={testId}
        className={cn("h-11 lg:h-8", variant === "outline" && "text-muted-foreground")}
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? undefined}
        onClick={onClick}
      >
        {children}
      </Button>
      {disabledReason ? (
        <span className="max-w-56 text-[11px] text-muted-foreground" data-testid="disabled-reason">
          {disabledReason}
        </span>
      ) : null}
    </span>
  );
}

