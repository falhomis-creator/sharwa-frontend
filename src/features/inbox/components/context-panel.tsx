"use client";

import Link from "next/link";
import { Ltr, Mono } from "@/components/shared/mono";
import { Money } from "@/components/shared/money";
import { formatDateTime, prettyPhone } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/features/dashboard-shell/labels";
import { CHANNEL_SHORT, CONVERSATION_STATUS_LABELS, type ConversationDetail } from "@/features/inbox/schemas";

/** Column 3 (FR-27.02): text only — the contact, the linked order (`ChannelOrderLink`). */
export function ContextPanel({ detail, onConvert }: { detail: ConversationDetail; onConvert: () => void }) {
  const d = detail;
  return (
    <div className="flex flex-col gap-6 p-4 text-sm" data-testid="context-panel">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">جهة الاتصال</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-muted-foreground">الاسم</dt>
          <dd className="min-w-0 truncate">{d.contact.name}</dd>
          <dt className="text-muted-foreground">الهاتف</dt>
          <dd>{d.contact.phone ? <Ltr className="font-mono text-xs">{prettyPhone(d.contact.phone)}</Ltr> : <span className="text-muted-foreground">—</span>}</dd>
          <dt className="text-muted-foreground">المدينة</dt>
          <dd>{d.contact.city ?? <span className="text-muted-foreground">—</span>}</dd>
          <dt className="text-muted-foreground">القناة</dt>
          <dd>{CHANNEL_SHORT[d.channel_code]}</dd>
          <dt className="text-muted-foreground">المعرّف</dt>
          <dd className="min-w-0 truncate">
            <Mono className="text-xs">{d.contact.external_contact_id}</Mono>
          </dd>
          <dt className="text-muted-foreground">الحالة</dt>
          <dd>{CONVERSATION_STATUS_LABELS[d.status]}</dd>
        </dl>
      </section>
      <section className="flex flex-col gap-2" data-testid="context-order">
        <h2 className="text-xs font-medium text-muted-foreground">الطلب المرتبط</h2>
        {d.order ? (
          <div className="flex flex-col gap-1">
            <Link href={`/dashboard/orders/${d.order.id}`} className="inline-flex min-h-11 items-center gap-1 font-medium hover:underline lg:min-h-0" data-testid="linked-order">
              طلب <Mono>#{d.order.id}</Mono>
            </Link>
            <span className="text-muted-foreground">{d.order.status_label ?? ORDER_STATUS_LABELS[d.order.status] ?? d.order.status}</span>
            {d.order.display_total ? <Money value={d.order.display_total} className="text-xs" /> : null}
            {d.order.created_at ? <Mono className="text-[11px] text-muted-foreground">{formatDateTime(d.order.created_at)}</Mono> : null}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground">لم تتحوّل هذه المحادثة إلى طلب بعد.</p>
            <button type="button" onClick={onConvert} className="h-11 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8">
              تحويل إلى طلب
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
