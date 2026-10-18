"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { inputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { WEEKDAY_LABELS, type RosterEntry, type StaffMember } from "@/features/staff/schemas";
import { useRoster, useStaffWrites } from "@/features/staff/api";
import { outlineButton, primaryButton } from "@/features/staff/components/bits";

/** «الجدول» (FR-18.08 RosterSchedule): a weekly grid, 0 = الأحد; an empty day means no access that day. */
export function RosterTab({ staff }: { staff: StaffMember }) {
  const query = useRoster(staff.id);
  const writes = useStaffWrites();
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage") && staff.status !== "terminated";
  const [draft, setDraft] = useState<RosterEntry[] | null>(null);

  if (query.isPending) return <Skeleton className="h-64 w-full" />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const rows = draft ?? query.data;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(query.data);
  const update = (weekday: number, patch: Partial<RosterEntry>) => setDraft(rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  const save = async () => {
    try {
      await writes.putRoster.mutateAsync({ id: staff.id, rows });
      setDraft(null);
      toast.success("حُفظ الجدول.");
    } catch (e) {
      toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  };
  const workDays = rows.filter((r) => r.from && r.to).length;

  return (
    <div className="flex flex-col gap-4" data-testid="roster-grid">
      {staff.enforce_roster_schedule ? (
        <p className="text-sm text-muted-foreground">
          الدخول مقيَّد بهذه الأوقات. {workDays === 0 ? <span className="text-warning">الجدول فارغ — لن يستطيع الدخول في أي يوم.</span> : `${workDays} أيام عمل في الأسبوع.`}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">الجدول للعرض فقط — «الالتزام بجدول العمل» غير مفعَّل لهذا الموظف، فلا يقيّد الدخول.</p>
      )}
      <ul className="rounded-lg border border-border">
        {rows.map((r) => (
          <li key={r.weekday} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2.5 last:border-0 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:py-1.5">
            <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1">
              <span className="font-medium">{WEEKDAY_LABELS[r.weekday]}</span>
              <button type="button" className="h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 sm:hidden" disabled={!canManage || (!r.from && !r.to)} onClick={() => update(r.weekday, { from: null, to: null })}>
                إجازة
              </button>
            </div>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground sm:sr-only">من</span>
              <input type="time" aria-label={`بداية ${WEEKDAY_LABELS[r.weekday]}`} dir="ltr" value={r.from ?? ""} disabled={!canManage} className={`${inputClass} font-mono`} onChange={(e) => update(r.weekday, { from: e.target.value || null })} />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground sm:sr-only">إلى</span>
              <input type="time" aria-label={`نهاية ${WEEKDAY_LABELS[r.weekday]}`} dir="ltr" value={r.to ?? ""} disabled={!canManage} className={`${inputClass} font-mono`} onChange={(e) => update(r.weekday, { to: e.target.value || null })} />
            </label>
            <button type="button" className="hidden h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 sm:block lg:h-8" disabled={!canManage || (!r.from && !r.to)} onClick={() => update(r.weekday, { from: null, to: null })}>
              إجازة
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <button type="button" className={outlineButton} disabled={!dirty} onClick={() => setDraft(null)}>
          تراجع
        </button>
        <button type="button" className={primaryButton} disabled={!dirty || writes.putRoster.isPending} onClick={() => void save()} data-testid="save-roster">
          حفظ الجدول
        </button>
      </div>
    </div>
  );
}
