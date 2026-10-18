"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import type { StaffMember } from "@/features/staff/schemas";
import { useAssignments, useEffectivePermissions, useOverrides, usePermissions, useStaffWrites } from "@/features/staff/api";
import { primaryButton } from "@/features/staff/components/bits";

/**
 * «الاستثناءات» (FR-18.07): per-member allow/deny overrides on top of the role, and the
 * resulting «الصلاحية النهائية» per key, computed by the server for a chosen location.
 */
export function OverridesTab({ staff }: { staff: StaffMember }) {
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage") && staff.status !== "terminated";
  const permissions = usePermissions();
  const overrides = useOverrides(staff.id);
  const assignments = useAssignments(staff.id);
  const writes = useStaffWrites();
  const [locationId, setLocationId] = useState<number | null>(null);
  const effective = useEffectivePermissions(staff.id, locationId);
  const [code, setCode] = useState("");
  const [allow, setAllow] = useState("true");

  const byCategory = useMemo(() => {
    const map = new Map<string, Array<{ code: string; name: string }>>();
    for (const p of permissions.data ?? []) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return map;
  }, [permissions.data]);
  const effMap = useMemo(() => new Map((effective.data ?? []).map((e) => [e.code, e])), [effective.data]);
  const nameOf = (c: string) => permissions.data?.find((p) => p.code === c)?.name ?? c;

  if (permissions.isPending || overrides.isPending) return <Skeleton className="h-40 w-full" />;
  if (permissions.error || overrides.error) return <ErrorState error={permissions.error ?? overrides.error} onRetry={() => void (permissions.refetch(), overrides.refetch())} />;

  const add = async () => {
    if (!code) return;
    try {
      await writes.addOverride.mutateAsync({ id: staff.id, body: { permission_code: code, allow: allow === "true" } });
      setCode("");
      toast.success("أُضيف الاستثناء.");
    } catch (e) {
      toast.error(isApiError(e) ? (e.firstFieldMessage ?? e.userMessage) : "تعذّر الحفظ.");
    }
  };

  const rows = overrides.data ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="flex flex-col gap-4" aria-labelledby="ov-heading">
        <h2 id="ov-heading" className="text-base font-medium">
          الاستثناءات <Mono className="text-sm text-muted-foreground">{rows.length}</Mono>
        </h2>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">لا استثناءات — صلاحياته من الدور فقط.</p> : null}
        <ul className="divide-y divide-border rounded-lg border border-border empty:hidden">
          {rows.map((o) => (
            <li key={o.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5 text-sm" data-testid={`override-${o.id}`}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{nameOf(o.permission_code)}</span>
                <Mono className="text-xs text-muted-foreground">{o.permission_code}</Mono>
              </div>
              <span className={cn("shrink-0 text-xs", o.allow ? "text-success" : "text-destructive")}>{o.allow ? "منح" : "حجب"}</span>
              <button
                type="button"
                className="h-11 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 lg:h-8"
                disabled={!canManage}
                onClick={() => void writes.removeOverride.mutateAsync({ id: staff.id, oid: o.id }).then(() => toast.success("أُزيل الاستثناء."), (e: unknown) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."))}
              >
                إزالة
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <p className="text-sm font-medium">إضافة استثناء</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <NativeSelect aria-label="الصلاحية" value={code} onChange={(e) => setCode(e.target.value)} disabled={!canManage} className="h-11 flex-1 lg:h-8" data-testid="override-code">
              <option value="">— اختر صلاحية —</option>
              {[...byCategory.entries()].map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="النوع" value={allow} onChange={(e) => setAllow(e.target.value)} disabled={!canManage} className="h-11 sm:w-28 lg:h-8" data-testid="override-allow">
              <option value="true">منح</option>
              <option value="false">حجب</option>
            </NativeSelect>
            <button type="button" className={primaryButton} disabled={!canManage || !code || writes.addOverride.isPending} title={canManage ? undefined : "تحتاج صلاحية إدارة الموظفين"} onClick={() => void add()} data-testid="override-add">
              إضافة
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="eff-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="eff-heading" className="text-base font-medium">
            الصلاحية النهائية
          </h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            الموقع
            <NativeSelect value={locationId ?? ""} onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)} className="h-11 lg:h-8" aria-label="الموقع">
              <option value="">كل المواقع</option>
              {(assignments.data ?? []).map((a) => (
                <option key={a.location_id} value={a.location_id}>
                  {a.location_name}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        {effective.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : effective.error ? (
          <ErrorState error={effective.error} onRetry={() => void effective.refetch()} />
        ) : (
          <div className="flex flex-col gap-4" data-testid="effective-permissions">
            {[...byCategory.entries()].map(([cat, list]) => (
              <div key={cat}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{cat}</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {list.map((p) => {
                    const e = effMap.get(p.code);
                    const on = e?.effective ?? false;
                    return (
                      <li key={p.code} className="flex min-h-9 items-center justify-between gap-3 px-3 py-1 text-sm">
                        <span className="flex items-center gap-2">
                          <span aria-hidden className={cn("size-1.5 rounded-full", on ? "bg-success" : "bg-border")} />
                          <span className={cn(!on && "text-muted-foreground")}>{p.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {e?.override === true ? "منح باستثناء" : e?.override === false ? "حجب باستثناء" : e?.from_role ? "من الدور" : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
