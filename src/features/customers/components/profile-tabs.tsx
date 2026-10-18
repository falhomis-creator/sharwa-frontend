"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { FinancialStatus, FulfillmentDot } from "@/features/orders/components/order-status";
import {
  useAddNote,
  useCustomerNotes,
  useCustomerOrders,
  useCustomerPoints,
  useCustomerReviews,
  useCustomerWallet,
  useCustomerWishlist,
  useDeleteNote,
  useReplyReview,
} from "@/features/customers/api";
import {
  POINTS_TYPE_LABELS,
  WALLET_REASON_LABELS,
  noteFormSchema,
  replyFormSchema,
  type CustomerDetail,
  type NoteForm,
  type ReplyForm,
  type Review,
} from "@/features/customers/schemas";

/** The six profile tabs (`?tab=`, US-07.2). Each fetches only when it is the open tab. */
function TabState({ query, empty, children }: { query: { isLoading: boolean; error: unknown; refetch: () => unknown }; empty: ReactNode | null; children: ReactNode }) {
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy data-testid="tab-loading">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{empty ?? children}</>;
}

// ── Orders ───────────────────────────────────────────────────────────────────────────
export function OrdersTab({ customer }: { customer: CustomerDetail }) {
  const query = useCustomerOrders(customer.phone, true);
  const [now] = useState(() => new Date());
  const rows = query.data?.results ?? [];
  return (
    <TabState query={query} empty={query.data && rows.length === 0 ? <EmptyState title="لا طلبات حديثة لهذا العميل" description={`عدد طلباته الإجمالي ${customer.orders_count}؛ الأقدم منها مؤرشفة خارج قائمة الطلبات الحالية.`} /> : null}>
      <section className="flex flex-col gap-2" aria-label="طلبات العميل" data-testid="tab-orders">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/orders?order=${o.id}`} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm hover:bg-muted/50" data-testid="customer-order-row">
                <Mono className="font-medium">#{o.id}</Mono>
                <FinancialStatus status={o.status} />
                <FulfillmentDot status={o.fulfillment_status} className="text-xs text-muted-foreground" />
                <time dateTime={o.created_at} title={formatDateTime(o.created_at)} className="text-xs text-muted-foreground">
                  {formatRelative(o.created_at, now)}
                </time>
                <Money value={o.display_total} className="ms-auto" />
              </Link>
            </li>
          ))}
        </ul>
        {query.data && query.data.count < customer.orders_count ? (
          <p className="text-xs text-muted-foreground">
            يظهر هنا <Mono>{formatNumber(query.data.count)}</Mono> من أصل <Mono>{formatNumber(customer.orders_count)}</Mono> طلباً؛ الأقدم مؤرشفة.
          </p>
        ) : null}
        <Link href={`/dashboard/orders?q=${customer.phone}`} className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          كل طلباته في قائمة الطلبات
        </Link>
      </section>
    </TabState>
  );
}

// ── Wallet ───────────────────────────────────────────────────────────────────────────
export function WalletTab({ customer }: { customer: CustomerDetail }) {
  const query = useCustomerWallet(customer.phone, true);
  const { canFeature } = useAccess();
  const [now] = useState(() => new Date());
  const data = query.data;
  const canCreate = canFeature("customer_wallets");
  return (
    <TabState
      query={query}
      empty={
        data && !data.wallet ? (
          <EmptyState
            title="لا محفظة"
            description="لا محفظة لهذا العميل في متجرك بعد. الرصيد بالريال السعودي فقط."
            action={
              canCreate ? (
                <Link href={`/dashboard/customers/wallets/new?phone=${customer.phone}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} data-testid="create-wallet">
                  إنشاء محفظة
                </Link>
              ) : null
            }
          />
        ) : null
      }
    >
      {data?.wallet ? (
        <section className="flex flex-col gap-3" aria-label="محفظة العميل" data-testid="tab-wallet">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">الرصيد{data.wallet.is_active ? "" : " · المحفظة معطّلة"}</span>
              <Money value={data.wallet.display_balance} className="text-2xl font-semibold" />
            </div>
            <Link href={`/dashboard/customers/wallets/${data.wallet.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} data-testid="manage-wallet">
              إدارة المحفظة
            </Link>
          </div>
          {data.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا حركات بعد.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">آخر {formatNumber(data.results.length)} حركات</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {data.results.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm" data-testid="wallet-row" data-reason={t.reason}>
                    <span className="font-medium">{WALLET_REASON_LABELS[t.reason]}</span>
                    {t.reference ? <span className="text-xs text-muted-foreground">{t.reference.label}</span> : null}
                    <time dateTime={t.created_at} title={formatDateTime(t.created_at)} className="text-xs text-muted-foreground">
                      {formatRelative(t.created_at, now)}
                    </time>
                    <span className="ms-auto flex items-baseline gap-3">
                      <Money value={t.display_amount} className={Number(t.amount) >= 0 ? "text-success" : "text-destructive"} />
                      <span className="text-xs text-muted-foreground">
                        بعد: <Money value={t.display_balance_after} muted />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}
    </TabState>
  );
}

// ── Points ───────────────────────────────────────────────────────────────────────────
export function PointsTab({ customer }: { customer: CustomerDetail }) {
  const query = useCustomerPoints(customer.phone, true);
  const [now] = useState(() => new Date());
  const data = query.data;
  return (
    <TabState query={query} empty={null}>
      {data ? (
        <section className="flex flex-col gap-3" aria-label="نقاط العميل" data-testid="tab-points">
          {!data.program_enabled ? (
            <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground" data-testid="loyalty-off">
              برنامج الولاء غير مفعّل — النقاط والحركات للقراءة فقط.
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">الرصيد</span>
              <Mono className="text-2xl font-semibold" data-testid="points-balance">
                {formatNumber(data.balance)}
              </Mono>
            </div>
            {data.display_riyal_equivalent ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  يعادل عند الاستبدال (<Mono>{data.points_per_riyal_redemption}</Mono> نقطة = ر.س)
                </span>
                <Money value={data.display_riyal_equivalent} className="text-base" />
              </div>
            ) : null}
          </div>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا حركات نقاط بعد — تُكتسب النقاط مع كل طلب مكتمل.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.transactions.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm" data-testid="points-row">
                  <span className="font-medium">{POINTS_TYPE_LABELS[t.type]}</span>
                  {t.order_id ? (
                    <Link href={`/dashboard/orders?order=${t.order_id}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                      #{t.order_id}
                    </Link>
                  ) : null}
                  <time dateTime={t.created_at} className="text-xs text-muted-foreground">
                    {formatRelative(t.created_at, now)}
                  </time>
                  <Mono className={cn("ms-auto", t.type === "earn" ? "text-success" : "text-foreground")}>
                    {t.type === "earn" ? "+" : "-"}
                    {formatNumber(t.points)}
                  </Mono>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </TabState>
  );
}

