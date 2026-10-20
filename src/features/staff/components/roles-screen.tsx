"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { AccessGate } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { usePermissions, useRoles } from "@/features/staff/api";
import { outlineButton, primaryButton } from "@/features/staff/components/bits";

/**
 * `/dashboard/staff/roles` (M18 US-18.3, T112): the four system roles read-only — each with
 * «نسخ كدور مخصص» — then the store's custom roles.
 */
export function RolesScreen() {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view">
      <RolesList />
    </AccessGate>
  );
}

function RolesList() {
  const router = useRouter();
  const roles = useRoles();
  const permissions = usePermissions();
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage_roles");
  const total = permissions.data?.length ?? 35;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الأدوار والصلاحيات"
        description="الأدوار النظامية ثابتة؛ انسخ أحدها لتبدأ دوراً مخصصاً بصلاحيات متجرك."
        actions={
          <>
            <Link href="/dashboard/staff" className={outlineButton}>
              الموظفون
            </Link>
            <button type="button" className={primaryButton} disabled={!canManage} title={canManage ? undefined : "تحتاج صلاحية إدارة الأدوار"} onClick={() => router.push("/dashboard/staff/roles/new")} data-testid="new-role">
              <Plus className="size-4" aria-hidden /> دور مخصص
            </button>
          </>
        }
      />
      {roles.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : roles.error ? (
        <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />
      ) : (
        <>
          <Section title="الأدوار النظامية" hint="للقراءة فقط">
            {roles.data.filter((r) => r.is_system_role).map((r) => (
              <RoleRow key={r.id} id={r.id} name={r.name} count={r.permission_codes.length} total={total} members={r.members_count} maxDiscount={r.max_discount_percent} system canManage={canManage} />
            ))}
          </Section>
          <Section title="الأدوار المخصصة" hint={roles.data.some((r) => !r.is_system_role) ? undefined : "لا أدوار مخصصة بعد — انسخ دوراً نظامياً أو أنشئ واحداً."}>
            {roles.data.filter((r) => !r.is_system_role).map((r) => (
              <RoleRow key={r.id} id={r.id} name={r.name} count={r.permission_codes.length} total={total} members={r.members_count} maxDiscount={r.max_discount_percent} canManage={canManage} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-medium">{title}</h2>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <ul className="divide-y divide-border/60 surface-card empty:hidden overflow-hidden" data-testid={`roles-${title}`}>
        {children}
      </ul>
    </section>
  );
}

function RoleRow({ id, name, count, total, members, maxDiscount, system, canManage }: { id: number; name: string; count: number; total: number; members: number; maxDiscount: string | null; system?: boolean; canManage: boolean }) {
  return (
    <li className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2" data-testid={`role-${id}`}>
      <div className="flex min-w-0 flex-col">
        <Link href={`/dashboard/staff/roles/${id}`} className="font-medium hover:underline">
          {name}
        </Link>
        <span className="text-xs text-muted-foreground">
          <Mono>{count}</Mono> من <Mono>{total}</Mono> صلاحية · <Mono>{members}</Mono> {members === 1 ? "موظف" : "موظفين"}
          {maxDiscount ? (
            <>
              {" "}
              · أقصى خصم <Mono>{Number(maxDiscount)}%</Mono>
            </>
          ) : null}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {system ? (
          <Link href={`/dashboard/staff/roles/new?from=${id}`} aria-disabled={!canManage} className={`${outlineButton} ${canManage ? "" : "pointer-events-none opacity-50"}`} title={canManage ? undefined : "تحتاج صلاحية إدارة الأدوار"} data-testid={`clone-${id}`}>
            نسخ كدور مخصص
          </Link>
        ) : (
          <Link href={`/dashboard/staff/roles/${id}`} className={outlineButton}>
            {canManage ? "تعديل" : "عرض"}
          </Link>
        )}
      </div>
    </li>
  );
}
