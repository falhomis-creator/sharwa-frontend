"use client";

import { useState } from "react";
import { Mono } from "@/components/shared/mono";
import { inputClass, numericInputClass } from "@/components/shared/field";
import { formatDateTime } from "@/lib/format";
import { useInvalidateCourier, useMe } from "@/features/courier/api";
import { ActionBar, OfflineNote, primaryAction, secondaryAction } from "@/features/courier/components/shell";
import { dispatch } from "@/features/courier/queue";
import { endShiftSchema, startShiftSchema } from "@/features/courier/schemas";

/**
 * `/agent` (M38 US-38.1): the open shift or «ابدأ المناوبة», the custody balance as the
 * server writes it, end or hand over. A handover to oneself is refused locally (§8).
 */
export function ShiftScreen() {
  const me = useMe();
  const invalidate = useInvalidateCourier();
  const [vehicle, setVehicle] = useState("");
  const [mode, setMode] = useState<"idle" | "handover">("idle");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const snap = me.data;
  if (!snap) return null;
  const { agent, open_shift, display_balance } = snap.data;

  async function start() {
    setBusy(true);
    setError(null);
    setNote(null);
    const r = await dispatch({ kind: "shift_start", endpoint: "/api/v1/agent/shifts/start/", payload: vehicle.trim() ? { vehicle_ref: vehicle.trim() } : {}, label: "بدء المناوبة", shipment_id: null });
    setBusy(false);
    if (!r.sent) return setNote("بلا شبكة — سيبدأ تسجيل المناوبة عند عودة الاتصال.");
    if (!r.ok) return setError(r.message);
    const parsed = startShiftSchema.safeParse(r.data);
    setNote(parsed.success && parsed.data.closed_previous_shift_id ? "أُغلقت المناوبة السابقة تلقائياً وبدأت مناوبة جديدة." : "بدأت المناوبة.");
    void invalidate();
  }

  async function end(handover: boolean) {
    if (!open_shift) return;
    setError(null);
    setNote(null);
    const newAgent = handover ? Number(target) : null;
    if (handover) {
      if (!Number.isInteger(newAgent) || !newAgent) return setError("أدخل رقم المندوب المستلم.");
      if (newAgent === agent.id) return setError("لا يمكنك تسليم العهدة لنفسك.");
    }
    setBusy(true);
    const r = await dispatch({ kind: "shift_end", endpoint: "/api/v1/agent/shifts/end-and-handover/", payload: { shift_id: open_shift.id, ...(handover ? { new_agent_id: newAgent } : {}) }, label: handover ? "تسليم المناوبة" : "إنهاء المناوبة", shipment_id: null });
    setBusy(false);
    if (!r.sent) return setNote("بلا شبكة — سيُرسل الإنهاء عند عودة الاتصال.");
    if (!r.ok) return setError(r.message);
    const parsed = endShiftSchema.safeParse(r.data);
    if (parsed.success && "new_shift_id" in parsed.data) setNote(`سُلِّمت المناوبة إلى «${parsed.data.handed_over_to.name}» (مناوبة #${parsed.data.new_shift_id}) — العهدة المنقولة ${parsed.data.balance}.`);
    else if (parsed.success && "ended_at" in parsed.data) setNote(`انتهت المناوبة ${formatDateTime(parsed.data.ended_at)}.`);
    setMode("idle");
    setTarget("");
    void invalidate();
  }

  return (
    <div className="flex flex-col gap-4" data-testid="shift-screen">
      <OfflineNote snap={snap} />
      <section className="flex flex-col gap-1 rounded-lg border border-border p-4" aria-label="العهدة">
        <span className="text-xs text-muted-foreground">رصيد العهدة</span>
        <Mono className="text-3xl font-medium" data-testid="balance">
          {display_balance}
        </Mono>
      </section>
      {open_shift ? (
        <section className="flex flex-col gap-1 rounded-lg border border-border p-4" aria-label="المناوبة" data-testid="open-shift">
          <span className="text-base font-medium">مناوبة مفتوحة</span>
          <span className="text-sm text-muted-foreground">
            رقم <Mono className="text-foreground">#{open_shift.id}</Mono> · منذ <Mono className="text-foreground">{formatDateTime(open_shift.started_at)}</Mono>
          </span>
          {open_shift.vehicle_ref ? <span className="text-sm text-muted-foreground">المركبة: {open_shift.vehicle_ref}</span> : null}
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4" aria-label="لا مناوبة" data-testid="no-shift">
          <p className="text-base font-medium">لا مناوبة مفتوحة</p>
          <p className="text-sm text-muted-foreground">ابدأ مناوبتك لتظهر شحناتك وتُسجَّل تحصيلاتك.</p>
          <label className="flex flex-col gap-1.5 text-sm">
            مرجع المركبة (اختياري)
            <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={`${inputClass} h-12`} maxLength={50} data-testid="vehicle-ref" />
          </label>
        </section>
      )}
      {mode === "handover" && open_shift ? (
        <label className="flex flex-col gap-1.5 text-sm">
          رقم المندوب المستلم
          <input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} className={`${numericInputClass} h-12`} data-testid="handover-target" />
        </label>
      ) : null}
      {note ? (
        <p role="status" className="text-sm" data-testid="shift-note">
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive" data-testid="shift-error">
          {error}
        </p>
      ) : null}
      <ActionBar>
        {open_shift ? (
          mode === "handover" ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={secondaryAction} onClick={() => setMode("idle")}>
                رجوع
              </button>
              <button type="button" className={primaryAction} disabled={busy} onClick={() => void end(true)} data-testid="handover-confirm">
                تسليم
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={secondaryAction} disabled={busy} onClick={() => setMode("handover")} data-testid="handover-open">
                تسليم إلى مندوب آخر
              </button>
              <button type="button" className={primaryAction} disabled={busy} onClick={() => void end(false)} data-testid="end-shift">
                إنهاء المناوبة
              </button>
            </div>
          )
        ) : (
          <button type="button" className={primaryAction} disabled={busy} onClick={() => void start()} data-testid="start-shift">
            ابدأ المناوبة
          </button>
        )}
      </ActionBar>
    </div>
  );
}
