"use client";

import { useQueryClient } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatDate, formatNumber } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useStoreReviews } from "@/features/engagement/api";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * «تقييم المتجر» on `/about` (M42 US-42.6, FR-42.12): the average in Mono, the count, the
 * latest reviews, and a small form (stars + name + comment). No OTP — the mock publishes
 * at once; Django may moderate (`[NEEDS BACKEND]`).
 */
export function StoreReviewBlock() {
  const { store, timezone } = useStorefront();
  const q = useStoreReviews(store);
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  return (
    <section id="store-reviews" aria-labelledby="store-reviews-title" className="space-y-5 border-t border-border pt-8" data-testid="store-reviews">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="store-reviews-title" className="text-xl font-bold">
          تقييم المتجر
        </h2>
        {!open && !thanks ? (
          <Button variant="outline" className="h-11" onClick={() => setOpen(true)} data-testid="store-review-open">
            قيّم المتجر
          </Button>
        ) : null}
      </div>
      {q.isPending ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : q.isError ? (
        <p className="text-sm text-destructive" role="alert">
          تعذّر تحميل التقييمات.
        </p>
      ) : q.data.count === 0 ? (
        <p className="text-sm text-muted-foreground">لا تقييمات بعد — كن أول من يقيّم المتجر.</p>
      ) : (
        <div className="space-y-4">
          <p>
            <span className="font-mono text-4xl font-semibold tabular-nums" data-testid="store-review-average">
              {q.data.average_rating.toFixed(1)}
            </span>
            <span className="ms-2 text-sm text-muted-foreground">
              من 5 · <span className="font-mono tabular-nums">{formatNumber(q.data.count)}</span> تقييم
            </span>
          </p>
          <ul className="divide-y divide-border">
            {q.data.results.map((r) => (
              <li key={r.id} className="space-y-1.5 py-3 first:pt-0">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{r.customer_name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at, { timeZone: timezone })}</span>
                </div>
                <Stars value={r.rating} />
                {r.comment ? <p className="text-sm leading-7">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {thanks ? (
        <p className="text-sm text-muted-foreground" data-testid="store-review-thanks">
          شكراً، سيظهر تقييمك بعد المراجعة إن لزم.
        </p>
      ) : null}
      {open ? (
        <StoreReviewForm
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setThanks(true);
          }}
        />
      ) : null}
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

function StoreReviewForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const id = useId();
  const { store } = useStorefront();
  const client = useQueryClient();
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, (rating || (delta > 0 ? 0 : 6)) + delta));
    setRating(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-star="${next}"]`)?.focus();
  };

  return (
    <form
      className="store-frame space-y-4 rounded-xl border-border p-5 shadow-card bg-card"
      data-testid="store-review-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setError("اختر عدد النجوم.");
        if (!name.trim()) return setError("اكتب اسمك.");
        setError(null);
        setBusy(true);
        try {
          await apiFetch("/api/bff/store-reviews", z.unknown(), { method: "POST", json: { rating, customer_name: name.trim(), comment: comment.trim() } });
          await client.invalidateQueries({ queryKey: storeKey(store, "store-reviews") });
          onDone();
        } catch (err) {
          setError(isApiError(err) ? (err.status === 429 ? "حاول بعد دقيقة." : err.userMessage) : "تعذّر إرسال التقييم.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-medium">تقييمك للمتجر</legend>
        <div className="flex" role="radiogroup" aria-label="التقييم من 5" onKeyDown={onStarKey}>
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
        <span className="font-medium">الاسم</span>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} className="store-frame h-11 w-full rounded-lg border-input bg-background px-3 text-base outline-none md:text-sm" />
      </label>
      <label htmlFor={`${id}-comment`} className="block space-y-1 text-sm">
        <span className="font-medium">تعليقك (اختياري)</span>
        <textarea id={`${id}-comment`} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className="store-frame w-full rounded-lg border-input bg-background px-3 py-2 text-base outline-none md:text-sm" />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" className="h-11" disabled={busy} data-testid="store-review-submit">
          نشر التقييم
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
