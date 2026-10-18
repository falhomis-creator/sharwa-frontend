"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { ApiError, isApiError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { AuctionSchema, type Auction } from "@/features/storefront/schemas/catalog";
import { PhoneOtpDialog } from "@/features/storefront/components/phone-otp-dialog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * Auction panel (M10 US-10.4): current bid, step, a Mono countdown to `end_at`, bid count and
 * «زايد» with the server's suggested amount (no local addition). The countdown is measured
 * against the SERVER clock (the `Date` header of the auction response), not the device's
 * (M10 §8). A bid in the anti-sniping window extends `end_at` — the new value comes from the
 * server and the notice says so.
 */
async function fetchAuction(productId: number, currency: string): Promise<{ auction: Auction; skew: number }> {
  const res = await fetch(`/api/bff/catalog/products/${productId}/auction?currency=${currency}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new ApiError({ status: res.status });
  const server = Date.parse(res.headers.get("date") ?? "");
  const auction = AuctionSchema.parse(await res.json());
  return { auction, skew: Number.isFinite(server) ? server - Date.now() : 0 };
}

function useNow(skew: number) {
  const [now, setNow] = useState(() => Date.now() + skew);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + skew), 1000);
    return () => window.clearInterval(t);
  }, [skew]);
  return now;
}

function remaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}ي ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function AuctionPanel({ productId, onBuyNow }: { productId: number; onBuyNow: () => void }) {
  const { store, currency } = useStorefront();
  const client = useQueryClient();
  const key = storeKey(store, "product", productId, "auction", currency);
  const q = useQuery({ queryKey: key, queryFn: () => fetchAuction(productId, currency), refetchInterval: 30_000 });
  const [bidOpen, setBidOpen] = useState(false);
  const now = useNow(q.data?.skew ?? 0);

  if (q.isPending) return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />;
  if (q.isError) return <p className="text-sm text-muted-foreground">تعذّر تحميل المزاد.</p>;
  const a = q.data.auction;
  const left = Date.parse(a.end_at) - now;
  const ended = a.status === "ended" || left <= 0;
  const sniping = !ended && left <= a.anti_sniping_seconds * 1000;

  return (
    <div className="store-frame space-y-4 rounded-lg border-border p-4" data-testid="auction-panel">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">المزايدة الحالية</dt>
          <dd className="text-lg font-semibold">
            <Money value={a.display_current_bid} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">ينتهي بعد</dt>
          <dd className="font-mono text-lg tabular-nums" dir="ltr" aria-live="off" data-testid="auction-countdown">
            {a.status === "draft" ? "—" : remaining(left)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">خطوة المزايدة</dt>
          <dd>
            <Money value={a.display_bid_step} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">عدد المزايدات</dt>
          <dd className="font-mono tabular-nums">{formatNumber(a.bids_count)}</dd>
        </div>
      </dl>
      {sniping ? <p className="text-sm text-warning">سيُمدَّد المزاد عند أي مزايدة في الثواني الأخيرة.</p> : null}
      {a.status === "draft" ? (
        <Button disabled className="h-12 w-full text-base">
          لم يبدأ بعد
        </Button>
      ) : ended ? (
        <Button disabled className="h-12 w-full text-base">
          انتهى المزاد
        </Button>
      ) : (
        <div className="space-y-2">
          <Button className="h-12 w-full text-base" onClick={() => setBidOpen(true)} data-testid="auction-bid">
            زايد بـ <Money value={a.display_next_bid} />
          </Button>
          {a.display_buy_now ? (
            <Button variant="outline" className="h-11 w-full" onClick={onBuyNow}>
              اشترِ الآن بـ <Money value={a.display_buy_now} />
            </Button>
          ) : null}
        </div>
      )}
      <PhoneOtpDialog
        open={bidOpen}
        onOpenChange={setBidOpen}
        title="تأكيد المزايدة"
        description="نؤكد رقمك برمز واتساب قبل تسجيل المزايدة."
        purpose="auction"
        confirmLabel="تأكيد المزايدة"
        onVerified={async (phone, otp) => {
          try {
            const next = await apiFetch(`/api/bff/catalog/products/${productId}/auction/bids`, AuctionSchema, {
              method: "POST",
              json: { amount: a.next_bid_amount, phone, otp, currency },
            });
            client.setQueryData(key, { auction: next, skew: q.data.skew });
            toast.success("سُجّلت مزايدتك");
          } catch (e) {
            if (isApiError(e) && e.status === 409) {
              const body = e.body as { auction?: unknown } | undefined;
              const parsed = AuctionSchema.safeParse(body?.auction);
              if (parsed.success) client.setQueryData(key, { auction: parsed.data, skew: q.data.skew });
            }
            throw e;
          }
        }}
      />
    </div>
  );
}
