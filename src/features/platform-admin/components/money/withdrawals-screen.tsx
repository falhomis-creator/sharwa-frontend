"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWithdrawalAction, useWithdrawals } from "@/features/platform-admin/api/hooks";
import { Code, ConfirmDialog, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { DetailRow, NoteField, STATUS_FILTERS, SplitView, StatusTabs, useDecisionKeys } from "@/features/platform-admin/components/money/requests-kit";
import { WITHDRAWAL_STATUS_LABELS, type RequestStatus, type Withdrawal } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/sharwa-pay/withdrawals` (M20 US-20.5 a2). The amount left the wallet when
 * the customer asked, so a pending request says so; «تأكيد التنفيذ» records the bank
 * transfer, «رفض» returns the amount (`withdrawal_reversal`) with a note. A request older
 * than 14 days carries the §8 hint that the refund lands now, not when it was asked.
 */
const parsers = {
  status: parseAsStringLiteral(STATUS_FILTERS).withDefault("pending"),
  id: parseAsInteger,
  page: parseAsInteger.withDefault(1),
};
const TONE: Record<RequestStatus, "warning" | "success" | "muted"> = { pending: "warning", approved: "success", rejected: "muted" };
const OLD_MS = 14 * 24 * 3_600_000;

export function WithdrawalsScreen() {
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const list = useWithdrawals({ status: f.status === "all" ? undefined : f.status, page: f.page, page_size: 50 });
  const rows = list.data?.results ?? [];
  const selected = rows.find((r) => r.id === f.id) ?? null;
  const [now] = useState(() => new Date());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="طلبات السحب" description="سحوبات من محافظ شروة باي إلى حساب بنكي أو محفظة — نفّذ التحويل ثم أكّده، أو ارفضه ليعود المبلغ." />
      <StatusTabs value={f.status} onChange={(s) => void setF({ status: s, page: null, id: null })} labels={WITHDRAWAL_STATUS_LABELS} />
      <SplitView
        open={selected !== null}
        onClose={() => void setF({ id: null })}
        detailTitle="تفاصيل طلب السحب"
        list={
          <div className="flex flex-col gap-3">
            {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
            {list.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : rows.length === 0 && !list.error ? (
              <EmptyState title={f.status === "pending" ? "لا طلبات معلّقة" : "لا طلبات"} />
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" data-testid="withdrawals-list">
                {rows.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => void setF({ id: w.id })}
                      aria-current={w.id === f.id ? "true" : undefined}
                      data-testid="withdrawal-row"
                      data-id={w.id}
                      className={cn("flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors hover:bg-muted md:flex-row md:items-center md:gap-4", w.id === f.id && "bg-muted")}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          <Code>{w.customer_phone}</Code>
                          {w.customer_name ? <span className="text-muted-foreground">{w.customer_name}</span> : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {w.destination} · <time dateTime={w.created_at}>{formatRelative(w.created_at, now)}</time>
                        </span>
                      </span>
                      <Money value={w.display_amount} className="text-sm" />
                      <StatusText tone={TONE[w.status]}>{WITHDRAWAL_STATUS_LABELS[w.status]}</StatusText>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.data && list.data.count > 50 ? <TablePagination page={f.page} pageSize={50} total={list.data.count} onPageChange={(p) => void setF({ page: p <= 1 ? null : p })} /> : null}
          </div>
        }
        detail={selected ? <WithdrawalDetail key={selected.id} w={selected} now={now} /> : null}
      />
    </div>
  );
}

function WithdrawalDetail({ w, now }: { w: Withdrawal; now: Date }) {
  const act = useWithdrawalAction();
  const [confirm, setConfirm] = useState<"confirm" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string>();
  const pending = w.status === "pending";
  const old = now.getTime() - Date.parse(w.created_at) > OLD_MS;

  const openConfirm = useCallback(() => pending && setConfirm("confirm"), [pending]);
  const openReject = useCallback(() => pending && setConfirm("reject"), [pending]);
  useDecisionKeys(pending && confirm === null, openConfirm, openReject);

  async function run() {
    if (!confirm) return;
    try {
      const res = await act.mutateAsync({ id: w.id, action: confirm, note: confirm === "reject" ? note : undefined });
      toastResult(res);
      setConfirm(null);
    } catch (err) {
      const body = isApiError(err) ? (err.body as { note?: string[] } | undefined) : undefined;
      if (body?.note?.[0]) {
        setNoteError(body.note[0]);
        return;
      }
      setConfirm(null);
      toastError(err);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="withdrawal-detail">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">
            طلب سحب <Mono>#{w.id}</Mono>
          </h2>
          <StatusText tone={TONE[w.status]}>{WITHDRAWAL_STATUS_LABELS[w.status]}</StatusText>
        </div>
        <Money value={w.display_amount} className="text-xl font-semibold" />
      </div>

      {pending ? (
        <p role="note" className="rounded-md border border-warning/50 px-3 py-2 text-sm" data-testid="deducted-alert">
          المبلغ مخصوم مسبقاً من المحفظة — التأكيد يسجّل التحويل فقط، والرفض يعيده.
        </p>
      ) : null}
      {pending && old ? (
        <p role="note" className="text-xs text-muted-foreground" data-testid="old-request-hint">
          طلب قديم (أكثر من 14 يوماً): عند الرفض يُعاد المبلغ إلى المحفظة الآن كحركة «إعادة سحب مرفوض».
        </p>
      ) : null}

      <dl className="rounded-lg border border-border px-3">
        <DetailRow label="هاتف العميل">
          <Link href={`/wallets/${encodeURIComponent(w.customer_phone)}`} className="hover:underline" data-testid="wallet-link">
            <Code>{w.customer_phone}</Code>
          </Link>
        </DetailRow>
        {w.customer_name ? <DetailRow label="الاسم">{w.customer_name}</DetailRow> : null}
        <DetailRow label="المبلغ والعملة">
          <Money value={w.display_amount} /> <Mono className="text-xs text-muted-foreground">{w.currency}</Mono>
        </DetailRow>
        <DetailRow label="الوجهة">{w.destination}</DetailRow>
        <DetailRow label="أُرسل">{formatDateTime(w.created_at)}</DetailRow>
        {w.decided_at ? (
          <DetailRow label="القرار">
            {formatDateTime(w.decided_at)} · <Mono>{w.decided_by}</Mono>
          </DetailRow>
        ) : null}
        {w.note ? <DetailRow label="ملاحظة">{w.note}</DetailRow> : null}
      </dl>

      {pending ? (
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 lg:h-9" onClick={openConfirm} data-testid="confirm-withdrawal">
            تأكيد التنفيذ <kbd className="ms-1 font-mono text-[11px] opacity-70">A</kbd>
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
        title={confirm === "confirm" ? `تأكيد تنفيذ السحب #${w.id}` : `رفض السحب #${w.id}`}
        description={
          <>
            العميل <Code>{w.customer_phone}</Code> · {w.destination}
          </>
        }
        impact={
          confirm === "confirm"
            ? `يُسجَّل أن ${w.display_amount} حُوِّل إلى الوجهة. المبلغ مخصوم مسبقاً — لا خصم جديد.`
            : `يُعاد ${w.display_amount} إلى محفظة العميل (withdrawal_reversal)${old ? " الآن" : ""}.`
        }
        confirmLabel={confirm === "confirm" ? "تأكيد التنفيذ" : "رفض وإعادة المبلغ"}
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
