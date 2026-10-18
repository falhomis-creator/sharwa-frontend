"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { PublicOrderSchema, type PublicOrder } from "@/features/checkout/schemas";
import { LAST_PHONE } from "@/features/checkout/components/checkout-screen";
import { FileField } from "@/features/storefront/components/file-field";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import dynamic from "next/dynamic";

const PushSubscribe = dynamic(() => import("@/features/pwa/components/push-subscribe").then((m) => m.PushSubscribe), { ssr: false });

/**
 * Order success / gateway return (M12 US-12.6.3, US-12.3.3, FR-12.10): the order number in
 * Mono, the financial status in Arabic, the total, what happens next (attach the receipt;
 * wait for the gateway), «تتبّع طلبك» with the public UUID and the merchant's WhatsApp.
 * The status always comes from the SERVER (never from the URL); after a gateway redirect the
 * page polls until the payment settles. The push opt-in is offered here, after a purchase
 * (M44 US-44.4).
 */
function useLastPhone(store: string): string | null {
  return useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return sessionStorage.getItem(LAST_PHONE(store));
      } catch {
        return null;
      }
    },
    () => null,
  );
}

export function OrderSuccess({ uuid, mode }: { uuid: string; mode: "success" | "gateway" }) {
  const { store, whatsapp, timezone } = useStorefront();
  const phone = useLastPhone(store);
  const q = useQuery({
    queryKey: storeKey(store, "order-public", uuid),
    queryFn: () => apiFetch(`/api/bff/orders/public/${encodeURIComponent(uuid)}`, PublicOrderSchema),
    refetchInterval: (query) => (query.state.data?.status === "pending_payment" ? 2_000 : false),
  });

  if (q.isPending) return <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />;
  if (q.isError) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">لم نجد هذا الطلب</h1>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}>
          العودة إلى المتجر
        </Link>
      </div>
    );
  }
  const o = q.data;
  const pendingGateway = o.status === "pending_payment";
  const heading = pendingGateway ? (mode === "gateway" ? "نتحقق من الدفع…" : "قيد تنفيذ الدفع") : "تم استلام طلبك";

  return (
    <div className="space-y-8" data-testid="order-success" data-status={o.status}>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          رقم الطلب <Mono className="text-base font-semibold text-foreground" data-testid="order-number">#{o.order_number}</Mono>
          <span className="mx-2">·</span>
          <span className="tabular-nums">{formatDateTime(o.created_at, timezone)}</span>
        </p>
      </header>

      <dl className="store-frame divide-y divide-border rounded-xl border-border text-sm">
        <div className="flex justify-between gap-3 p-4">
          <dt className="text-muted-foreground">حالة الطلب</dt>
          <dd className="font-medium" data-testid="order-status">{o.status_label}</dd>
        </div>
        <div className="flex justify-between gap-3 p-4">
          <dt className="text-muted-foreground">طريقة الدفع</dt>
          <dd>{o.payment_method_label}</dd>
        </div>
        <div className="flex justify-between gap-3 p-4">
          <dt className="text-muted-foreground">الإجمالي</dt>
          <dd className="text-base font-semibold">
            <Money value={o.display_total} />
          </dd>
        </div>
        {o.display_upfront_required ? (
          <>
            <div className="flex justify-between gap-3 p-4">
              <dt className="text-muted-foreground">المطلوب الآن (العربون)</dt>
              <dd className="font-semibold">
                <Money value={o.display_upfront_required} />
              </dd>
            </div>
            <div className="flex justify-between gap-3 p-4">
              <dt className="text-muted-foreground">عند الاستلام</dt>
              <dd className="font-semibold">
                <Money value={o.display_amount_on_delivery} />
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <NextSteps order={o} />

      <ul className="divide-y divide-border text-sm" aria-label="المنتجات">
        {o.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-3 py-2.5">
            <span>
              {i.product_name}
              {i.variant_label ? <span className="text-muted-foreground"> · {i.variant_label}</span> : null}
              <span className="ms-2 font-mono text-xs text-muted-foreground tabular-nums">×{i.quantity}</span>
            </span>
            <Money value={i.display_price} />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Link href={`/track/${o.public_uuid}`} className={cn(buttonVariants(), "h-11 px-5")} data-testid="track-link">
          تتبّع طلبك
        </Link>
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً، بخصوص طلبي رقم ${o.order_number}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-5")}
          >
            <MessageCircleIcon aria-hidden />
            واتساب المتجر
          </a>
        ) : null}
        <Link href="/products" className={cn(buttonVariants({ variant: "ghost" }), "h-11 px-5")}>
          متابعة التسوق
        </Link>
      </div>
      {!pendingGateway ? <PushSubscribe phone={phone} /> : null}
    </div>
  );
}

