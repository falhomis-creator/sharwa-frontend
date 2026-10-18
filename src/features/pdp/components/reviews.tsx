"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useId, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatDate, formatNumber } from "@/lib/format";
import { useShopperPhone, useSetShopperPhone } from "@/features/engagement/api";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ReviewsPageSchema, type ReviewsSummary } from "@/features/storefront/schemas/catalog";
import { PhoneOtpDialog } from "@/features/storefront/components/phone-otp-dialog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * Reviews (M10 US-10.6 → M42 US-42.3/42.4): the average in Mono, five THIN bars (no colour,
 * each one a `?rating=` filter), the count, the list with the merchant's reply nested under
 * each review, 5 first then «عرض المزيد». «أضف تقييمك» keeps the Phase 4 WhatsApp OTP
 * (owner decision 2026-10-18 — a deviation from FR-42.01) with the phone prefilled from the
 * shopper identity, and confirms that the review shows after moderation.
 */
export function Reviews({ productId, summary }: { productId: number; summary: ReviewsSummary | null | undefined }) {
  const { store, timezone } = useStorefront();
  const [formOpen, setFormOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [ratingFilter, setRatingFilter] = useQueryState("rating", parseAsInteger.withOptions({ history: "replace", scroll: false }));
  const rating = ratingFilter && ratingFilter >= 1 && ratingFilter <= 5 ? ratingFilter : null;
  const q = useInfiniteQuery({
    queryKey: storeKey(store, "product", productId, "reviews", rating ?? "all"),
    queryFn: ({ pageParam }) =>
      apiFetch(`/api/bff/catalog/products/${productId}/reviews`, ReviewsPageSchema, { query: { page: pageParam, ...(rating ? { rating } : {}) } }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
    enabled: Boolean(summary && summary.count > 0),
  });
  const total = summary?.count ?? 0;
  const reviews = q.data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="space-y-6 border-t border-border pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="reviews-title" className="text-xl font-bold md:text-2xl">
          التقييمات
        </h2>
        <Button variant="outline" className="h-11" onClick={() => setFormOpen(true)} data-testid="review-open">
          أضف تقييمك
        </Button>
      </div>
      {thanks ? (
        <p className="text-sm text-muted-foreground" data-testid="review-thanks">
          شكراً، سيظهر تقييمك بعد المراجعة إن لزم.
        </p>
      ) : null}
      {!summary || total === 0 ? (
        <p className="text-sm text-muted-foreground">لا تقييمات بعد — كن أول من يقيّم.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
          <div className="space-y-3">
            <p>
              <span className="font-mono text-4xl font-semibold tabular-nums">{summary.average_rating.toFixed(1)}</span>
              <span className="ms-2 text-sm text-muted-foreground">
                من 5 · <span className="font-mono tabular-nums">{formatNumber(total)}</span> تقييم
              </span>
            </p>
            <ul className="space-y-0.5" aria-label="توزيع التقييمات">
              {[5, 4, 3, 2, 1].map((r) => {
                const n = summary.rating_distribution[String(r)] ?? 0;
                const pct = total ? Math.round((n / total) * 100) : 0;
                const active = rating === r;
                return (
                  <li key={r}>
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={`${r} من 5 — ${n} تقييم`}
                      data-testid="rating-bar"
                      onClick={() => void setRatingFilter(active ? null : r)}
                      className={cn("flex min-h-11 w-full items-center gap-2 rounded-md px-1 text-xs hover:bg-muted/60 md:min-h-8", active && "bg-muted")}
                    >
                      <span className="w-3 font-mono tabular-nums">{r}</span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-6 text-end font-mono text-muted-foreground tabular-nums">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {rating ? (
              <Button variant="ghost" className="h-11 px-2 text-xs md:h-9" onClick={() => void setRatingFilter(null)} data-testid="rating-clear">
                عرض كل التقييمات
              </Button>
            ) : null}
          </div>
          <div>
            {rating && !q.isPending && reviews.length === 0 ? <p className="text-sm text-muted-foreground">لا تقييمات بهذا العدد من النجوم.</p> : null}
            <ul className="divide-y divide-border" data-testid="reviews-list">
              {reviews.map((r) => (
                <li key={r.id} className="space-y-2 py-4 first:pt-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{r.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at, { timeZone: timezone })}</span>
                  </div>
                  <Stars value={r.rating} />
                  <p className="text-sm leading-7">{r.comment}</p>
                  {r.admin_reply ? (
                    <div className="border-s-2 border-border ps-3 text-sm text-muted-foreground">
                      <p className="text-xs font-medium text-foreground">رد المتجر</p>
                      <p className="leading-7">{r.admin_reply}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {q.hasNextPage ? (
              <Button variant="ghost" className="h-11" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                عرض المزيد
              </Button>
            ) : null}
          </div>
        </div>
      )}
      <ReviewForm productId={productId} open={formOpen} onOpenChange={setFormOpen} onDone={() => setThanks(true)} />
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} aria-hidden className={cn("size-3.5", i <= value ? "fill-foreground text-foreground" : "text-muted-foreground/50")} />
      ))}
    </span>
  );
}

function ReviewForm({ productId, open, onOpenChange, onDone }: { productId: number; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const id = useId();
  const { store } = useStorefront();
  const shopperPhone = useShopperPhone(store).data?.phone_normalized ?? null;
  const setShopperPhone = useSetShopperPhone(store);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"write" | "verify">("write");
  const [error, setError] = useState<string | null>(null);

  // Arrow keys move the choice inside the radiogroup (WAI-ARIA radio pattern, FR-42.08).
  const onStarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, (rating || (delta > 0 ? 0 : 6)) + delta));
    setRating(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-star="${next}"]`)?.focus();
  };

  if (step === "verify") {
    return (
      <PhoneOtpDialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o);
          if (!o) setStep("write");
        }}
        title="تأكيد رقمك"
        description="نرسل رمزاً عبر واتساب لنتأكد أن التقييم من عميل حقيقي."
        purpose="review"
        confirmLabel="نشر التقييم"
        initialPhone={shopperPhone}
        onVerified={async (phone, otp) => {
          try {
            await apiFetch(`/api/bff/catalog/products/${productId}/reviews`, z.unknown(), { method: "POST", json: { rating, comment, name, phone, otp } });
          } catch (err) {
            if (isApiError(err) && err.status === 429) toast.error("حاول بعد دقيقة.");
            throw err;
          }
          // The verified number becomes the shopper identity too (wishlist, back-in-stock).
          if (!shopperPhone) setShopperPhone.mutate(phone, { onError: () => undefined });
          setStep("write");
          setRating(0);
          setComment("");
          onDone();
        }}
      />
    );
  }
  if (!open) return null;
  return (
    <form
      className="store-frame space-y-4 rounded-lg border-border p-5"
      data-testid="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setError("اختر عدد النجوم.");
        if (comment.trim().length < 3) return setError("اكتب تعليقاً قصيراً.");
        setError(null);
        setStep("verify");
      }}
    >
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-medium">تقييمك</legend>
        <div className="flex" role="radiogroup" aria-label="التقييم من 5" onKeyDown={onStarKey} data-testid="review-stars">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} من 5`}
              data-star={i}
              tabIndex={rating === i || (!rating && i === 1) ? 0 : -1}
              onClick={() => setRating(i)}
              className="flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <StarIcon aria-hidden className={cn("size-8 md:size-5", i <= rating ? "fill-foreground text-foreground" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${id}-name`} className="block space-y-1 text-sm">
        <span className="font-medium">الاسم (اختياري)</span>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} className="store-frame h-11 w-full rounded-lg border-input bg-background px-3 text-base outline-none md:text-sm" />
      </label>
      <label htmlFor={`${id}-comment`} className="block space-y-1 text-sm">
        <span className="font-medium">تعليقك</span>
        <textarea id={`${id}-comment`} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className="store-frame w-full rounded-lg border-input bg-background px-3 py-2 text-base outline-none md:text-sm" />
        <span className="block text-end font-mono text-xs text-muted-foreground tabular-nums" dir="ltr">
          {comment.length}/1000
        </span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" className="h-11">
          متابعة
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
