"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { parseAsBoolean, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConversations, usePatchConversation } from "@/features/inbox/api";
import { CONVERSATION_CHANNELS, CONVERSATION_STATUSES } from "@/features/inbox/schemas";
import { ConversationList, InboxFilters } from "@/features/inbox/components/conversation-list";
import { Thread } from "@/features/inbox/components/thread";
import { isTyping } from "@/features/inbox/components/bits";

/**
 * `/dashboard/inbox` (M27 US-27.2/27.3, FR-27.02–04): conversations 320px · thread ·
 * context 280px on desktop; one column with a step-in flow below lg. Filters and the open
 * conversation (`?c=`) live in the URL (FR-27.03).
 */
export const inboxParsers = {
  status: parseAsStringLiteral(CONVERSATION_STATUSES),
  channel: parseAsStringLiteral(CONVERSATION_CHANNELS),
  assigned: parseAsString.withDefault(""),
  unread: parseAsBoolean.withDefault(false),
  q: parseAsString.withDefault(""),
  c: parseAsInteger,
};

export function InboxScreen() {
  return (
    <AccessGate feature="social_channels" permission="channels.inbox.access">
      <InboxInner />
    </AccessGate>
  );
}

function InboxInner() {
  const [f, setF] = useQueryStates(inboxParsers, { history: "replace" });
  const params = useMemo(
    () => ({ status: f.status ?? undefined, channel: f.channel ?? undefined, assigned: f.assigned || undefined, unread: f.unread ? "1" : undefined, q: f.q || undefined, page_size: 100 }),
    [f.status, f.channel, f.assigned, f.unread, f.q],
  );
  const list = useConversations(params);
  const rows = useMemo(() => list.data?.results ?? [], [list.data]);
  const filtered = Boolean(f.status || f.channel || f.assigned || f.unread || f.q);
  const open = f.c ?? null;

  const select = useCallback((id: number | null) => void setF({ c: id }, { history: "push" }), [setF]);

  // J/K between conversations (§6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k !== "j" && k !== "k") return;
      if (rows.length === 0) return;
      const idx = rows.findIndex((r) => r.id === open);
      const next = k === "j" ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx < 0 ? 0 : idx - 1);
      e.preventDefault();
      select(rows[next]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, open, select]);

  if (list.isLoading) return <InboxSkeleton />;
  if (list.error && !list.data) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (!filtered && rows.length === 0) {
    return (
      <EmptyState
        title="لا محادثات — اربط قناة لتبدأ"
        description="تصل هنا رسائل فيسبوك وإنستغرام وتيك توك وتيليجرام في صندوق واحد."
        action={
          <Link href="/dashboard/channels/social" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
            ربط القنوات
          </Link>
        }
      />
    );
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3rem-4rem)] min-h-[32rem] border-border lg:-mx-6 lg:h-[calc(100dvh-3rem)]" data-testid="inbox">
      {/* column 1 — the list (hidden on mobile while a conversation is open) */}
      <section aria-label="المحادثات" className={cn("flex min-w-0 flex-col border-e border-border lg:w-80 lg:shrink-0", open ? "hidden lg:flex" : "flex w-full")}>
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-lg font-semibold">المحادثات</h1>
            <span className="text-xs text-muted-foreground">
              <Mono>{list.data?.count ?? 0}</Mono> محادثة
            </span>
          </div>
          <InboxFilters value={f} onChange={(patch) => void setF({ ...patch, c: null })} />
          {list.isError ? (
            <button type="button" onClick={() => void list.refetch()} className="text-start text-xs text-muted-foreground underline underline-offset-4" data-testid="poll-error">
              انقطع التحديث — إعادة المحاولة
            </button>
          ) : null}
        </div>
        {rows.length === 0 ? (
          <div className="p-3">
            <EmptyState
              title="لا محادثات تطابق الفلاتر"
              action={
                <button type="button" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" onClick={() => void setF({ status: null, channel: null, assigned: null, unread: null, q: null })}>
                  مسح الفلاتر
                </button>
              }
            />
          </div>
        ) : (
          <ConversationList rows={rows} activeId={open} onSelect={select} />
        )}
      </section>

      {/* columns 2+3 — the thread and its context */}
      <section aria-label="المحادثة" className={cn("min-w-0 flex-1", open ? "flex" : "hidden lg:flex")}>
        {open ? (
          <ThreadHost key={open} id={open} onBack={() => select(null)} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">اختر محادثة من القائمة لعرض رسائلها.</div>
        )}
      </section>
    </div>
  );
}

function ThreadHost({ id, onBack }: { id: number; onBack: () => void }) {
  const patch = usePatchConversation(id);
  return <Thread id={id} onBack={onBack} patch={patch} />;
}

function InboxSkeleton() {
  return (
    <div className="flex gap-4" aria-busy="true" aria-label="جارٍ تحميل المحادثات">
      <div className="flex w-full flex-col gap-2 lg:w-80">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <div className="hidden flex-1 flex-col gap-3 lg:flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className={cn("h-12", i % 2 ? "ms-auto w-1/2" : "w-2/3")} />
        ))}
      </div>
    </div>
  );
}