function NextSteps({ order }: { order: PublicOrder }) {
  if (order.status === "pending_payment") {
    return <p className="text-sm text-muted-foreground">ننتظر تأكيد بوابة الدفع؛ ستتحدّث هذه الصفحة تلقائياً.</p>;
  }
  if (order.payment_method === "manual" && (order.status === "awaiting_payment" || order.status === "payment_review")) {
    return <ReceiptUpload order={order} />;
  }
  if (order.payment_method === "cod") return <p className="text-sm text-muted-foreground">سيتواصل معك المتجر عبر واتساب لتأكيد موعد التوصيل، والدفع عند الاستلام.</p>;
  return <p className="text-sm text-muted-foreground">سنرسل لك تحديثات الطلب عبر واتساب.</p>;
}

/** FR-12.07 — the transfer receipt can be attached later, here (multipart, ≤ 5MB). */
function ReceiptUpload({ order }: { order: PublicOrder }) {
  const { store } = useStorefront();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (file) fd.set("receipt_image", file);
      if (amount) fd.set("transfer_amount_reported", amount);
      return apiFetch(`/api/bff/orders/public/${encodeURIComponent(order.public_uuid)}/receipt`, PublicOrderSchema, { method: "POST", body: fd });
    },
    onSuccess: (fresh) => client.setQueryData(storeKey(store, "order-public", order.public_uuid), fresh),
    onError: (e) => setError(isApiError(e) ? e.userMessage : "تعذّر رفع الإيصال."),
  });
  if (order.receipt_attached || upload.isSuccess) {
    return <p className="text-sm text-success" data-testid="receipt-attached">وصلنا إيصال التحويل، وسيؤكد المتجر الدفع قريباً.</p>;
  }
  return (
    <section className="store-frame space-y-4 rounded-xl border-border p-4" aria-labelledby="receipt-title" data-testid="receipt-upload">
      <h2 id="receipt-title" className="font-semibold">
        حوّل المبلغ ثم أرفق الإيصال
      </h2>
      <ul className="space-y-2 text-sm">
        {order.payout_accounts.map((a) => (
          <li key={a.account_number} className="flex items-center justify-between gap-3">
            <span>
              {a.provider_name} · <span className="text-muted-foreground">{a.account_name}</span>
              <span dir="ltr" className="block font-mono tabular-nums">
                {a.account_number}
              </span>
            </span>
            <Button
              variant="ghost"
              className="h-11 gap-1.5"
              onClick={async () => {
                await navigator.clipboard?.writeText(a.account_number).catch(() => undefined);
                setCopied(a.account_number);
              }}
            >
              {copied === a.account_number ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
              {copied === a.account_number ? "نُسخ" : "نسخ"}
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          upload.mutate();
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium">المبلغ المحوَّل (اختياري)</span>
          <input dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="store-frame h-11 w-48 rounded-lg border-input bg-background px-3 font-mono text-base outline-none md:text-sm" />
        </label>
        <div className="space-y-1 text-sm">
          <label htmlFor={`${id}-receipt`} className="block font-medium">
            صورة الإيصال
          </label>
          <FileField
            id={`${id}-receipt`}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onFile={(f) => {
              if (f && f.size > 5 * 1024 * 1024) {
                setError("الإيصال: صورة أو PDF حتى 5MB.");
                setFile(null);
                return false;
              }
              setError(null);
              setFile(f);
            }}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11" disabled={!file || upload.isPending}>
          إرسال الإيصال
        </Button>
      </form>
    </section>
  );
}
