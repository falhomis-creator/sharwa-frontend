"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ArrowLeft, ChevronDown, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Ltr, Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession, useSessionAction, useSessionCounters, useSessionReply, useSessions } from "@/features/support/api";
import { SESSION_STATUSES, SESSION_STATUS_LABELS, SESSION_STATUS_TONE, SESSION_TYPES, SESSION_TYPE_LABELS, type SessionDetail, type SupportSession, type TimelineItem } from "@/features/support/schemas";
import { Notice, StatusDot, isTyping, newClientId } from "@/features/inbox/components/bits";
import { ConfirmDialog } from "@/features/inbox/components/confirm-dialog";

const parsers = {
  status: parseAsStringLiteral(SESSION_STATUSES),
  session_type: parseAsStringLiteral(SESSION_TYPES),
  mine: parseAsBoolean.withDefault(false),
  q: parseAsString.withDefault(""),
};

function holder(s: SupportSession) {
  if (s.status === "human_locked" && s.assigned_staff) return s.assigned_staff.name;
  if (s.status === "closed") return "—";
  return "البوت";
}

/**
 * `/dashboard/support/sessions` — M32 US-32.4 (read for everyone) on the M31 contract
 * (US-31.2): escalated first, filters in the URL, a 10s poll. Takeover lives on the
 * session page and needs `support.takeover_session` (FR-31.05).
 */
export function SessionsScreen() {
  const table = useTableUrlState();
  const router = useRouter();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const q = useSessions({ status: f.status ?? undefined, session_type: f.session_type ?? undefined, assigned_to_me: f.mine ? "1" : undefined, q: f.q || undefined, page: table.page, page_size: table.pageSize });
  const counters = useSessionCounters();
  const set = (patch: Parameters<typeof setF>[0]) => {
    void setF(patch);
    table.resetPage();
  };
  const active = Number(Boolean(f.status)) + Number(Boolean(f.session_type)) + Number(f.mine);
  const clear = () => set({ status: null, session_type: null, mine: null, q: null });
  // US-32.4 acceptance 1: escalated sessions grouped at the top of the page.
  const rows = useMemo(() => {
    const all = q.data?.results ?? [];
    return [...all.filter((s) => s.status === "escalated"), ...all.filter((s) => s.status !== "escalated")];
  }, [q.data]);
  const columns = useMemo<ColumnDef<SupportSession, unknown>[]>(
    () => [
      {
        id: "party",
        header: headerLabel("الطرف"),
        cell: ({ row }) => (
          <Link href={`/dashboard/support/sessions/${row.original.id}`} className="flex flex-col hover:underline" data-testid="session-link">
            <span className="font-medium">{row.original.party.name}</span>
            {row.original.party.phone ? <Ltr className="font-mono text-xs text-muted-foreground">{prettyPhone(row.original.party.phone)}</Ltr> : null}
          </Link>
        ),
      },
      { id: "type", header: headerLabel("النوع"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{SESSION_TYPE_LABELS[row.original.session_type]}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <StatusDot tone={SESSION_STATUS_TONE[row.original.status]} label={SESSION_STATUS_LABELS[row.original.status]} testId="session-status" value={row.original.status} /> },
      { id: "holder", header: headerLabel("المتولّي"), cell: ({ row }) => <span className="whitespace-nowrap">{holder(row.original)}</span> },
      { id: "count", meta: { numeric: true }, header: headerLabel("الرسائل"), cell: ({ row }) => <Mono>{row.original.messages_count}</Mono> },
      { id: "at", header: headerLabel("آخر نشاط"), cell: ({ row }) => <time dateTime={row.original.last_activity_at} title={formatDateTime(row.original.last_activity_at)} className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.last_activity_at, now)}</time> },
    ],
    [now],
  );
  const ai = q.data?.ai;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="جلسات الدعم الفني" description="محادثات شروة AI مع العملاء والمسوّقين؛ المُصعَّدة تنتظر موظفاً." />
      {ai && !ai.installed ? <Notice>جلسات الدعم تتطلب شروة AI مثبَّتاً ومفعّلاً — <Link href="/dashboard/apps/sharwa_ai" className="underline underline-offset-4">متجر التطبيقات</Link>.</Notice> : null}
      {ai && ai.installed && !ai.enabled ? <Notice tone="warning" testId="ai-disabled">المساعد معطّل — الجلسات الجديدة تذهب للموظفين مباشرة.</Notice> : null}
      <StatStrip
        label="ملخص الجلسات"
        items={[
          { key: "escalated", label: "مُصعَّدة", count: counters.data?.escalated, active: f.status === "escalated", onSelect: () => set({ status: f.status === "escalated" ? null : "escalated" }), tone: "warning" },
          { key: "mine", label: "أتولّاها", count: counters.data?.human_locked_mine, active: f.mine, onSelect: () => set({ mine: f.mine ? null : true }) },
        ]}
      />
      <DataTable<SupportSession>
        testId="sessions-table"
        caption="جلسات الدعم"
        columns={columns}
        data={q.data ? rows : undefined}
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
        onRowOpen={(r) => router.push(`/dashboard/support/sessions/${r.id}`)}
        toolbar={
          <FilterBar activeCount={active} onClear={clear} search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="اسم أو هاتف" label="بحث في الجلسات" />}>
            <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as SupportSession["status"] | null })} options={SESSION_STATUSES.map((s) => ({ value: s, label: SESSION_STATUS_LABELS[s] }))} testId="filter-session-status" />
            <FilterSelect label="النوع" value={f.session_type ?? ""} onChange={(v) => set({ session_type: (v || null) as SupportSession["session_type"] | null })} options={SESSION_TYPES.map((s) => ({ value: s, label: SESSION_TYPE_LABELS[s] }))} />
          </FilterBar>
        }
        renderMobileCard={(s) => (
          <Link href={`/dashboard/support/sessions/${s.id}`} className="flex min-h-16 w-full flex-col gap-1 p-3">
            <span className="flex items-baseline gap-2">
              <span className="flex-1 truncate text-sm font-medium">{s.party.name}</span>
              <time className="text-[11px] text-muted-foreground">{formatRelative(s.last_activity_at, now)}</time>
            </span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <StatusDot tone={SESSION_STATUS_TONE[s.status]} label={SESSION_STATUS_LABELS[s.status]} />
              <span>{SESSION_TYPE_LABELS[s.session_type]}</span>
              <span>{holder(s)}</span>
            </span>
          </Link>
        )}
        emptyState={<EmptyState title="لا جلسات دعم بعد" />}
        noResultsState={<EmptyState title="لا جلسات تطابق الفلاتر" action={<button type="button" onClick={clear} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">مسح الفلاتر</button>} />}
      />
    </div>
  );
}

