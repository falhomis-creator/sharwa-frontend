"use client";

import { useState } from "react";
import { ChevronDown, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { compareDecimal, isDecimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import {
  FINANCIAL_TRANSITIONS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  REFUND_METHODS,
  REFUND_METHOD_LABELS,
  refundInputSchema,
  type OrderDetail,
  type OrderStatus,
} from "@/features/orders/schemas";
import { ordersApi, useOrderFormOptions } from "@/features/orders/api";
import type { useOrderWrite } from "@/features/orders/hooks/use-order-write";

type Write = ReturnType<typeof useOrderWrite>;

/**
 * Detail actions (T077): financial status (legal targets only, others disabled with a hint;
 * `refunded` only through the refund flow; stock warnings on cancel/re-activate), payment
 * confirmation / review with the receipt diff, the refund form, «تحويل إلى استلام» and the
 * gift note. Each one is a single versioned write through `useOrderWrite`.
 */
function financialHint(from: OrderStatus, to: OrderStatus): string | null {
  if (to === from) return "الحالة الحالية";
  if (to === "refunded") return "استخدم مسار الاسترجاع";
  if (!FINANCIAL_TRANSITIONS[from].includes(to)) return "انتقال غير مسموح من الحالة الحالية";
  return null;
}

function stockWarning(from: OrderStatus, to: OrderStatus): string | null {
  if (from === "cancelled" && (to === "new" || to === "completed")) return "سيُخصم المخزون مجدداً لعناصر هذا الطلب.";
  if (to === "cancelled") return "سيُعاد المخزون لعناصر هذا الطلب، ويتوقف تنفيذه.";
  return null;
}

export function FinancialStatusControl({ order, write, canEdit }: { order: OrderDetail; write: Write; canEdit: boolean }) {
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const disabled = !canEdit || Boolean(order.locked_reason) || order.status === "refunded";

  function apply(to: OrderStatus) {
    void write.run(order.id, order.version, (v) => ordersApi.setStatus(order.id, to, v), {
      success: `أصبحت الحالة المالية «${ORDER_STATUS_LABELS[to]}»`,
      label: `الحالة المالية → ${ORDER_STATUS_LABELS[to]}`,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          title={disabled ? (order.locked_reason ?? (canEdit ? "طلب مسترد" : "ليست لديك صلاحية تغيير حالة الطلب.")) : undefined}
          className="inline-flex h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 lg:h-8"
          data-testid="financial-trigger"
        >
          تغيير الحالة المالية <ChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>الحالة المالية</DropdownMenuLabel>
            {ORDER_STATUSES.map((s) => {
              const hint = financialHint(order.status, s);
              return (
                <DropdownMenuItem
                  key={s}
                  disabled={hint !== null}
                  className="flex-col items-start gap-0.5"
                  onClick={() => (stockWarning(order.status, s) ? setConfirm(s) : apply(s))}
                  data-testid={`financial-option-${s}`}
                >
                  {ORDER_STATUS_LABELS[s]}
                  {hint && hint !== "الحالة الحالية" ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm ? (
        <Dialog open onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent className="sm:max-w-sm" data-testid="financial-confirm">
            <DialogTitle>
              {ORDER_STATUS_LABELS[order.status]} ← {ORDER_STATUS_LABELS[confirm]}
            </DialogTitle>
            <DialogDescription>{stockWarning(order.status, confirm)}</DialogDescription>
            <DialogFooter>
              <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setConfirm(null)}>
                إلغاء
              </Button>
              <Button
                size="lg"
                variant={confirm === "cancelled" ? "destructive" : "default"}
                className="h-11 lg:h-9"
                onClick={() => {
                  apply(confirm);
                  setConfirm(null);
                }}
              >
                تأكيد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/** US-06.4: receipt preview (zoomable), reported vs required, diff in a semantic colour. */
export function PaymentReview({ order, write, canEdit }: { order: OrderDetail; write: Write; canEdit: boolean }) {
  const [zoom, setZoom] = useState(false);
  const receipt = order.payment_receipt;
  const awaiting = order.status === "awaiting_payment" || order.status === "pending_payment";
  const review = order.status === "payment_review";
  if (!receipt && !awaiting && !review) return null;

  function act(action: "confirm" | "approve" | "reject") {
    const labels = { confirm: "تأكيد استلام الدفع", approve: "قبول المراجعة", reject: "رفض الدفع" } as const;
    void write.run(order.id, order.version, (v) => ordersApi.payment(order.id, action, v), {
      success: action === "reject" ? "رُفض الدفع؛ أُبلغ العميل" : "تأكّد الدفع",
      label: labels[action],
    });
  }

  const tone = receipt?.difference_sign === "under" ? "text-destructive" : receipt?.difference_sign === "over" ? "text-warning" : "text-success";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-labelledby="payment-review" data-testid="payment-review">
      <h3 id="payment-review" className="text-sm font-medium">
        {review ? "مراجعة الدفع" : "بانتظار تأكيد الدفع"}
      </h3>
      {receipt ? (
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="relative flex size-24 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground"
            aria-label="معاينة الإيصال مكبَّراً"
          >
            {receipt.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- receipt media URLs are signed per request
              <img src={receipt.image} alt="إيصال التحويل" className="size-full rounded-md object-cover" />
            ) : (
              "الإيصال"
            )}
            <ZoomIn className="absolute bottom-1 end-1 size-3.5" aria-hidden />
          </button>
          <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">المبلغ المُبلَّغ عنه</dt>
            <dd className="text-end">
              <Money value={receipt.display_reported_amount} />
            </dd>
            <dt className="text-muted-foreground">المطلوب</dt>
            <dd className="text-end">
              <Money value={receipt.display_required_amount} />
            </dd>
            <dt className="text-muted-foreground">الفرق</dt>
            <dd className={cn("text-end", tone)} data-testid="receipt-diff" data-sign={receipt.difference_sign}>
              {receipt.difference_sign === "exact" ? "مطابق" : <Money value={receipt.display_difference} />}
              {receipt.difference_sign === "under" ? <span className="ms-1 text-xs">أقل</span> : receipt.difference_sign === "over" ? <span className="ms-1 text-xs">أكثر</span> : null}
            </dd>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">لم يُرفع إيصال بعد.</p>
      )}
      {canEdit && !order.locked_reason ? (
        <div className="flex flex-wrap gap-2">
          {review ? (
            <>
              <Button size="lg" className="h-11 lg:h-8" disabled={write.pending} onClick={() => act("approve")} data-testid="payment-approve">
                قبول المراجعة
              </Button>
              <Button size="lg" variant="outline" className="h-11 lg:h-8" disabled={write.pending} onClick={() => act("reject")}>
                رفض المراجعة
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" className="h-11 lg:h-8" disabled={write.pending} onClick={() => act("confirm")} data-testid="payment-confirm">
                تأكيد الاستلام
              </Button>
              <Button size="lg" variant="outline" className="h-11 lg:h-8" disabled={write.pending} onClick={() => act("reject")}>
                رفض
              </Button>
            </>
          )}
        </div>
      ) : null}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>إيصال التحويل</DialogTitle>
          {receipt?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- see above
            <img src={receipt.image} alt="إيصال التحويل" className="max-h-[70dvh] w-full rounded-md object-contain" />
          ) : (
            <div className="flex aspect-[3/4] max-h-[60dvh] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              صورة الإيصال غير متاحة في البيانات التجريبية
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** US-06.7: amount (≤ refundable, checked client-side and by the server), method, reason. */
export function RefundDialog({ order, write, open, onOpenChange }: { order: OrderDetail; write: Write; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof REFUND_METHODS)[number]>("wallet");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const parsed = refundInputSchema.safeParse({ amount, method, reason });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (isDecimal(amount) && compareDecimal(amount, order.refundable_amount) > 0) {
      setErrors({ amount: `أعلى مبلغ قابل للاسترجاع ${order.refundable_amount}` });
      return;
    }
    setErrors({});
    const res = await write.run(order.id, order.version, (v) => ordersApi.refund(order.id, parsed.data, v), {
      success: "سُجِّل الاسترجاع",
      label: `استرجاع ${amount}`,
    });
    if (res) {
      onOpenChange(false);
      setAmount("");
      setReason("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="refund-dialog">
        <DialogTitle>استرجاع مبلغ — #{order.id}</DialogTitle>
        <DialogDescription>
          القابل للاسترجاع: <Money value={order.refundable_amount} /> · المسار المالي فقط؛ إرجاع البضاعة من «المرتجعات».
        </DialogDescription>
        <form
          id="refund-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field label="المبلغ" htmlFor="refund-amount" required error={errors.amount}>
            <input id="refund-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={numericInputClass} aria-invalid={Boolean(errors.amount)} />
          </Field>
          <Field label="الطريقة" htmlFor="refund-method" error={errors.method}>
            <NativeSelect id="refund-method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="h-11 lg:h-8">
              {REFUND_METHODS.map((m) => (
                <option key={m} value={m}>
                  {REFUND_METHOD_LABELS[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="السبب" htmlFor="refund-reason" required error={errors.reason}>
            <input id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} aria-invalid={Boolean(errors.reason)} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" form="refund-form" size="lg" className="h-11 lg:h-9" disabled={write.pending} data-testid="refund-submit">
            استرجاع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PickupDialog({ order, write, open, onOpenChange }: { order: OrderDetail; write: Write; open: boolean; onOpenChange: (o: boolean) => void }) {
  const options = useOrderFormOptions(open);
  const [loc, setLoc] = useState("");
  const locations = options.data?.pickup_locations ?? [];
  const value = loc || String(locations[0]?.id ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>تحويل إلى استلام</DialogTitle>
        <DialogDescription>يُلغى التوصيل ورسومه، ويستلم العميل الطلب من النقطة المختارة.</DialogDescription>
        <NativeSelect value={value} onChange={(e) => setLoc(e.target.value)} aria-label="نقطة الاستلام" className="h-11 lg:h-8">
          {locations.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.address}
            </option>
          ))}
        </NativeSelect>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            size="lg"
            className="h-11 lg:h-9"
            disabled={!value || write.pending}
            onClick={async () => {
              const res = await write.run(order.id, order.version, (v) => ordersApi.patch(order.id, { pickup_location_id: Number(value) }, v), {
                success: "حُوِّل الطلب إلى استلام",
                label: "تحويل إلى استلام",
              });
              if (res) onOpenChange(false);
            }}
          >
            تحويل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GiftNoteDialog({ order, write, open, onOpenChange }: { order: OrderDetail; write: Write; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [message, setMessage] = useState(order.gift_message ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>رسالة الهدية</DialogTitle>
        <DialogDescription>تُطبع مع البوليصة، ولا تظهر قيمة الطلب للمستلم.</DialogDescription>
        <Field label="الرسالة" htmlFor="gift-message" counter={{ value: message.length, max: 500 }}>
          <textarea
            id="gift-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            size="lg"
            className="h-11 lg:h-9"
            disabled={message.length > 500 || write.pending}
            onClick={async () => {
              const res = await write.run(order.id, order.version, (v) => ordersApi.patch(order.id, { gift_message: message }, v), {
                success: "حُفظت رسالة الهدية",
                label: "رسالة الهدية",
              });
              if (res) onOpenChange(false);
            }}
          >
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
