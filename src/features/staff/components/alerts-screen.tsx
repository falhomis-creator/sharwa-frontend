"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { AccessGate } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { FilterBar, FilterSelect, StatStrip } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { ALERT_TYPE_LABELS, type BehaviorAlert } from "@/features/staff/schemas";
import { useAlerts, useStaffCounters, useStaffWrites } from "@/features/staff/api";

const LEVELS = ["warning", "critical"] as const;
const LEVEL_LABELS = { warning: "تحذير", critical: "حرج" } as const;

/**
 * `/dashboard/staff/alerts` (M18 US-18.6.3, T113): behaviour alerts — level, type, member,
 * value vs limit — with «تعليم كمقروء» and a link to the member's sessions tab.
 */
export function AlertsScreen() {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view">
      <AlertsList />
    </AccessGate>
  );
}

function AlertsList() {
  const [filters, setFilters] = useQueryStates({ level: parseAsStringLiteral(LEVELS), unread: parseAsBoolean.withDefault(false) }, { history: "replace" });
  const query = useAlerts({ level: filters.level ?? undefined, unread: filters.unread ? "true" : undefined });
  const counters = useStaffCounters();
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage");
  const writes = useStaffWrites();
  const [now] = useState(() => new Date());

  const markRead = (a: BehaviorAlert) => void writes.readAlert.mutateAsync(a.id).then(() => toast.success("عُلِّم كمقروء."), (e: unknown) => toast.error(isApiError(e) ? e.userMessage : "تعذّر التعليم."));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="تنبيهات السلوك" description="أنماط غير معتادة من الموظفين: تصدير كثيف، تصفّح واسع لبيانات العملاء، رسائل كثيرة." />
      <div className="flex flex-col gap-3">
        <StatStrip
          label="التنبيهات"
          items={[
            { key: "all", label: "الكل", count: query.data && !filters.unread && !filters.level ? query.data.count : undefined, active: !filters.unread, onSelect: () => void setFilters({ unread: false }) },
            { key: "unread", label: "غير مقروء", count: counters.data?.unread_alerts, active: filters.unread, onSelect: () => void setFilters({ unread: true }), tone: "warning" },
          ]}
        />
        <FilterBar activeCount={filters.level ? 1 : 0} onClear={() => void setFilters({ level: null })}>
          <FilterSelect label="المستوى" value={filters.level ?? ""} onChange={(v) => void setFilters({ level: (v || null) as (typeof LEVELS)[number] | null })} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))} />
        </FilterBar>
      </div>
      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState title="لا تنبيهات" description={filters.level || filters.unread ? "لا تنبيهات بهذه الفلاتر." : "عندما يتجاوز موظف حدّاً من حدود السلوك، يظهر التنبيه هنا."} />
      ) : (
        <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="alerts-list">
          {query.data.results.map((a) => (
            <li key={a.id} className={cn("flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:justify-between", a.is_read && "text-muted-foreground")} data-testid={`alert-${a.id}`}>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn("inline-flex items-center gap-1.5", a.level === "critical" ? "text-destructive" : "text-warning")}>
                    <span aria-hidden className={cn("size-1.5 rounded-full", a.level === "critical" ? "bg-destructive" : "bg-warning")} />
                    {LEVEL_LABELS[a.level]}
                  </span>
                  <span className={cn("font-medium", a.is_read && "font-normal")}>{ALERT_TYPE_LABELS[a.alert_type]}</span>
                  {!a.is_read ? <span className="text-xs text-muted-foreground">جديد</span> : null}
                </span>
                <span className="text-sm">
                  {a.staff_terminated ? (
                    <span className="text-muted-foreground">
                      {a.staff_name} <span className="ms-1 rounded border border-border px-1 text-[11px]">مُنهى</span>
                    </span>
                  ) : (
                    <Link href={`/dashboard/staff/${a.staff_id}?tab=sessions`} className="underline-offset-4 hover:underline">
                      {a.staff_name}
                    </Link>
                  )}
                  <span className="text-muted-foreground">
                    {" "}
                    · <Mono>{a.value}</Mono> من حد <Mono>{a.limit}</Mono> · {formatRelative(a.created_at, now)}
                  </span>
                </span>
              </div>
              {a.staff_terminated ? null : (
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={`/dashboard/staff/${a.staff_id}?tab=sessions`} className="inline-flex h-11 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground lg:h-8">
                    الجلسات
                  </Link>
                  {!a.is_read ? (
                    <button type="button" className="h-11 rounded-md border border-border px-2.5 text-xs hover:bg-muted disabled:opacity-50 lg:h-8" disabled={!canManage || writes.readAlert.isPending} title={canManage ? undefined : "تحتاج صلاحية إدارة الموظفين"} onClick={() => markRead(a)} data-testid={`read-${a.id}`}>
                      تعليم كمقروء
                    </button>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