/**
 * `/dashboard/support/sessions/[id]` (M31 US-31.3/31.4): the timeline (messages + folded
 * tool calls), the takeover bar, the reply box. Every action carries `version`; a 409 says
 * who got there first and refreshes.
 */
export function SessionPage({ id }: { id: number }) {
  const q = useSession(id);
  if (q.isLoading) return <Skeleton className="h-96" />;
  if (!q.data) {
    if (isApiError(q.error) && q.error.status === 404) return <EmptyState title="الجلسة غير موجودة" action={<Link href="/dashboard/support/sessions" className="underline">كل الجلسات</Link>} />;
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <SessionView data={q.data} pollError={q.isError} onRetry={() => void q.refetch()} />;
}

function SessionView({ data, pollError, onRetry }: { data: SessionDetail; pollError: boolean; onRetry: () => void }) {
  const s = data.session;
  const action = useSessionAction(s.id);
  const reply = useSessionReply(s.id);
  const router = useRouter();
  const [confirmClose, setConfirmClose] = useState(false);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLOListElement | null>(null);

  useLayoutEffect(() => {
    const el = listRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data.timeline.length]);

  const run = (a: "takeover" | "release" | "close") =>
    action.mutate(
      { action: a, version: s.version },
      {
        onSuccess: () => {
          setConfirmClose(false);
          toast.success(a === "takeover" ? "استلمت الجلسة — البوت متوقف." : a === "release" ? "أُعيدت الجلسة للبوت." : "أُغلقت الجلسة.");
        },
        onError: (e) => {
          setConfirmClose(false);
          toast.error(isApiError(e) ? e.userMessage : "تعذّر تنفيذ الإجراء.");
          onRetry();
        },
      },
    );
  const canAct = data.can_takeover;
  const takeable = canAct && (s.status === "bot_active" || s.status === "escalated");

  // T take · R release · E close (§6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || action.isPending) return;
      const k = e.key.toLowerCase();
      if (k === "t" && takeable) run("takeover");
      else if (k === "r" && s.is_mine) run("release");
      else if (k === "e" && canAct && s.status !== "closed" && (s.status !== "human_locked" || s.is_mine)) setConfirmClose(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    reply.mutate({ text: body, client_id: newClientId() }, { onError: (e) => (setText(body), toast.error(isApiError(e) ? e.userMessage : "تعذّر الإرسال.")) });
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3rem-4rem)] flex-col lg:-mx-6 lg:h-[calc(100dvh-3rem)]" data-testid="session-page" data-id={s.id}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <button type="button" onClick={() => router.push("/dashboard/support/sessions")} className="flex size-11 items-center justify-center rounded-md hover:bg-muted lg:size-8" aria-label="رجوع إلى الجلسات">
          <ArrowLeft className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{s.party.name}</span>
          <span className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            <span>{SESSION_TYPE_LABELS[s.session_type]}</span>
            {s.party.phone ? <Ltr className="font-mono">{prettyPhone(s.party.phone)}</Ltr> : null}
            <span>
              نسخة <Mono>{s.version}</Mono>
            </span>
          </span>
        </div>
        <StatusDot tone={SESSION_STATUS_TONE[s.status]} label={SESSION_STATUS_LABELS[s.status]} testId="session-status" value={s.status} />
        {takeable ? (
          <Button className="h-11 lg:h-8" disabled={action.isPending} onClick={() => run("takeover")} data-testid="session-takeover">
            استلام الجلسة
          </Button>
        ) : null}
        {s.is_mine ? (
          <Button variant="outline" className="h-11 lg:h-8" disabled={action.isPending} onClick={() => run("release")} data-testid="session-release">
            إعادة للبوت
          </Button>
        ) : null}
        {canAct && s.status !== "closed" && (s.status !== "human_locked" || s.is_mine) ? (
          <Button variant="ghost" className="h-11 lg:h-8" disabled={action.isPending} onClick={() => setConfirmClose(true)} data-testid="session-close">
            إغلاق
          </Button>
        ) : null}
      </header>
      {s.is_mine ? (
        <div className="border-b border-border bg-muted/50 px-3 py-2 text-sm" data-testid="takeover-bar">
          أنت تتولّى هذه الجلسة — البوت متوقف.
        </div>
      ) : s.status === "human_locked" && s.assigned_staff ? (
        <div className="border-b border-border px-3 py-2 text-sm text-muted-foreground" data-testid="locked-by">
          يتولّاها {s.assigned_staff.name}.
        </div>
      ) : null}
      {data.ai && data.ai.installed && !data.ai.enabled ? (
        <div className="px-3 pt-2">
          <Notice tone="warning">المساعد معطّل — الجلسات الجديدة تذهب للموظفين مباشرة.</Notice>
        </div>
      ) : null}
      {!canAct ? <p className="px-3 pt-2 text-xs text-muted-foreground" data-testid="session-readonly">للقراءة فقط — استلام الجلسات يتطلب صلاحية «استلام جلسات الدعم».</p> : null}
      {pollError ? (
        <div className="px-3 pt-2">
          <Notice action={<button type="button" onClick={onRetry} className="text-sm underline underline-offset-4">إعادة المحاولة</button>}>انقطع التحديث</Notice>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ol ref={listRef} className="mx-auto flex max-w-3xl flex-col gap-2" data-testid="session-timeline">
          {data.timeline.map((t) => (t.kind === "tool_call" ? <ToolCall key={t.id} t={t} /> : <SessionMessage key={t.id < 0 ? `o:${t.client_id}` : t.id} t={t} />))}
        </ol>
      </div>
      {s.is_mine ? (
        <div className="flex items-end gap-1.5 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            dir="auto"
            aria-label="نص الردّ"
            placeholder="اكتب ردّاً… (Shift+Enter لسطر جديد)"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-lg border border-input bg-card px-2.5 py-2.5 text-base outline-none field-sizing-content focus-visible:border-ring md:text-sm lg:min-h-9 lg:py-1.5"
            data-testid="session-reply"
          />
          <button type="button" onClick={send} disabled={!text.trim()} aria-label="إرسال" className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 lg:size-9" data-testid="session-send">
            <SendHorizontal className="size-4 rtl:-scale-x-100" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ) : null}
      <ConfirmDialog open={confirmClose} onOpenChange={setConfirmClose} title="إغلاق الجلسة؟" description="تُغلق المحادثة ولا يردّ عليها البوت ولا الموظفون؛ رسالة جديدة من الطرف تفتح جلسة جديدة." confirmLabel="إغلاق الجلسة" destructive pending={action.isPending} onConfirm={() => run("close")} />
    </div>
  );
}

function SessionMessage({ t }: { t: TimelineItem }) {
  // INT-042: takeover / release / close are logged by the server as quiet event rows, not chat bubbles.
  if (t.sender_type === "system") {
    return (
      <li className="self-center text-center text-[11px] text-muted-foreground" data-testid="session-event">
        {t.text} · <Mono title={formatDateTime(t.created_at)}>{new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(t.created_at))}</Mono>
      </li>
    );
  }
  const out = t.sender_type !== "customer";
  const sender = t.sender_type === "customer" ? "العميل" : t.sender_type === "bot" ? "شروة AI" : (t.sender_name ?? "أنت");
  return (
    <li className={cn("flex max-w-[85%] flex-col gap-1 md:max-w-[70%]", out ? "self-end items-end" : "self-start items-start")} data-testid="session-message" data-sender={t.sender_type}>
      {t.text ? (
        <p dir="auto" className={cn("whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm", out ? "bg-muted" : "border border-border bg-card")}>
          {t.text}
        </p>
      ) : null}
      {t.media_type ? (
        t.media_url ? (
          <a href={t.media_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm underline underline-offset-4" data-testid="session-media">
            فتح المرفق ({MEDIA_LABELS[t.media_type] ?? t.media_type})
          </a>
        ) : (
          <span className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">مرفق غير متاح حالياً</span>
        )
      ) : null}
      <span className="flex gap-2 text-[11px] text-muted-foreground">
        <span>{sender}</span>
        <Mono title={formatDateTime(t.created_at)}>{t.id < 0 ? "جارٍ الإرسال" : new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(t.created_at))}</Mono>
      </span>
    </li>
  );
}

