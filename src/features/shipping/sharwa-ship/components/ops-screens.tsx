"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AccessGate, FeatureOffState, ForbiddenState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { COURIER_SUPERVISION_FEATURES } from "@/lib/access";
import { ShippingSubnav, dangerButton, outlineButton, primaryButton } from "@/features/shipping/components/bits";
import { ShipmentStatusText } from "@/features/shipping/components/edge-cases-screen";
import { useAgentShifts, useAssignShipment, useAwbQueue, useEmergencyReassign, useRateCards, useRetryAwb, useSupervisor } from "@/features/shipping/sharwa-ship/api";
import { SharwaShipNav } from "@/features/shipping/sharwa-ship/components/shared";
import { AWB_LABELS, CARRIER_LABELS, CUSTODY_LABELS, type Supervisor } from "@/features/shipping/sharwa-ship/schemas";

/**
 * `courier` screens (supervisor, agent shifts) open with Sharwa Ship OR local delivery
 * (`COURIER_SUPERVISION_FEATURES`, Phase 7 decision 3); the AWB/rate-card screens stay Sharwa Ship's.
 */
function Gate({ children, ownerOnly = false, courier = false }: { children: React.ReactNode; ownerOnly?: boolean; courier?: boolean }) {
  const { canFeature, session } = useAccess();
  if (courier && !canFeature(COURIER_SUPERVISION_FEATURES))
    return <FeatureOffState title="الإشراف على المندوبين غير مفعَّل لمتجرك" description="فعّل «شروة شيب» أو التوصيل المحلي بمندوبي المتجر من باقتك." />;
  if (!courier && !canFeature("sharwa_ship")) return <FeatureOffState title="الميزة غير مفعَّلة لمتجرك" />;
  if (ownerOnly && session.kind !== "merchant") return <ForbiddenState description="الإشراف على المندوبين مقصور على مالك المتجر." />;
  return <AccessGate permission="orders.view">{children}</AccessGate>;
}

function Frame({ title, description, children, testId }: { title: string; description: string; children: React.ReactNode; testId: string }) {
  const { canFeature } = useAccess();
  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid={testId}>
      <PageHeader title={title} description={description} />
      <ShippingSubnav />
      {/* Local-delivery-only stores reach the supervisor without Sharwa Ship: no dead links. */}
      {canFeature("sharwa_ship") ? <SharwaShipNav /> : null}
      {children}
    </div>
  );
}

const tableClass = "w-full min-w-[640px] text-sm";
const th = "h-10 border-b border-border px-3 text-start text-xs font-medium text-muted-foreground";
const td = "h-11 border-b border-border px-3 align-middle";

// ── AWB queue (US-39.4) ──────────────────────────────────────────────────────────────
export function AwbQueueScreen() {
  return (
    <Gate>
      <AwbQueue />
    </Gate>
  );
}

