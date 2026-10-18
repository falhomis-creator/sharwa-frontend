"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatNumber } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ReviewsPageSchema, type ReviewsSummary } from "@/features/storefront/schemas/catalog";
import { PhoneOtpDialog } from "@/features/storefront/components/phone-otp-dialog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * Reviews (M10 US-10.6): the average in Mono, five THIN zinc bars (no colour), the count,
 * the list with the merchant's reply nested under each review. «أضف تقييمك» asks phone +
 * WhatsApp OTP (no accounts) and confirms that the review shows after moderation.
 */
export function Reviews({ productId, summary }: { productId: number; summary: ReviewsSummary | null | undefined }) {
  const { store, timezone } = useStorefront();
  const [formOpen, setFormOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const q = useInfiniteQuery({
    queryKey: storeKey(store, "product", productId, "reviews"),
    queryFn: ({ pageParam }) => apiFetch(`/api/bff/catalog/products/${productId}/reviews`, ReviewsPageSchema, { query: { page: pageParam } }),
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
      {thanks ? <p className="text-sm text-muted-foreground">شكراً، سيظهر تقييمك بعد المراجعة.</p> : null}
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
            <ul className="space-y-1.5" aria-label="توزيع التقييمات">
              {[5, 4, 3, 2, 1].map((r) => {
                const n = summary.rating_distribution[String(r)] ?? 0;
                const pct = total ? Math.round((n / total) * 100) : 0;
                return (
                  <li key={r} className="flex items-center gap-2 text-xs">
                    <span className="w-3 font-mono tabular-nums">{r}</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-6 text-end font-mono text-muted-foreground tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <ul className="divide-y divide-border">
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
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"write" | "verify">("write");
  const [error, setError] = useState<string | null>(null);

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
        onVerified={async (phone, otp) => {
          await apiFetch(`/api/bff/catalog/products/${productId}/reviews`, z.unknown(), { method: "POST", json: { rating, comment, name, phone, otp } });
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
        <div className="flex" role="radiogroup" aria-label="عدد النجوم">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} من 5`} onClick={() => setRating(i)} className="flex size-11 items-center justify-center">
              <StarIcon aria-hidden className={cn("size-5", i <= rating ? "fill-foreground text-foreground" : "text-muted-foreground")} />
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
