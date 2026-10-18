"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { STAFF_STATUSES, STAFF_STATUS_LABELS, type StaffMember } from "@/features/staff/schemas";
import { useStaffList, useStaffWrites } from "@/features/staff/api";
import { Phone, StatusText, dangerButton, outlineButton, primaryButton } from "@/features/staff/components/bits";
import { StaffFormSheet } from "@/features/staff/components/staff-form-sheet";

/**
 * `/dashboard/staff` (M18 US-18.1, T112): every member with roles/locations summary, status
 * as text + dot, last activity; the add sheet normalises the phone like the server
 * (FR-18.01); row actions «إنهاء الخدمة» (row stays, sessions revoked) and «إبطال كل الجلسات».
 */
export function StaffScreen() {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view">
      <StaffList />
    </AccessGate>
  );
}

const FILTERS = { q: parseAsString.withDefault(""), status: parseAsStringLiteral(STAFF_STATUSES) };

function StaffList() {
  const router = useRouter();
  const table = useTableUrlState();
  const [filters, setFilters] = useQueryStates(FILTERS, { history: "replace" });
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage");
  const writes = useStaffWrites();
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "terminate" | "revoke"; staff: StaffMember } | null>(null);
  const [now] = useState(() => new Date());

  const params = { q: filters.q || undefined, status: filters.status ?? undefined, page: table.page, page_size: table.pageSize };
  const query = useStaffList(params);
  const all = useStaffList({ page_size: 1 });
  const isFiltered = Boolean(filters.q || filters.status);
  const set = (patch: Partial<{ q: string; status: (typeof STAFF_STATUSES)[number] | null }>) => {
    void setFilters(patch);
    table.resetPage();
  };

  const run = async () => {
    if (!confirm) return;
    const { kind, staff } = confirm;
    try {
      if (kind === "terminate") {
        await writes.terminate.mutateAsync(staff.id);
        toast.success(`أُنهيت خدمة ${staff.full_name} وأُبطلت جلساتها.`);
      } else {
        const r = await writes.revokeSessions.mutateAsync(staff.id);
        toast.success(`أُبطلت كل جلسات ${staff.full_name} — يلزم تسجيل الدخول من جديد (إصدار ${r.token_version}).`);
      }
      setConfirm(null);
    } catch (e) {
      toast.error(isApiError(e) ? e.userMessage : "تعذّر تنفيذ الإجراء.");
    }
  };

  const columns = useMemo<ColumnDef<StaffMember, unknown>[]>(
    () => [
      {
        id: "name",
        header: headerLabel("الموظف"),
        cell: ({ row }) => (
          <Link href={`/dashboard/staff/${row.original.id}`} tabIndex={-1} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.full_name}
          </Link>
        ),
      },
      { id: "phone", header: headerLabel("الهاتف"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <Phone phone={row.original.phone} /> },
      {
        id: "roles",
        header: headerLabel("الأدوار والمواقع"),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.roles_summary || "بلا تعيين"}</span>,
      },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <StatusText status={row.original.status} /> },
      {
        id: "last_seen",
        header: headerLabel("آخر نشاط"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.last_seen_at ? formatRelative(row.original.last_seen_at, now) : "—"}</span>,
      },
      {
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-px" },
        header: headerLabel("إجراءات"),
        cell: ({ row }) => <RowActions staff={row.original} canManage={canManage} onAction={(kind) => setConfirm({ kind, staff: row.original })} />,
      },
    ],
    [canManage, now],
  );

  const counts = all.data?.count;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الموظفون"
        description="كل من يدخل لوحة متجرك: أدوارهم، مواقعهم، وجلساتهم."
        actions={
          <>
            <Link href="/dashboard/staff/roles" className={outlineButton}>
              الأدوار والصلاحيات
            </Link>
            <button type="button" className={primaryButton} disabled={!canManage} title={canManage ? undefined : "تحتاج صلاحية إدارة الموظفين"} onClick={() => setAddOpen(true)} data-testid="add-staff">
              <Plus className="size-4" aria-hidden /> إضافة موظف
            </button>
          </>
        }
      />
      <DataTable
        caption="الموظفون"
        testId="staff-table"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={isFiltered}
        onRowOpen={(r) => router.push(`/dashboard/staff/${r.id}`)}
        emptyState={
          <EmptyState
            title="لا موظفين بعد — أضف أول موظف برقم هاتفه"
            description="يدخل الموظف برقم هاتفه ورمز التحقق؛ صلاحياته تأتي من الدور المعيَّن له في كل موقع."
            action={
              canManage ? (
                <button type="button" className={primaryButton} onClick={() => setAddOpen(true)}>
                  إضافة موظف
                </button>
              ) : null
            }
          />
        }
        noResultsState={<EmptyState title="لا نتائج تطابق البحث" description="جرّب اسماً آخر أو جزءاً من رقم الهاتف." />}
        toolbar={
          <div className="flex flex-col gap-3">
            <StatStrip
              label="حالة الموظفين"
              items={[
                { key: "all", label: "الكل", count: counts, active: !filters.status, onSelect: () => set({ status: null }) },
                ...STAFF_STATUSES.map((s) => ({ key: s, label: STAFF_STATUS_LABELS[s], count: undefined, active: filters.status === s, onSelect: () => set({ status: s }) })),
              ]}
            />
            <FilterBar
              search={<SearchBox value={filters.q} onChange={(q) => set({ q })} placeholder="الاسم أو رقم الهاتف" />}
              activeCount={(filters.q ? 1 : 0) + (filters.status ? 1 : 0)}
              onClear={() => set({ q: "", status: null })}
            >
              <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => set({ status: (v || null) as (typeof STAFF_STATUSES)[number] | null })} options={STAFF_STATUSES.map((s) => ({ value: s, label: STAFF_STATUS_LABELS[s] }))} />
            </FilterBar>
          </div>
        }
        renderMobileCard={(r) => (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{r.full_name}</span>
              <StatusText status={r.status} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <Phone phone={r.phone} />
              <span>{r.last_seen_at ? formatRelative(r.last_seen_at, now) : "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">{r.roles_summary || "بلا تعيين"}</p>
          </div>
        )}
      />

      <StaffFormSheet open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="staff-confirm">
          <DialogTitle>{confirm?.kind === "terminate" ? `إنهاء خدمة ${confirm.staff.full_name}؟` : `إبطال كل جلسات ${confirm?.staff.full_name ?? ""}؟`}</DialogTitle>
          <DialogDescription>
            {confirm?.kind === "terminate"
              ? "يبقى السجل في القائمة للمراجعة، وتُبطل كل جلساته ورموزه فوراً. لا يمكن التراجع."
              : "سيُسجَّل خروجه من كل الأجهزة ويلزمه تسجيل الدخول من جديد."}
          </DialogDescription>
          <DialogFooter>
            <button type="button" className={outlineButton} onClick={() => setConfirm(null)}>
              إلغاء
            </button>
            <button type="button" className={confirm?.kind === "terminate" ? dangerButton : primaryButton} onClick={() => void run()} disabled={writes.terminate.isPending || writes.revokeSessions.isPending} data-testid="staff-confirm-ok">
              {confirm?.kind === "terminate" ? "إنهاء الخدمة" : "إبطال الجلسات"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowActions({ staff, canManage, onAction }: { staff: StaffMember; canManage: boolean; onAction: (kind: "terminate" | "revoke") => void }) {
  if (staff.status === "terminated") return <span className="text-xs text-muted-foreground whitespace-nowrap">مُنهى</span>;
  const reason = canManage ? undefined : "تحتاج صلاحية إدارة الموظفين";
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 lg:h-8" disabled={!canManage} title={reason} onClick={() => onAction("revoke")} data-testid={`revoke-${staff.id}`}>
        إبطال كل الجلسات
      </button>
      <button type="button" className="h-11 rounded-md px-2 text-xs text-destructive hover:bg-destructive/5 disabled:opacity-50 lg:h-8" disabled={!canManage} title={reason} onClick={() => onAction("terminate")} data-testid={`terminate-${staff.id}`}>
        إنهاء الخدمة
      </button>
    </div>
  );
}
