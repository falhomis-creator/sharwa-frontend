"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBox, TablePagination } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTopupAction, useTopups } from "@/features/platform-admin/api/hooks";
import { Code, ConfirmDialog, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { DetailRow, NoteField, STATUS_FILTERS, SplitView, StatusTabs, useDecisionKeys } from "@/features/platform-admin/components/money/requests-kit";
import { TOPUP_STATUS_LABELS, type RequestStatus, type Topup } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/sharwa-pay/topups` (M20 US-20.5 a1/a3). Pending first; open a request to
 * see the transfer and the receipt, then «قبول» (credits the wallet, `topup_manual`) or
 * «رفض» (a note the customer reads). A transfer id already used by an approved request is
 * refused by the server — the error links to that request.
 *
 * Operators may act here (FR-20.09: Sharwa Pay is theirs too).
 */
const parsers = {
  status: parseAsStringLiteral(STATUS_FILTERS).withDefault("pending"),
  q: parseAsString.withDefault(""),
  id: parseAsInteger,
  page: parseAsInteger.withDefault(1),
};
const TONE: Record<RequestStatus, "warning" | "success" | "muted"> = { pending: "warning", approved: "success", rejected: "muted" };

export function TopupsScreen() {
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const list = useTopups({ status: f.status === "all" ? undefined : f.status, q: f.q || undefined, page: f.page, page_size: 50 });
  const rows = list.data?.results ?? [];
  const selected = rows.find((r) => r.id === f.id) ?? null;
  const [now] = useState(() => new Date());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="طلبات شحن شروة باي" description="تحويلات بنكية يرفع العملاء إيصالها — راجع الحوالة ثم اقبلها أو ارفضها." />
      <StatusTabs value={f.status} onChange={(s) => void setF({ status: s, page: null, id: null })} labels={TOPUP_STATUS_LABELS} />
      <SplitView
        open={selected !== null}
        onClose={() => void setF({ id: null })}
        detailTitle="تفاصيل طلب الشحن"
        list={
          <div className="flex flex-col gap-3">
            <SearchBox value={f.q} onChange={(v) => void setF({ q: v || null, page: null })} placeholder="هاتف العميل أو رقم الحوالة" label="بحث في طلبات الشحن" className="md:max-w-sm" />
            {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
            {list.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : rows.length === 0 && !list.error ? (
              <EmptyState title={f.status === "pending" ? "لا طلبات معلّقة" : "لا طلبات"} description={f.q ? "غيّر البحث." : undefined} />
            ) : (
              <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden" data-testid="topups-list">
                {rows.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => void setF({ id: t.id })}
                      aria-current={t.id === f.id ? "true" : undefined}
                      data-testid="topup-row"
                      data-id={t.id}
                      className={cn("flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors hover:bg-muted md:flex-row md:items-center md:gap-4", t.id === f.id && "bg-muted")}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          <Code>{t.customer_phone}</Code>
                          {t.customer_name ? <span className="text-muted-foreground">{t.customer_name}</span> : null}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {t.bank_name} · <Code>{t.bank_transaction_id}</Code> · <time dateTime={t.created_at}>{formatRelative(t.created_at, now)}</time>
                        </span>
                      </span>
                      <Money value={t.display_amount} className="text-sm" />
                      <StatusText tone={TONE[t.status]}>{TOPUP_STATUS_LABELS[t.status]}</StatusText>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.data && list.data.count > 50 ? <TablePagination page={f.page} pageSize={50} total={list.data.count} onPageChange={(p) => void setF({ page: p <= 1 ? null : p })} /> : null}
          </div>
        }
        detail={selected ? <TopupDetail key={selected.id} topup={selected} onShow={(id) => void setF({ status: "all", q: null, id, page: null })} /> : null}
      />
    </div>
  );
}

function TopupDetail({ topup: t, onShow }: { topup: Topup; onShow: (id: number) => void }) {
  const act = useTopupAction();
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string>();
  const [dup, setDup] = useState<{ detail: string; id: number } | null>(null);
  const [zoom, setZoom] = useState(false);
  const pending = t.status === "pending";

  const openApprove = useCallback(() => pending && setConfirm("approve"), [pending]);
  const openReject = useCallback(() => pending && setConfirm("reject"), [pending]);
  useDecisionKeys(pending && confirm === null, openApprove, openReject);

  async function run() {
    if (!confirm) return;
    try {
      const res = await act.mutateAsync({ id: t.id, action: confirm, note: confirm === "reject" ? note : undefined });
      toastResult(res);
      setConfirm(null);
      setDup(null);
    } catch (err) {
      const body = isApiError(err) ? (err.body as { duplicate_of?: number; note?: string[] } | undefined) : undefined;
      if (isApiError(err) && body?.note?.[0]) {
        setNoteError(body.note[0]);
        return;
      }
      setConfirm(null);
      if (isApiError(err) && body?.duplicate_of) setDup({ detail: err.userMessage, id: body.duplicate_of });
      toastError(err);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="topup-detail">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">
            طلب شحن <Mono>#{t.id}</Mono>
          </h2>
          <StatusText tone={TONE[t.status]}>{TOPUP_STATUS_LABELS[t.status]}</StatusText>
        </div>
        <Money value={t.display_amount} className="text-xl font-semibold" />
      </div>

      <dl className="surface-card px-3">
        <DetailRow label="هاتف العميل">
          <Link href={`/wallets/${encodeURIComponent(t.customer_phone)}`} className="hover:underline" data-testid="wallet-link">
            <Code>{t.customer_phone}</Code>
          </Link>
        </DetailRow>
        {t.customer_name ? <DetailRow label="الاسم">{t.customer_name}</DetailRow> : null}
        <DetailRow label="المبلغ والعملة">
          <Money value={t.display_amount} /> <Mono className="text-xs text-muted-foreground">{t.currency}</Mono>
        </DetailRow>
        <DetailRow label="البنك">{t.bank_name}</DetailRow>
        <DetailRow label="رقم الحوالة (bank_transaction_id)">
          <Code>{t.bank_transaction_id}</Code>
        </DetailRow>
        <DetailRow label="أُرسل">{formatDateTime(t.created_at)}</DetailRow>
        {t.decided_at ? (
          <DetailRow label="القرار">
            {formatDateTime(t.decided_at)} · <Mono>{t.decided_by}</Mono>
          </DetailRow>
        ) : null}
        {t.note ? <DetailRow label="ملاحظة">{t.note}</DetailRow> : null}
      </dl>

      <Receipt topup={t} zoom={zoom} onToggle={() => setZoom((z) => !z)} />

      {dup ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive" data-testid="duplicate-alert">
          <span>{dup.detail}</span>
          <button type="button" className="self-start text-foreground underline underline-offset-4" onClick={() => onShow(dup.id)} data-testid="duplicate-link">
            عرض الطلب السابق #{dup.id}
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 lg:h-9" onClick={openApprove} data-testid="approve">
            قبول <kbd className="ms-1 font-mono text-[11px] opacity-70">A</kbd>
          </Button>
          <Button variant="outline" className="h-11 text-muted-foreground lg:h-9" onClick={openReject} data-testid="reject">
            رفض <kbd className="ms-1 font-mono text-[11px] opacity-70">R</kbd>
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null);
            setNoteError(undefined);
          }
        }}
        title={confirm === "approve" ? `قبول طلب الشحن #${t.id}` : `رفض طلب الشحن #${t.id}`}
        description={
          <>
            العميل <Code>{t.customer_phone}</Code> · الحوالة <Code>{t.bank_transaction_id}</Code>
          </>
        }
        impact={confirm === "approve" ? `يُضاف ${t.display_amount} إلى محفظة شروة باي للعميل (topup_manual).` : "يُرفض الطلب ولا يُضاف أي مبلغ؛ يصل السبب للعميل."}
        confirmLabel={confirm === "approve" ? "قبول" : "رفض"}
        destructive={confirm === "reject"}
        pending={act.isPending}
        onConfirm={() => void run()}
      >
        {confirm === "reject" ? (
          <NoteField
            value={note}
            onChange={(v) => {
              setNote(v);
              setNoteError(undefined);
            }}
            error={noteError}
          />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/** Django's upload is a same-origin `/media/…` path (proxied to Django, INT-031); the mock carries a key. */
function receiptUrl(value: string): string | null {
  return value.startsWith("/media/") || /^https?:\/\//.test(value) ? value : null;
}

/**
 * The uploaded receipt photo when there is one (live), else a neutral bordered figure with the
 * bank, amount and transfer id (mock key, or a bank-webhook top-up with no photo). «تكبير»
 * enlarges it so the transfer id and amount can be compared side by side (US-20.5 a1).
 */
function Receipt({ topup: t, zoom, onToggle }: { topup: Topup; zoom: boolean; onToggle: () => void }) {
  const url = receiptUrl(t.receipt_image);
  return (
    <figure className="flex flex-col gap-2" data-testid="receipt">
      {url ? (
        <div className={cn("relative overflow-hidden rounded-md border border-border bg-muted/40 transition-[height]", zoom ? "h-96" : "h-40")} data-testid="receipt-figure" data-zoom={zoom}>
          <Image src={url} alt={`إيصال التحويل ${t.bank_transaction_id || `#${t.id}`}`} fill sizes="(min-width: 1024px) 28rem, 100vw" className="object-contain" unoptimized data-testid="receipt-image" />
        </div>
      ) : (
      <div className={cn("flex flex-col justify-between rounded-md border border-border bg-muted/40 p-4 transition-[height]", zoom ? "h-96" : "h-40")} data-testid="receipt-figure" data-zoom={zoom}>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.bank_name}</span>
          <Mono>{t.receipt_image}</Mono>
        </div>
        <div className={cn("flex flex-col items-center gap-2", zoom ? "text-2xl" : "text-base")}>
          <Money value={t.display_amount} className="font-semibold" />
          <Mono className={zoom ? "text-lg" : "text-xs"}>{t.bank_transaction_id}</Mono>
        </div>
        <span className="self-end text-[11px] text-muted-foreground">{formatDateTime(t.created_at)}</span>
      </div>
      )}
      <figcaption className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{url || t.receipt_image ? "صورة الإيصال المرفوعة" : "لا صورة إيصال — حوالة بنكية آلية أو بلا مرفق"}</span>
        <Button variant="ghost" size="sm" className="h-11 lg:h-7" onClick={onToggle} aria-pressed={zoom} data-testid="receipt-zoom">
          {zoom ? "تصغير" : "تكبير"}
        </Button>
      </figcaption>
    </figure>
  );
}
