"use client";

import { useEffect, useRef, useState } from "react";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  CHANNEL_SHORT,
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_LABELS,
  type Conversation,
  type ConversationChannel,
  type ConversationStatus,
} from "@/features/inbox/schemas";
import { RelTime, useNow } from "@/features/inbox/components/bits";

export interface InboxFilterValue {
  status: ConversationStatus | null;
  channel: ConversationChannel | null;
  assigned: string;
  unread: boolean;
  q: string;
}

export function InboxFilters({ value, onChange }: { value: InboxFilterValue; onChange: (patch: Partial<{ status: ConversationStatus | null; channel: ConversationChannel | null; assigned: string | null; unread: boolean | null; q: string | null }>) => void }) {
  const [q, setQ] = useState(value.q);
  // Only a real edit of the box reaches the URL — never a mount (Strict Mode runs effects
  // twice, and a stray `{ q: null }` would also clear the open conversation `?c=`).
  const term = q.trim();
  useEffect(() => {
    if (term === value.q) return;
    const t = window.setTimeout(() => onChange({ q: term || null }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);
  const sel = "h-11 min-w-0 flex-1 text-sm lg:h-8";
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="اسم، معرّف، أو هاتف"
        aria-label="بحث في المحادثات"
        className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-8"
        data-testid="inbox-search"
      />
      <div className="flex gap-1.5">
        <NativeSelect aria-label="الحالة" value={value.status ?? ""} onChange={(e) => onChange({ status: (e.target.value || null) as ConversationStatus | null })} className={sel} data-testid="filter-status">
          <option value="">كل الحالات</option>
          {CONVERSATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONVERSATION_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="القناة" value={value.channel ?? ""} onChange={(e) => onChange({ channel: (e.target.value || null) as ConversationChannel | null })} className={sel} data-testid="filter-channel">
          <option value="">كل القنوات</option>
          {CONVERSATION_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_SHORT[c]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center gap-1.5">
        <NativeSelect aria-label="المُسنَد إليه" value={value.assigned} onChange={(e) => onChange({ assigned: e.target.value || null })} className={sel} data-testid="filter-assigned">
          <option value="">كل المُسنَدين</option>
          <option value="me">المُسنَدة إليّ</option>
          <option value="none">غير مُسنَدة</option>
        </NativeSelect>
        <label className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm lg:h-8">
          <input type="checkbox" checked={value.unread} onChange={(e) => onChange({ unread: e.target.checked || null })} className="size-4 accent-foreground" data-testid="filter-unread" />
          غير المقروءة
        </label>
      </div>
    </div>
  );
}

export function ConversationList({ rows, activeId, onSelect }: { rows: Conversation[]; activeId: number | null; onSelect: (id: number) => void }) {
  const now = useNow();
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeId]);
  return (
    <ul className="flex-1 overflow-y-auto overscroll-contain" data-testid="conversation-list">
      {rows.map((c) => {
        const active = c.id === activeId;
        return (
          <li key={c.id} className="border-b border-border">
            <button
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={active ? "true" : undefined}
              data-testid="conversation-row"
              data-id={c.id}
              className={cn("flex w-full min-h-16 flex-col gap-1 px-3 py-2.5 text-start transition-colors hover:bg-muted/60", active && "bg-muted")}
            >
              <span className="flex w-full items-baseline gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-sm", c.unread_count > 0 ? "font-semibold" : "font-medium")}>{c.contact_name}</span>
                <RelTime iso={c.last_message_at} now={now} />
              </span>
              <span className="flex w-full items-center gap-2">
                <span className="shrink-0 text-[11px] text-muted-foreground">{CHANNEL_SHORT[c.channel_code]}</span>
                <span dir="auto" className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {c.last_message_preview}
                </span>
                {c.unread_count > 0 ? (
                  <Mono className="shrink-0 text-xs font-medium text-foreground" aria-label={`${c.unread_count} غير مقروءة`} data-testid="unread-count">
                    {c.unread_count}
                  </Mono>
                ) : null}
              </span>
              {c.status !== "open" || c.assigned_staff ? (
                <span className="flex w-full gap-2 text-[11px] text-muted-foreground">
                  {c.status !== "open" ? <span>{CONVERSATION_STATUS_LABELS[c.status]}</span> : null}
                  {c.assigned_staff ? <span className="truncate">← {c.assigned_staff.name}</span> : null}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
