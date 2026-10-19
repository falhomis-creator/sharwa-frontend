"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import type { UseMutationResult } from "@tanstack/react-query";
import { Mono } from "@/components/shared/mono";
import { ErrorState } from "@/components/shared/error-state";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConversation, useMessages, useSendMessage } from "@/features/inbox/api";
import {
  CHANNEL_SHORT,
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_LABELS,
  MESSAGE_STATUS_LABELS,
  type Conversation,
  type ConversationStatus,
  type Message,
} from "@/features/inbox/schemas";
import { ContextPanel } from "@/features/inbox/components/context-panel";
import { ConvertDialog } from "@/features/inbox/components/convert-dialog";
import { ReplyBox } from "@/features/inbox/components/reply-box";
import { Notice, isTyping, newClientId } from "@/features/inbox/components/bits";

type Patch = UseMutationResult<Conversation, Error, { status?: ConversationStatus; assigned_staff_id?: number | null; mark_read?: boolean }>;

export function Thread({ id, onBack, patch }: { id: number; onBack: () => void; patch: Patch }) {
  const detail = useConversation(id);
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const [contextOpen, setContextOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const assignRef = useRef<HTMLSelectElement | null>(null);
  const d = detail.data;

  // Opening a conversation (and every poll that brings unread) zeroes its counter (US-27.2).
  const unread = d?.unread_count ?? 0;
  const patchMutate = patch.mutate;
  useEffect(() => {
    if (unread > 0) patchMutate({ mark_read: true });
  }, [unread, patchMutate]);

  const setStatus = (status: ConversationStatus) =>
    patch.mutate({ status }, { onSuccess: () => toast.success(`أصبحت المحادثة «${CONVERSATION_STATUS_LABELS[status]}».`), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر تغيير الحالة.") });
  const assign = (value: string) =>
    patch.mutate(
      { assigned_staff_id: value ? Number(value) : null },
      { onSuccess: (row) => toast.success(row.assigned_staff ? `أُسندت إلى ${row.assigned_staff.name}.` : "أُلغي الإسناد."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الإسناد.") },
    );

  // E resolve · A assign · O convert (§6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !d) return;
      const k = e.key.toLowerCase();
      if (k === "e" && d.status !== "resolved") {
        e.preventDefault();
        setStatus("resolved");
      } else if (k === "a") {
        e.preventDefault();
        assignRef.current?.focus();
      } else if (k === "o" && !d.order_id) {
        e.preventDefault();
        setConvertOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const resend = (m: Message) => {
    send.mutate({ text: m.text, product_id: m.product?.id, client_id: newClientId() }, { onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الإرسال.") });
  };

  if (detail.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className={cn("h-12", i % 2 ? "ms-auto w-1/2" : "w-2/3")} />
        ))}
      </div>
    );
  }
  if (!d) return <ErrorState className="m-4" error={detail.error} onRetry={() => void detail.refetch()} />;

  const readOnlyReason = !d.channel_connected ? "القناة غير مربوطة — لا يمكن الردّ." : !d.can_reply ? "لديك صلاحية العرض فقط على هذه القناة — اطلب صلاحية الردّ من مالك المتجر." : null;

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col" data-testid="thread" data-id={d.id}>
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <button type="button" onClick={onBack} className="flex size-11 items-center justify-center rounded-md hover:bg-muted lg:hidden" aria-label="رجوع إلى القائمة" data-testid="thread-back">
            <ArrowRight className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{d.contact_name}</span>
            <span className="flex gap-2 text-[11px] text-muted-foreground">
              <span>{CHANNEL_SHORT[d.channel_code]}</span>
              <Mono>{d.external_contact_id}</Mono>
            </span>
          </div>
          <NativeSelect aria-label="حالة المحادثة" value={d.status} onChange={(e) => setStatus(e.target.value as ConversationStatus)} className="h-11 w-auto text-sm lg:h-8" data-testid="thread-status">
            {CONVERSATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONVERSATION_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect ref={assignRef} aria-label="إسناد إلى" value={d.assigned_staff ? String(d.assigned_staff.id) : ""} onChange={(e) => assign(e.target.value)} className="h-11 w-auto max-w-40 text-sm lg:h-8" data-testid="thread-assign">
            <option value="">غير مُسنَدة</option>
            {d.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          {d.order_id ? null : (
            <button type="button" onClick={() => setConvertOpen(true)} className="h-11 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8" data-testid="convert-open">
              تحويل إلى طلب
            </button>
          )}
          <button type="button" onClick={() => setContextOpen(true)} className="flex size-11 items-center justify-center rounded-md hover:bg-muted xl:hidden lg:size-8" aria-label="سياق العميل والطلب">
            <Info className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        {!d.channel_connected ? (
          <div className="px-3 pt-2">
            <Notice tone="warning" testId="channel-disconnected" action={<Link href="/dashboard/channels/social" className="text-sm underline underline-offset-4">القنوات</Link>}>
              القناة غير مربوطة — المحادثة للقراءة فقط.
            </Notice>
          </div>
        ) : null}

        <MessageList messages={messages.data} loading={messages.isLoading} pollError={messages.isError} onRetryPoll={() => void messages.refetch()} onResend={resend} onZoom={setZoom} />

        <ReplyBox conversationId={d.id} disabledReason={readOnlyReason} send={send} />
      </div>

      <aside aria-label="سياق المحادثة" className="hidden w-70 shrink-0 overflow-y-auto border-s border-border xl:block" data-testid="context-column">
        <ContextPanel detail={d} onConvert={() => setConvertOpen(true)} />
      </aside>
      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto p-0">
          <SheetTitle className="sr-only">سياق المحادثة</SheetTitle>
          <ContextPanel detail={d} onConvert={() => (setContextOpen(false), setConvertOpen(true))} />
        </SheetContent>
      </Sheet>
      <ConvertDialog open={convertOpen} onOpenChange={setConvertOpen} detail={d} />
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle className="sr-only">معاينة الوسائط</DialogTitle>
          {zoom ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={zoom} alt="مرفق من المحادثة" className="max-h-[75dvh] w-full rounded-md border border-border object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageList({
  messages,
  loading,
  pollError,
  onRetryPoll,
  onResend,
  onZoom,
}: {
  messages: Message[] | undefined;
  loading: boolean;
  pollError: boolean;
  onRetryPoll: () => void;
  onResend: (m: Message) => void;
  onZoom: (url: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const nearBottom = useRef(true);
  const lastCount = useRef(0);
  const [fresh, setFresh] = useState(0);

  // Stick to the bottom only when the reader already is there (US-27.2 acceptance 4).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !messages) return;
    const added = messages.length - lastCount.current;
    lastCount.current = messages.length;
    if (nearBottom.current || added === messages.length) el.scrollTop = el.scrollHeight;
    else if (added > 0) setFresh((n) => n + added);
  }, [messages]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom.current) setFresh(0);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 py-4" data-testid="messages">
        {loading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className={cn("h-12", i % 2 ? "ms-auto w-1/2" : "w-2/3")} />
            ))}
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {(messages ?? []).map((m) => (
              <MessageBubble key={m.id < 0 ? `o:${m.client_id}` : m.id} m={m} onResend={onResend} onZoom={onZoom} />
            ))}
          </ol>
        )}
      </div>
      {fresh > 0 ? (
        <button
          type="button"
          onClick={() => {
            ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
            setFresh(0);
          }}
          className="absolute inset-x-0 bottom-2 mx-auto h-11 w-fit rounded-full border border-border bg-background px-4 text-sm shadow-sm lg:h-8"
          data-testid="new-messages"
        >
          رسائل جديدة <Mono>{fresh}</Mono>
        </button>
      ) : null}
      {pollError ? (
        <div className="absolute inset-x-3 top-2">
          <Notice testId="thread-poll-error" action={<button type="button" onClick={onRetryPoll} className="text-sm underline underline-offset-4">إعادة المحاولة</button>}>
            انقطع التحديث
          </Notice>
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({ m, onResend, onZoom }: { m: Message; onResend: (m: Message) => void; onZoom: (url: string) => void }) {
  const out = m.direction === "outbound";
  const pending = m.id < 0;
  const sender = m.sender_type === "customer" ? null : m.sender_type === "bot" ? "الرد الآلي" : (m.sender_name ?? "أنت");
  return (
    <li className={cn("flex max-w-[85%] flex-col gap-1 md:max-w-[70%]", out ? "self-end items-end" : "self-start items-start")} data-testid="message" data-direction={m.direction} data-id={m.id}>
      {/* FR-27.05: inbound = 1px border; outbound = `muted` background — never brand colours. */}
      <div className={cn("flex flex-col gap-2 rounded-lg px-3 py-2 text-sm", out ? "bg-muted" : "border border-border bg-background")}>
        {m.media.map((media) =>
          media.type === "image" ? (
            <button key={media.url} type="button" onClick={() => onZoom(media.url)} className="block overflow-hidden rounded-md border border-border" aria-label="تكبير الصورة">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.url} alt="" className="h-32 w-44 object-cover" />
            </button>
          ) : (
            <a key={media.url} href={media.url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2 py-1 text-xs underline">
              ملف مرفق
            </a>
          ),
        )}
        {m.product ? (
          <div className="flex flex-col rounded-md border border-border bg-background px-2 py-1.5" data-testid="product-card">
            <span className="text-xs text-muted-foreground">بطاقة منتج</span>
            <span className="font-medium">{m.product.name}</span>
            <Mono className="text-xs">{m.product.display_price}</Mono>
          </div>
        ) : null}
        {m.text ? (
          <p dir="auto" className="whitespace-pre-wrap break-words">
            {m.text}
          </p>
        ) : null}
      </div>
      <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
        {sender ? <span>{sender}</span> : null}
        <Mono title={formatDateTime(m.created_at)}>{new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.created_at))}</Mono>
        {out ? (
          <span data-testid="message-status" className={m.status === "failed" ? "text-destructive" : undefined}>
            {pending ? "جارٍ الإرسال" : m.status ? MESSAGE_STATUS_LABELS[m.status] : null}
          </span>
        ) : null}
      </span>
      {m.status === "failed" ? (
        <span className="flex flex-col items-end gap-1">
          {m.error ? (
            <span className="max-w-prose text-xs text-destructive" data-testid="message-error">
              {m.error}
            </span>
          ) : null}
          <button type="button" onClick={() => onResend(m)} className="h-11 rounded-md border border-border px-3 text-xs hover:bg-muted lg:h-7" data-testid="message-retry">
            إعادة المحاولة
          </button>
        </span>
      ) : null}
    </li>
  );
}
