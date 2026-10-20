"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useAssignStaff, useAssignments, useRemoveAssignment, useStaffOptions } from "@/features/locations/api";
import { LOCATION_ROLES, LOCATION_ROLE_LABELS, type LocationRole } from "@/features/locations/schemas";

/** US-22.6 — who works here, in which role. Assign from the staff list, remove in one tap. */
export function LocationStaffTab({ locationId, active }: { locationId: number; active: boolean }) {
  const id = useId();
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage_assignments");
  const assignments = useAssignments(locationId, active);
  const options = useStaffOptions(active && canManage);
  const assign = useAssignStaff(locationId);
  const remove = useRemoveAssignment(locationId);
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState<LocationRole>("cashier");

  if (assignments.isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (assignments.error && !assignments.data) return <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />;
  const rows = assignments.data ?? [];
  const assigned = new Set(rows.map((r) => r.staff_id));
  const free = (options.data ?? []).filter((o) => !assigned.has(o.id));

  return (
    <div className="flex flex-col gap-4" data-testid="location-staff">
      {canManage ? (
        <form
          className="flex flex-wrap items-end gap-2 surface-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!staffId) return;
            assign.mutate(
              { staff_id: Number(staffId), role },
              {
                onSuccess: (a) => {
                  toast.success(`أُسنِد ${a.staff.full_name}`);
                  setStaffId("");
                },
                onError: (err) => toast.error(isApiError(err) ? err.userMessage : "تعذّر الإسناد"),
              },
            );
          }}
        >
          <label htmlFor={`${id}-staff`} className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
            الموظف
            <NativeSelect id={`${id}-staff`} value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-11 md:h-8" data-testid="assign-staff">
              <option value="">اختر موظفاً</option>
              {free.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.full_name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label htmlFor={`${id}-role`} className="flex flex-col gap-1 text-xs">
            الدور
            <NativeSelect id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value as LocationRole)} className="h-11 md:h-8" data-testid="assign-role">
              {LOCATION_ROLES.map((r) => (
                <option key={r} value={r}>
                  {LOCATION_ROLE_LABELS[r]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <Button type="submit" className="h-11 lg:h-8" disabled={!staffId || assign.isPending} data-testid="assign-submit">
            إسناد
          </Button>
        </form>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="لا موظفين مسندين" description={canManage ? "أسند كاشيراً أو مديراً من القائمة أعلاه." : undefined} />
      ) : (
        <ul className="divide-y divide-border/60 surface-card overflow-hidden">
          {rows.map((a) => (
            <li key={a.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm" data-testid="assignment-row">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{a.staff.full_name}</span>
                <Mono className="text-xs text-muted-foreground">{a.staff.phone}</Mono>
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{LOCATION_ROLE_LABELS[a.role]}</span>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 px-2 lg:h-8"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(a.id, { onSuccess: () => toast.success("أُزيل الإسناد"), onError: (err) => toast.error(isApiError(err) ? err.userMessage : "تعذّرت الإزالة") })}
                  data-testid="assignment-remove"
                >
                  إزالة
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
