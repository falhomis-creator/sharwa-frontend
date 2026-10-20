"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { isApiError } from "@/lib/api-error";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { LOCATION_ROLES, LOCATION_ROLE_LABELS, type Assignment, type LocationRole, type StaffMember } from "@/features/staff/schemas";
import { useAssignments, useRoles, useStaffWrites } from "@/features/staff/api";
import { outlineButton, primaryButton } from "@/features/staff/components/bits";

/**
 * «التعيينات» (FR-18.02, US-18.2): one row per location; columns = the permission role
 * (StaffLocationRole) and the operational role (LocationStaffAssignment, M22's array), plus
 * remove. Saved as one PUT so the matrix is replaced atomically.
 */
export function AssignmentsTab({ staff }: { staff: StaffMember }) {
  const query = useAssignments(staff.id);
  const roles = useRoles();
  const { canPermission } = useAccess();
  const canAssign = canPermission("staff.manage_assignments") && staff.status !== "terminated";
  const writes = useStaffWrites();
  const [draft, setDraft] = useState<Assignment[] | null>(null);

  if (query.isPending || roles.isPending) return <Skeleton className="h-40 w-full" />;
  if (query.error || roles.error) return <ErrorState error={query.error ?? roles.error} onRetry={() => void (query.refetch(), roles.refetch())} />;

  const rows = draft ?? query.data ?? [];
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(query.data);
  const assignedCount = rows.filter((r) => r.role_id !== null || r.location_role !== null).length;
  const update = (locationId: number, patch: Partial<Assignment>) => setDraft(rows.map((r) => (r.location_id === locationId ? { ...r, ...patch } : r)));

  const save = async () => {
    try {
      await writes.putAssignments.mutateAsync({ id: staff.id, rows: rows.map((r) => ({ location_id: r.location_id, role_id: r.role_id, location_role: r.location_role })) });
      setDraft(null);
      toast.success("حُفظت التعيينات.");
    } catch (e) {
      toast.error(isApiError(e) ? (e.firstFieldMessage ?? e.userMessage) : "تعذّر الحفظ.");
    }
  };

  if (rows.length === 0) return <EmptyState title="لا مواقع بعد" description="أضف موقعاً من «المواقع والفروع» ثم عيّن الموظف عليه." />;

  return (
    <div className="flex flex-col gap-4" data-testid="assignments-matrix">
      {assignedCount === 0 ? (
        <p role="status" className="text-sm text-warning" data-testid="no-assignment-warning">
          لن يستطيع الدخول إلى أي موقع — عيّن دوراً واحداً على الأقل.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          معيَّن على {assignedCount} من {rows.length} مواقع. الدور يحدّد الصلاحيات، والدور التشغيلي يحدّد ما يراه في الموقع.
        </p>
      )}
      <div className="surface-card">
        <div aria-hidden className="hidden h-10 items-center gap-3 border-b border-border px-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <span>الموقع</span>
          <span>دور الصلاحيات</span>
          <span>الدور التشغيلي</span>
          <span className="w-12" />
        </div>
        <ul>
          {rows.map((r) => (
            <li key={r.location_id} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 border-b border-border px-3 py-3 last:border-0 md:min-h-14 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:py-1.5" data-testid={`assignment-row-${r.location_id}`}>
              <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 md:col-span-1">
                <span className="truncate font-medium">
                  {r.location_name}
                  {!r.location_active ? <span className="ms-2 text-xs font-normal text-muted-foreground">غير نشط</span> : null}
                </span>
                <button
                  type="button"
                  className="h-11 shrink-0 whitespace-nowrap rounded-md px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 md:hidden"
                  disabled={!canAssign || (r.role_id === null && r.location_role === null)}
                  onClick={() => update(r.location_id, { role_id: null, location_role: null })}
                >
                  إزالة
                </button>
              </div>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground md:sr-only">دور الصلاحيات</span>
                <NativeSelect aria-label={`دور الصلاحيات في ${r.location_name}`} value={r.role_id ?? ""} disabled={!canAssign} className="h-11 w-full lg:h-8" onChange={(e) => update(r.location_id, { role_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— بلا دور —</option>
                  {(roles.data ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground md:sr-only">الدور التشغيلي</span>
                <NativeSelect aria-label={`الدور التشغيلي في ${r.location_name}`} value={r.location_role ?? ""} disabled={!canAssign} className="h-11 w-full lg:h-8" onChange={(e) => update(r.location_id, { location_role: (e.target.value || null) as LocationRole | null })}>
                  <option value="">— بلا —</option>
                  {LOCATION_ROLES.map((lr) => (
                    <option key={lr} value={lr}>
                      {LOCATION_ROLE_LABELS[lr]}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <button
                type="button"
                className="hidden h-11 w-12 whitespace-nowrap rounded-md px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 md:block lg:h-8"
                disabled={!canAssign || (r.role_id === null && r.location_role === null)}
                onClick={() => update(r.location_id, { role_id: null, location_role: null })}
              >
                إزالة
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-end gap-2">
        {!canAssign && staff.status !== "terminated" ? <span className="me-auto text-xs text-muted-foreground">تحتاج صلاحية إدارة التعيينات للتعديل.</span> : null}
        <button type="button" className={outlineButton} disabled={!dirty} onClick={() => setDraft(null)}>
          تراجع
        </button>
        <button type="button" className={primaryButton} disabled={!dirty || writes.putAssignments.isPending} onClick={() => void save()} data-testid="save-assignments">
          حفظ التعيينات
        </button>
      </div>
    </div>
  );
}
