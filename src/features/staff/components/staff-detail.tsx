"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ArrowLeft, KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { AccessGate } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStaffMember, useStaffWrites } from "@/features/staff/api";
import { PasswordOnceDialog } from "@/features/staff/components/password-dialog";
import { Phone, StatusText, outlineButton } from "@/features/staff/components/bits";
import { StaffFormSheet } from "@/features/staff/components/staff-form-sheet";
import { AssignmentsTab } from "@/features/staff/components/assignments-tab";
import { OverridesTab } from "@/features/staff/components/overrides-tab";
import { SessionsTab } from "@/features/staff/components/sessions-tab";
import { RosterTab } from "@/features/staff/components/roster-tab";

export const STAFF_TABS = ["assignments", "overrides", "sessions", "roster"] as const;
export type StaffTab = (typeof STAFF_TABS)[number];
const TAB_LABELS: Record<StaffTab, string> = { assignments: "التعيينات", overrides: "الاستثناءات", sessions: "الجلسات والأجهزة", roster: "الجدول" };

/** `/dashboard/staff/[id]` (M18 US-18.2/18.4, T112): the member with tab in the URL. */
export function StaffDetailScreen({ id }: { id: number }) {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view">
      <StaffDetail id={id} />
    </AccessGate>
  );
}

function StaffDetail({ id }: { id: number }) {
  const query = useStaffMember(id);
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage");
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(STAFF_TABS).withDefault("assignments").withOptions({ history: "replace" }));
  const [editOpen, setEditOpen] = useState(false);
  const writes = useStaffWrites();
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const [now] = useState(() => new Date());
  const staff = query.data;

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.error || !staff) return <ErrorState error={query.error} onRetry={() => void query.refetch()} title={isApiError(query.error) && query.error.status === 404 ? "الموظف غير موجود" : undefined} />;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/staff" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> كل الموظفين
      </Link>
      <PageHeader
        eyebrow={`#${staff.id}`}
        title={staff.full_name}
        description={staff.roles_summary || "بلا تعيين — لن يستطيع الدخول إلى أي موقع."}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={outlineButton}
              disabled={!canManage || staff.status === "terminated" || writes.resetPassword.isPending}
              title={canManage ? "تُبطل كلمة المرور الحالية وكل الجلسات" : "تحتاج صلاحية إدارة الموظفين"}
              onClick={() =>
                writes.resetPassword.mutate(staff.id, {
                  onSuccess: (r) => setIssued({ name: staff.full_name, password: r.temporary_password }),
                  onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر إصدار كلمة المرور."),
                })
              }
              data-testid="reset-password"
            >
              <KeyRound className="size-4" aria-hidden /> كلمة مرور مؤقتة جديدة
            </button>
            <button type="button" className={outlineButton} disabled={!canManage || staff.status === "terminated"} title={canManage ? undefined : "تحتاج صلاحية إدارة الموظفين"} onClick={() => setEditOpen(true)} data-testid="edit-staff">
              <Pencil className="size-4" aria-hidden /> تعديل
            </button>
          </div>
        }
      />
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">الهاتف</dt>
          <dd>
            <Phone phone={staff.phone} />
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">الحالة</dt>
          <dd>
            <StatusText status={staff.status} />
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">آخر نشاط</dt>
          <dd>{staff.last_seen_at ? formatRelative(staff.last_seen_at, now) : "—"}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">إصدار الرمز</dt>
          <dd>
            <Mono>{staff.token_version}</Mono>
          </dd>
        </div>
        {staff.terminated_at ? (
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">أُنهيت الخدمة</dt>
            <dd>{formatDateTime(staff.terminated_at)}</dd>
          </div>
        ) : null}
        {staff.enforce_ip_whitelist ? <dd className="text-warning">مقيَّد بعناوين IP</dd> : null}
        {staff.enforce_roster_schedule ? <dd className="text-muted-foreground">ملتزم بجدول العمل</dd> : null}
      </dl>

      <Tabs value={tab} onValueChange={(v) => void setTab(v as StaffTab)} className="min-w-0">
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <TabsList variant="line" className="h-11 border-b border-border lg:h-9" aria-label="أقسام الموظف">
            {STAFF_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="min-h-11 px-3 lg:min-h-8" data-testid={`staff-tab-${t}`}>
                {TAB_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="assignments" className="min-w-0 pt-4">
          <AssignmentsTab staff={staff} />
        </TabsContent>
        <TabsContent value="overrides" className="min-w-0 pt-4">
          <OverridesTab staff={staff} />
        </TabsContent>
        <TabsContent value="sessions" className="min-w-0 pt-4">
          <SessionsTab staff={staff} />
        </TabsContent>
        <TabsContent value="roster" className="min-w-0 pt-4">
          <RosterTab staff={staff} />
        </TabsContent>
      </Tabs>

      <StaffFormSheet open={editOpen} onOpenChange={setEditOpen} staff={staff} />
      <PasswordOnceDialog issued={issued} onClose={() => setIssued(null)} />
    </div>
  );
}