const MEDIA_LABELS: Record<string, string> = { image: "صورة", audio: "مقطع صوتي", video: "فيديو", document: "مستند" };

/** US-31.4: folded by default; Mono tool name and time, readable JSON in a 1px frame. */
function ToolCall({ t }: { t: TimelineItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="self-stretch" data-testid="tool-call">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-xs text-muted-foreground hover:bg-muted lg:min-h-7">
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} strokeWidth={1.75} aria-hidden />
        <span>أداة</span>
        <Mono className="text-foreground">{t.tool_name}</Mono>
        {t.error ? <span className="text-destructive">فشلت</span> : null}
        <Mono className="ms-auto">{new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(t.created_at))}</Mono>
      </button>
      {open ? (
        <div className="mt-1 flex flex-col gap-2 rounded-md border border-border p-2 text-xs" dir="ltr">
          <div>
            <span className="text-muted-foreground">input</span>
            <pre className="whitespace-pre-wrap break-all font-mono">{pretty(t.input_summary)}</pre>
          </div>
          {t.output_summary ? (
            <div>
              <span className="text-muted-foreground">output</span>
              <pre className="whitespace-pre-wrap break-all font-mono">{pretty(t.output_summary)}</pre>
            </div>
          ) : null}
          {t.error ? (
            <p dir="auto" className="text-destructive">
              {t.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function pretty(s: string | null | undefined) {
  if (!s) return "";
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