function AwbQueue() {
  const q = useAwbQueue();
  const retry = useRetryAwb();
  const { session } = useAccess();
  const owner = session.kind === "merchant";
  return (
    <Frame title="طابور إصدار AWB" description="طلبات إصدار بوليصات الناقلين الخارجيين المعلّقة، بعدد المحاولات وآخر خطأ." testId="awb-queue">
      {q.isLoading ? <Skeleton className="h-40" /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.results.length ? (
        <EmptyState title="لا طلبات إصدار معلّقة" />
      ) : (
        <div className="overflow-x-auto surface-card">
          <table className={tableClass}>
            <caption className="sr-only">طابور AWB</caption>
            <thead>
              <tr>
                <th className={th}>التجهيز</th>
                <th className={th}>الطلب</th>
                <th className={th}>الناقل</th>
                <th className={th}>الحالة</th>
                <th className={cn(th, "text-end")}>المحاولات</th>
                <th className={th}>آخر خطأ</th>
                <th className={th}>آخر تحديث</th>
                <th className={th}>
                  <span className="sr-only">إجراء</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {q.data.results.map((a) => (
                <tr key={a.id} data-testid="awb-row" data-status={a.status}>
                  <td className={td}>
                    <Mono>#{a.fulfillment_id}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>#{a.order_id}</Mono>
                  </td>
                  <td className={td}>{CARRIER_LABELS[a.carrier_code]}</td>
                  <td className={cn(td, a.status === "failed" && "text-destructive")} data-testid="awb-status">
                    {AWB_LABELS[a.status]}
                  </td>
                  <td className={cn(td, "text-end")}>
                    <Mono data-testid="awb-attempts">{a.attempts}</Mono>
                  </td>
                  <td className={cn(td, "max-w-64 truncate text-xs text-muted-foreground")} title={a.error_detail}>
                    <bdi>{a.error_detail || "—"}</bdi>
                  </td>
                  <td className={td}>
                    <Mono className="text-xs text-muted-foreground">{formatDateTime(a.updated_at)}</Mono>
                  </td>
                  <td className={cn(td, "text-end")}>
                    {a.status === "failed" ? (
                      <button
                        type="button"
                        className={outlineButton}
                        disabled={!owner || retry.isPending}
                        onClick={() =>
                          retry.mutate(a.id, {
                            onSuccess: () => toast.success("أُعيدت المحاولة — العنصر معلّق الآن."),
                            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّرت إعادة المحاولة."),
                          })
                        }
                        data-testid="awb-retry"
                      >
                        إعادة المحاولة
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}

// ── rate cards (US-39.4) ─────────────────────────────────────────────────────────────
export function RateCardsScreen() {
  return (
    <Gate>
      <RateCards />
    </Gate>
  );
}

function RateCards() {
  const q = useRateCards();
  return (
    <Frame title="لقطات تسعيرة الناقلين" description="السعر المتوقع لكل منطقة مقابل آخر سعر مؤكَّد؛ الانحراف فوق 10% ينتظر التأكيد قبل الإصدار." testId="rate-cards">
      {q.isLoading ? <Skeleton className="h-40" /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <EmptyState title="لا لقطات تسعيرة بعد" />
      ) : (
        <div className="overflow-x-auto surface-card">
          <table className={tableClass}>
            <caption className="sr-only">لقطات التسعيرة</caption>
            <thead>
              <tr>
                <th className={th}>الناقل</th>
                <th className={th}>المنطقة</th>
                <th className={cn(th, "text-end")}>المتوقع</th>
                <th className={cn(th, "text-end")}>آخر مؤكَّد</th>
                <th className={cn(th, "text-end")}>الانحراف</th>
                <th className={th}>الحالة</th>
                <th className={th}>تحديث</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={`${r.carrier_code}-${r.zone_code}`} data-testid="rate-row">
                  <td className={td}>{CARRIER_LABELS[r.carrier_code]}</td>
                  <td className={td}>
                    {r.zone_name} <Mono className="text-xs text-muted-foreground">{r.zone_code}</Mono>
                  </td>
                  <td className={cn(td, "text-end")}>
                    <Mono>{r.display_expected_price}</Mono>
                  </td>
                  <td className={cn(td, "text-end")}>
                    <Mono>{r.display_last_confirmed_price}</Mono>
                  </td>
                  <td className={cn(td, "text-end")}>
                    <Mono className={r.awaiting_confirmation ? "text-warning" : "text-muted-foreground"}>{r.drift_percent}</Mono>
                  </td>
                  <td className={cn(td, r.awaiting_confirmation ? "text-warning" : "text-muted-foreground")} data-testid="rate-state">
                    {r.awaiting_confirmation ? "بانتظار تأكيد التسعيرة" : "مؤكَّدة"}
                  </td>
                  <td className={td}>
                    <Mono className="text-xs text-muted-foreground">{formatDateTime(r.updated_at)}</Mono>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}

// ── supervisor + emergency reassignment (US-39.5) ────────────────────────────────────
export function SupervisorScreen() {
  return (
    <Gate ownerOnly courier>
      <SupervisorBody />
    </Gate>
  );
}

type AgentRow = Supervisor["agents"][number];

function SupervisorBody() {
  const q = useSupervisor();
  const [reassign, setReassign] = useState<AgentRow | null>(null);
  const assign = useAssignShipment();
  const [assignTo, setAssignTo] = useState<Record<number, string>>({});
  const data = q.data;
  const activeAgents = data?.agents.filter((a) => a.is_active) ?? [];
  return (
    <Frame title="إشراف المندوبين" description="المندوبون ومناوباتهم، الشحنات الجديدة بلا إسناد، وآخر حركات التراجع في العهدة." testId="supervisor">
      {q.isLoading ? <Skeleton className="h-64" /> : q.error || !data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <>
          <section aria-label="المندوبون" className="flex flex-col gap-2">
            <h2 className="text-base font-medium">المندوبون</h2>
            <ul className="divide-y divide-border/60 surface-card overflow-hidden">
              {data.agents.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:gap-6" data-testid="agent-row" data-agent={a.id}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("font-medium", !a.is_active && "text-muted-foreground")}>{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.open_shift ? (
                        <>
                          مناوبة مفتوحة منذ <Mono>{formatDateTime(a.open_shift.started_at)}</Mono>
                          {a.open_shift.vehicle_ref ? <> · {a.open_shift.vehicle_ref}</> : null}
                        </>
                      ) : a.is_active ? (
                        "بلا مناوبة مفتوحة"
                      ) : (
                        "معطّل"
                      )}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    شحنات مفتوحة <Mono className="text-foreground" data-testid="agent-open">{a.open_shipments}</Mono>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    العهدة <Mono className="text-foreground" data-testid="agent-balance">{a.display_balance}</Mono>
                  </span>
                  <button type="button" className={dangerButton} onClick={() => setReassign(a)} disabled={activeAgents.filter((x) => x.id !== a.id).length === 0} data-testid="reassign-open">
                    إعادة إسناد طارئة
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="بلا إسناد" className="flex flex-col gap-2">
            <h2 className="text-base font-medium">
              شحنات جديدة بلا إسناد <Mono className="text-sm text-muted-foreground">{data.unassigned_new_orders.length}</Mono>
            </h2>
            {data.unassigned_new_orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">كل الشحنات مُسنَدة.</p>
            ) : (
              <ul className="divide-y divide-border/60 surface-card overflow-hidden">
                {data.unassigned_new_orders.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:gap-4" data-testid="unassigned-row">
                    <Link href={`/dashboard/shipping/sharwa-ship/${s.id}`} className="hover:underline">
                      <Mono>{s.waybill_number}</Mono>
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-sm">{s.customer_name}</span>
                    <ShipmentStatusText status={s.status} />
                    <span className="flex items-center gap-2">
                      <NativeSelect aria-label="المندوب" className="h-11 lg:h-8" value={assignTo[s.id] ?? ""} onChange={(e) => setAssignTo({ ...assignTo, [s.id]: e.target.value })} data-testid="assign-agent">
                        <option value="">اختر مندوباً</option>
                        {activeAgents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </NativeSelect>
                      <button
                        type="button"
                        className={outlineButton}
                        disabled={!assignTo[s.id] || assign.isPending}
                        onClick={() => assign.mutate({ id: s.id, agent_id: Number(assignTo[s.id]) }, { onSuccess: () => toast.success("أُسندت الشحنة."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الإسناد.") })}
                        data-testid="assign-submit"
                      >
                        إسناد
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="حركات التراجع" className="flex flex-col gap-2">
            <h2 className="text-base font-medium">آخر حركات التراجع في العهدة</h2>
            {data.reversals.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا حركات تراجع.</p>
            ) : (
              <ul className="divide-y divide-border/60 surface-card text-sm overflow-hidden">
                {data.reversals.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5" data-testid="reversal-row">
                    <span className="text-warning">{CUSTODY_LABELS[r.entry_type]}</span>
                    <Mono>
                      {r.sign === "-" ? "−" : "+"}
                      {r.display_amount}
                    </Mono>
                    <span>{r.agent_name}</span>
                    {r.related_shipment?.waybill_number ? <Mono className="text-xs text-muted-foreground">{r.related_shipment.waybill_number}</Mono> : null}
                    {r.reverses ? <span className="text-xs text-muted-foreground">يعكس الحركة <Mono>#{r.reverses}</Mono></span> : null}
                    <span className="text-xs text-muted-foreground">{r.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <ReassignDialog agent={reassign} agents={activeAgents} onClose={() => setReassign(null)} />
    </Frame>
  );
}

function ReassignDialog({ agent, agents, onClose }: { agent: AgentRow | null; agents: AgentRow[]; onClose: () => void }) {
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutate = useEmergencyReassign();
  const close = () => {
    setTarget("");
    setError(null);
    onClose();
  };
  async function confirm() {
    if (!agent) return;
    setError(null);
    try {
      const r = await mutate.mutateAsync({ agentId: agent.id, new_agent_id: Number(target) });
      toast.success(r.detail);
      close();
    } catch (err) {
      setError(isApiError(err) ? (err.fields?.new_agent_id?.[0] ?? err.userMessage) : "تعذّرت إعادة الإسناد.");
    }
  }
  return (
    <Dialog open={agent !== null} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="sm:max-w-md" data-testid="reassign-dialog">
        <DialogTitle>إعادة إسناد طارئة</DialogTitle>
        {agent ? (
          <DialogDescription data-testid="reassign-summary">
            ستنتقل <Mono className="text-foreground">{agent.open_shipments}</Mono> شحنة مفتوحة وعهدة بقيمة <Mono className="text-foreground">{agent.display_balance}</Mono> من «{agent.name}» إلى المندوب الذي تختاره.
          </DialogDescription>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          المندوب الجديد
          <NativeSelect className="h-11 lg:h-9" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="reassign-target">
            <option value="">اختر مندوباً</option>
            {agents
              .filter((a) => a.id !== agent?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </NativeSelect>
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive" data-testid="reassign-error">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <button type="button" className={outlineButton} onClick={close}>
            إلغاء
          </button>
          <button type="button" className={primaryButton} disabled={mutate.isPending} onClick={() => void confirm()} data-testid="reassign-confirm">
            تأكيد النقل
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── agent shifts ─────────────────────────────────────────────────────────────────────
export function AgentShiftsScreen() {
  return (
    <Gate ownerOnly courier>
      <Shifts />
    </Gate>
  );
}

function Shifts() {
  const q = useAgentShifts();
  return (
    <Frame title="مناوبات المندوبين" description="كل مناوبة بوقت بدئها وانتهائها، ولمن سُلِّمت العهدة." testId="agent-shifts">
      {q.isLoading ? <Skeleton className="h-40" /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.results.length ? (
        <EmptyState title="لا مناوبات بعد" />
      ) : (
        <div className="overflow-x-auto surface-card">
          <table className={tableClass}>
            <caption className="sr-only">المناوبات</caption>
            <thead>
              <tr>
                <th className={th}>المناوبة</th>
                <th className={th}>المندوب</th>
                <th className={th}>المركبة</th>
                <th className={th}>البدء</th>
                <th className={th}>الانتهاء</th>
                <th className={th}>سُلِّمت إلى</th>
              </tr>
            </thead>
            <tbody>
              {q.data.results.map((s) => (
                <tr key={s.id} data-testid="shift-row">
                  <td className={td}>
                    <Mono>#{s.id}</Mono>
                  </td>
                  <td className={td}>{s.agent_name}</td>
                  <td className={cn(td, "text-muted-foreground")}>{s.vehicle_ref || "—"}</td>
                  <td className={td}>
                    <Mono className="text-xs">{formatDateTime(s.started_at)}</Mono>
                  </td>
                  <td className={td}>{s.ended_at ? <Mono className="text-xs">{formatDateTime(s.ended_at)}</Mono> : <span className="text-success">مفتوحة</span>}</td>
                  <td className={td}>{s.handed_over_to_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}
