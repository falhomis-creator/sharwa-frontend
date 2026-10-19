"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useAssignees, useCreateTicket, usePatchTicket, useTicket, useTickets } from "@/features/support/api";
import { TICKET_STATUSES, TICKET_STATUS_LABELS, TICKET_STATUS_TONE, ticketFormSchema, type Ticket, type TicketRow, type TicketStatus } from "@/features/support/schemas";
import { StatusDot, isTyping } from "@/features/inbox/components/bits";
import { ConfirmDialog } from "@/features/inbox/components/confirm-dialog";

/**
 * Support tickets (M32 US-32.1–32.3) at the sidebar path `/dashboard/wallet/tickets`
 * (spec §6: `/dashboard/support/tickets`). Filters and the open ticket (`?ticket=`) live in
 * the URL; the detail is ONE component, in a sheet here and full-page at `/[id]`.
 */
export const TICKETS_PATH = "/dashboard/wallet/tickets";

const parsers = {
  status: parseAsStringLiteral(TICKET_STATUSES),
  assigned_to: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
  ticket: parseAsInteger,
};

export function TicketsScreen() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [creating, setCreating] = useState(false);
  const [now] = useState(() => new Date());
  const q = useTickets({ status: f.status ?? undefined, assigned_to: f.assigned_to || undefined, q: f.q || undefined, page: table.page, page_size: table.pageSize });
  const set = (patch: Parameters<typeof setF>[0]) => {
    void setF(patch);
    table.resetPage();
  };
  const active = Number(Boolean(f.status)) + Number(Boolean(f.assigned_to));
  const clear = () => set({ status: null, assigned_to: null, q: null });
  const c = q.data?.counters;

  // N new ticket (§6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key.toLowerCase() === "n" && !creating && f.ticket === null) {
        e.preventDefault();
        setCreating(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating, f.ticket]);

  const columns = useMemo<ColumnDef<TicketRow, unknown>[]>(
    () => [
      { id: "id", header: headerLabel("المعرّف"), cell: ({ row }) => <Mono className="text-xs">#{row.original.id}</Mono> },
      { id: "title", header: headerLabel("العنوان"), cell: ({ row }) => <span className="min-w-48 font-medium">{row.original.title}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <RowStatus row={row.original} /> },
      { id: "assignee", header: headerLabel("المُسنَد إليه"), cell: ({ row }) => <span className="whitespace-nowrap">{row.original.assigned_to?.name ?? <span className="text-muted-foreground">—</span>}</span> },
      { id: "updated", header: headerLabel("آخر تحديث"), cell: ({ row }) => <time dateTime={row.original.updated_at} title={formatDateTime(row.original.updated_at)} className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.updated_at, now)}</time> },
    ],
    [now],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تذاكر الدعم"
        description="وثّق المشكلات وتابعها حتى الإغلاق."
        actions={
          <Button className="h-11 lg:h-9" onClick={() => setCreating(true)} data-testid="ticket-new">
            تذكرة جديدة
          </Button>
        }
      />
      <StatStrip
        label="عدّادات التذاكر"
        items={TICKET_STATUSES.map((s) => ({ key: s, label: TICKET_STATUS_LABELS[s], count: c?.[s], active: f.status === s, onSelect: () => set({ status: f.status === s ? null : s }) }))}
      />
      <DataTable<TicketRow>
        testId="tickets-table"
        caption="تذاكر الدعم"
        columns={columns}
        data={q.data?.results}
        getRowId={(r) => String(r.id)}
        total={q.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        error={q.error}
        onRetry={() => void q.refetch()}
        isFiltered={active > 0 || Boolean(f.q)}
        onRowOpen={(r) => void setF({ ticket: r.id }, { history: "push" })}
        toolbar={
          <FilterBar activeCount={active} onClear={clear} search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="العنوان أو المعرّف" label="بحث في التذاكر" />}>
            <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as TicketStatus | null })} options={TICKET_STATUSES.map((s) => ({ value: s, label: TICKET_STATUS_LABELS[s] }))} testId="filter-ticket-status" />
            <AssigneeFilter value={f.assigned_to} onChange={(v) => set({ assigned_to: v || null })} />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <button type="button" onClick={() => void setF({ ticket: r.id }, { history: "push" })} className="flex min-h-16 w-full flex-col gap-1 p-3 text-start">
            <span className="flex items-baseline gap-2">
              <Mono className="text-xs text-muted-foreground">#{r.id}</Mono>
              <span className="flex-1 truncate text-sm font-medium">{r.title}</span>
            </span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <StatusDot tone={TICKET_STATUS_TONE[r.status]} label={TICKET_STATUS_LABELS[r.status]} />
              <span>{r.assigned_to?.name ?? "غير مُسنَدة"}</span>
            </span>
          </button>
        )}
        emptyState={<EmptyState title="لا تذاكر — أنشئ تذكرة لتوثيق مشكلة" />}
        noResultsState={<EmptyState title="لا نتائج تطابق الفلاتر" action={<button type="button" onClick={clear} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">مسح الفلاتر</button>} />}
      />
      <Sheet open={f.ticket !== null} onOpenChange={(o) => !o && void setF({ ticket: null })}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-lg" data-testid="ticket-sheet">
          <SheetTitle className="sr-only">تفاصيل التذكرة</SheetTitle>
          {f.ticket !== null ? <TicketDetail id={f.ticket} inSheet /> : null}
        </SheetContent>
      </Sheet>
      <CreateTicketSheet open={creating} onOpenChange={setCreating} onCreated={(id) => void setF({ ticket: id })} />
    </div>
  );
}

function AssigneeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const staff = useAssignees();
  return (
    <FilterSelect
      label="المُسنَد إليه"
      value={value}
      onChange={onChange}
      options={[{ value: "me", label: "المُسنَدة إليّ" }, { value: "none", label: "غير مُسنَدة" }, ...(staff.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))]}
      testId="filter-assignee"
    />
  );
}

/** FR-32.04: the status changes from the list too, without leaving it. */
function RowStatus({ row }: { row: TicketRow }) {
  const patch = usePatchTicket(row.id);
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${row.status === "open" ? "bg-info" : row.status === "in_progress" ? "bg-warning" : "bg-muted-foreground"}`} />
      <NativeSelect
        aria-label={`حالة التذكرة #${row.id}`}
        value={row.status}
        onChange={(e) => patch.mutate({ status: e.target.value as TicketStatus }, { onError: (err) => toast.error(isApiError(err) ? err.userMessage : "تعذّر تغيير الحالة.") })}
        className="h-11 w-auto border-transparent bg-transparent ps-0 text-sm hover:border-border lg:h-8"
        data-testid="row-status"
      >
        {TICKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TICKET_STATUS_LABELS[s]}
          </option>
        ))}
      </NativeSelect>
    </span>
  );
}

export function TicketDetail({ id, inSheet = false }: { id: number; inSheet?: boolean }) {
  const q = useTicket(id);
  if (q.isLoading) return <Skeleton className="m-4 h-64" />;
  if (!q.data) {
    if (isApiError(q.error) && q.error.status === 404) return <EmptyState className="m-4" title="التذكرة غير موجودة" action={<Link href={TICKETS_PATH} className="underline">كل التذاكر</Link>} />;
    return <ErrorState className="m-4" error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <TicketBody ticket={q.data} inSheet={inSheet} />;
}

function TicketBody({ ticket, inSheet }: { ticket: Ticket; inSheet: boolean }) {
  const patch = usePatchTicket(ticket.id);
  const staff = useAssignees();
  const [reopen, setReopen] = useState(false);
  const statusRef = useRef<HTMLSelectElement | null>(null);
  const assignRef = useRef<HTMLSelectElement | null>(null);

  // S status · A assign (§6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        statusRef.current?.focus();
      } else if (k === "a") {
        e.preventDefault();
        assignRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setStatus = (status: TicketStatus) => {
    if (ticket.status === "closed" && status !== "closed") return setReopen(true);
    patch.mutate({ status }, { onSuccess: () => toast.success(`أصبحت التذكرة «${TICKET_STATUS_LABELS[status]}».`), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر تغيير الحالة.") });
  };

  return (
    <div className={inSheet ? "flex flex-col gap-6 p-4" : "flex max-w-2xl flex-col gap-6"} data-testid="ticket-detail" data-id={ticket.id}>
      <div className="flex flex-col gap-1">
        <Mono className="text-xs text-muted-foreground">#{ticket.id}</Mono>
        <h2 className="text-xl font-semibold">{ticket.title}</h2>
        {inSheet ? (
          <Link href={`${TICKETS_PATH}/${ticket.id}`} className="self-start text-xs text-muted-foreground underline underline-offset-4">
            فتح في صفحة كاملة
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الحالة" htmlFor={`t-status-${ticket.id}`}>
          <NativeSelect ref={statusRef} id={`t-status-${ticket.id}`} value={ticket.status} onChange={(e) => setStatus(e.target.value as TicketStatus)} className="h-11 lg:h-8" data-testid="ticket-status">
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="المُسنَد إليه" htmlFor={`t-assign-${ticket.id}`}>
          <NativeSelect
            ref={assignRef}
            id={`t-assign-${ticket.id}`}
            value={ticket.assigned_to ? String(ticket.assigned_to.id) : ""}
            onChange={(e) =>
              patch.mutate(
                { assigned_to_id: e.target.value ? Number(e.target.value) : null },
                { onSuccess: (t) => toast.success(t.assigned_to ? `أُسندت إلى ${t.assigned_to.name}.` : "أُلغي الإسناد."), onError: (err) => toast.error(isApiError(err) ? err.userMessage : "تعذّر الإسناد.") },
              )
            }
            className="h-11 lg:h-8"
            data-testid="ticket-assign"
          >
            <option value="">غير مُسنَدة</option>
            {(staff.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">الوصف</h3>
        <p dir="auto" className="whitespace-pre-wrap text-sm">
          {ticket.description || <span className="text-muted-foreground">بلا وصف.</span>}
        </p>
      </section>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <dt>أُنشئت</dt>
        <dd>
          <Mono>{formatDateTime(ticket.created_at)}</Mono>
          {ticket.created_by ? ` · ${ticket.created_by}` : ""}
        </dd>
        <dt>آخر تحديث</dt>
        <dd>
          <Mono>{formatDateTime(ticket.updated_at)}</Mono>
        </dd>
      </dl>
      <ConfirmDialog
        open={reopen}
        onOpenChange={setReopen}
        title="إعادة فتح التذكرة؟"
        description="تعود التذكرة «مفتوحة» وتظهر في قائمة المفتوحة."
        confirmLabel="إعادة الفتح"
        pending={patch.isPending}
        onConfirm={() => patch.mutate({ status: "open" }, { onSuccess: () => (setReopen(false), toast.success("أُعيد فتح التذكرة.")), onError: (e) => (setReopen(false), toast.error(isApiError(e) ? e.userMessage : "تعذّر.")) })}
      />
    </div>
  );
}

function CreateTicketSheet({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: number) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md" data-testid="ticket-create">
        {open ? <CreateTicketForm onOpenChange={onOpenChange} onCreated={onCreated} /> : null}
      </SheetContent>
    </Sheet>
  );
}

/** Mounted per opening, so every new ticket starts from an empty form. */
function CreateTicketForm({ onOpenChange, onCreated }: { onOpenChange: (o: boolean) => void; onCreated: (id: number) => void }) {
  const create = useCreateTicket();
  const staff = useAssignees();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ticketFormSchema.safeParse({ title, description, assigned_to_id: assignee ? Number(assignee) : null });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      return setErrors(out);
    }
    try {
      const t = await create.mutateAsync(parsed.data);
      toast.success(`أُنشئت التذكرة #${t.id}.`);
      onOpenChange(false);
      onCreated(t.id);
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر إنشاء التذكرة.");
    }
  }
  return (
        <form onSubmit={(e) => void submit(e)} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>تذكرة جديدة</SheetTitle>
            <SheetDescription>العنوان إلزامي؛ الوصف والإسناد اختياريان.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            <Field label="العنوان" htmlFor="tk-title" error={errors.title} required>
              <input id="tk-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} autoFocus data-testid="ticket-title" />
            </Field>
            <Field label="الوصف" htmlFor="tk-desc" error={errors.description}>
              <Textarea id="tk-desc" rows={6} dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="المُسنَد إليه" htmlFor="tk-assign" error={errors.assigned_to_id}>
              <NativeSelect id="tk-assign" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-11 lg:h-8">
                <option value="">غير مُسنَدة</option>
                {(staff.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <SheetFooter className="flex-row">
            <Button type="button" variant="outline" className="h-11 flex-1 lg:h-9" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" className="h-11 flex-1 lg:h-9" disabled={create.isPending} data-testid="ticket-save">
              {create.isPending ? "جارٍ الحفظ…" : "إنشاء"}
            </Button>
          </SheetFooter>
        </form>
  );
}