// ── Wishlist ─────────────────────────────────────────────────────────────────────────
export function WishlistTab({ customer }: { customer: CustomerDetail }) {
  const query = useCustomerWishlist(customer.phone, true);
  const [now] = useState(() => new Date());
  const rows = query.data ?? [];
  return (
    <TabState query={query} empty={query.data && rows.length === 0 ? <EmptyState title="لا أمنيات ولا طلبات إشعار توفر" description="ما يحفظه العميل في «أمنياتي» أو يطلب إشعاره عند توفره يظهر هنا." /> : null}>
      <ul className="divide-y divide-border rounded-lg border border-border" aria-label="أمنيات العميل" data-testid="tab-wishlist">
        {rows.map((r) => (
          <li key={r.product_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm" data-testid="wishlist-row">
            {r.product ? (
              <Link href={`/dashboard/products/${r.product.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                {r.product.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">منتج لم يعد متاحاً</span>
            )}
            {r.product && r.product.stock <= 0 ? <span className="text-xs text-warning">نفد</span> : null}
            <span className="text-xs text-muted-foreground">
              {r.in_wishlist && r.added_at ? <>أُضيف {formatRelative(r.added_at, now)}</> : "إشعار توفر فقط"}
            </span>
            {r.back_in_stock_requested ? (
              <span className="flex items-center gap-1.5 text-xs" data-testid="back-in-stock">
                <span aria-hidden className="size-1.5 rounded-full bg-info" />
                طلب إشعار عند التوفر
              </span>
            ) : null}
            {r.product ? <Money value={r.product.display_price} className="ms-auto" /> : null}
          </li>
        ))}
      </ul>
    </TabState>
  );
}

// ── Reviews ──────────────────────────────────────────────────────────────────────────
export function ReviewsTab({ customer }: { customer: CustomerDetail }) {
  const query = useCustomerReviews(customer.phone, true);
  const rows = query.data ?? [];
  return (
    <TabState query={query} empty={query.data && rows.length === 0 ? <EmptyState title="لا تقييمات من هذا العميل" description="تقييماته للمنتجات وردّك عليها تظهر هنا." /> : null}>
      <ul className="flex flex-col gap-3" aria-label="تقييمات العميل" data-testid="tab-reviews">
        {rows.map((r) => (
          <ReviewItem key={r.id} review={r} phone={customer.phone} />
        ))}
      </ul>
    </TabState>
  );
}

function ReviewItem({ review, phone }: { review: Review; phone: string }) {
  const { canPermission } = useAccess();
  const canReply = canPermission("customers.edit_profile");
  const [editing, setEditing] = useState(false);
  const mutation = useReplyReview(phone);
  const form = useForm<ReplyForm>({ resolver: zodResolver(replyFormSchema), defaultValues: { admin_reply: review.admin_reply ?? "" } });

  async function submit(values: ReplyForm) {
    try {
      await mutation.mutateAsync({ id: review.id, admin_reply: values.admin_reply });
      toast.success(values.admin_reply ? "نُشر الرد تحت التقييم" : "حُذف الرد");
      setEditing(false);
    } catch (err) {
      if (isApiError(err) && err.fields?.admin_reply?.[0]) form.setError("admin_reply", { message: err.fields.admin_reply[0] }, { shouldFocus: true });
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر الاتصال");
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm" data-testid="review-row" data-review-id={review.id}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Mono className="font-medium" aria-label={`التقييم ${review.rating} من 5`}>
          {review.rating}/5
        </Mono>
        <Link href={`/dashboard/products/${review.product.id}`} className="font-medium underline-offset-4 hover:underline">
          {review.product.name}
        </Link>
        <time dateTime={review.created_at} className="text-xs text-muted-foreground">
          {formatDateTime(review.created_at)}
        </time>
        {!review.approved ? <span className="text-xs text-warning">بانتظار المراجعة</span> : null}
      </div>
      <p>{review.comment}</p>
      {editing ? (
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-2" noValidate>
          <Field label="ردّ المتجر (يظهر للعملاء تحت التقييم)" htmlFor={`reply-${review.id}`} error={form.formState.errors.admin_reply?.message}>
            <Textarea id={`reply-${review.id}`} rows={2} {...form.register("admin_reply")} data-testid="reply-input" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="h-11 lg:h-8" disabled={mutation.isPending} data-testid="reply-save">
              {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الرد"}
            </Button>
            <Button type="button" variant="ghost" className="h-11 lg:h-8" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2 border-s-2 border-border ps-3">
          {review.admin_reply ? (
            <p className="text-muted-foreground" data-testid="admin-reply">
              <span className="text-xs">ردّ المتجر: </span>
              {review.admin_reply}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">لا رد بعد.</p>
          )}
          <Button
            variant="outline"
            className="h-11 lg:h-8"
            disabled={!canReply}
            title={canReply ? undefined : "تحتاج صلاحية تعديل ملف العميل"}
            onClick={() => setEditing(true)}
            data-testid="reply-open"
          >
            {review.admin_reply ? "تعديل الرد" : "ردّ"}
          </Button>
        </div>
      )}
    </li>
  );
}

// ── Notes ────────────────────────────────────────────────────────────────────────────
export function NotesTab({ customer, onInputRef }: { customer: CustomerDetail; onInputRef?: (el: HTMLTextAreaElement | null) => void }) {
  const query = useCustomerNotes(customer.phone, true);
  const add = useAddNote(customer.phone);
  const remove = useDeleteNote(customer.phone);
  const [now] = useState(() => new Date());
  const form = useForm<NoteForm>({ resolver: zodResolver(noteFormSchema), defaultValues: { body: "" } });
  const { ref: registerRef, ...bodyField } = form.register("body");

  async function submit(values: NoteForm) {
    try {
      await add.mutateAsync({ body: values.body });
      form.reset({ body: "" });
      toast.success("حُفظت الملاحظة");
    } catch (err) {
      if (isApiError(err) && err.fields?.body?.[0]) form.setError("body", { message: err.fields.body[0] }, { shouldFocus: true });
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر الاتصال");
    }
  }

  async function del(id: number) {
    try {
      await remove.mutateAsync(id);
      toast.success("حُذفت الملاحظة");
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الاتصال");
    }
  }

  const rows = query.data ?? [];
  return (
    <section className="flex flex-col gap-4" aria-label="ملاحظات داخلية" data-testid="tab-notes">
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-2" noValidate>
        <Field label="ملاحظة جديدة" htmlFor="note-body" hint="داخلية فقط — لا تظهر للعميل في أي مكان. الاختصار N." error={form.formState.errors.body?.message}>
          <Textarea
            id="note-body"
            rows={3}
            {...bodyField}
            ref={(el) => {
              registerRef(el);
              onInputRef?.(el);
            }}
            aria-invalid={Boolean(form.formState.errors.body)}
            data-testid="note-input"
          />
        </Field>
        <Button type="submit" className="h-11 self-start lg:h-8" disabled={add.isPending} data-testid="note-save">
          {add.isPending ? "جارٍ الحفظ…" : "حفظ الملاحظة"}
        </Button>
      </form>
      <TabState query={query} empty={query.data && rows.length === 0 ? <p className="text-sm text-muted-foreground">لا ملاحظات بعد.</p> : null}>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-3 py-2 text-sm" data-testid="note-row">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="whitespace-pre-wrap break-words">{n.body}</p>
                <span className="text-xs text-muted-foreground">
                  {n.author} · <time dateTime={n.created_at} title={formatDateTime(n.created_at)}>{formatRelative(n.created_at, now)}</time>
                </span>
              </div>
              {n.can_delete ? (
                <Button variant="ghost" className="h-11 shrink-0 text-muted-foreground lg:h-8" onClick={() => void del(n.id)} disabled={remove.isPending} data-testid="note-delete">
                  حذف
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </TabState>
    </section>
  );
}
