"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, MapPinIcon, MessageCircleIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Money } from "@/components/shared/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatNumber, normalizePhone, prettyPhone } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { cartKey, useCart } from "@/features/cart/api";
import { CouponField } from "@/features/cart/components/cart-panel";
import { useDeliveryOptions, usePaymentOptions, useQuote, type QuoteInput } from "@/features/checkout/api";
import {
  CheckoutResultSchema,
  LoyaltyBalanceSchema,
  WalletPreviewSchema,
  checkoutDraftSchema,
  type CheckoutDraft,
  type PaymentMethod,
} from "@/features/checkout/schemas";
import { FileField } from "@/features/storefront/components/file-field";
import { InvoiceLines, MobileInvoiceBar } from "@/features/checkout/components/invoice-summary";
import { OtpVerifyDialog, type OtpPurpose } from "@/features/checkout/components/otp-verify-dialog";
import { ProductDetailSchema } from "@/features/storefront/schemas/catalog";
import { ProductImage } from "@/features/storefront/components/product-image";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useWishlist } from "@/stores/wishlist";

/**
 * One-page checkout (M12, T092): contact → delivery/pickup → payment → review, with the
 * server's invoice beside it (7/12 + sticky 5/12 on desktop; a collapsible total bar on
 * phones). React Hook Form + Zod for the fields; every amount comes from the quote.
 *
 * Idempotency (FR-12.04): one `client_uuid` per cart, kept in sessionStorage, sent with every
 * attempt; a double click or a retry after a dropped connection gets the SAME order back.
 * The phone is handed to the abandoned-cart capture once, after it validates (FR-12.08).
 */
const DRAFT_KEY = (store: string) => `sharwa:checkout:${store}`;
const UUID_KEY = (store: string) => `sharwa:checkout-uuid:${store}`;
const CONTACT_SENT = (store: string) => `sharwa:cart-contact:${store}`;
export const LAST_PHONE = (store: string) => `sharwa:last-phone:${store}`;

function readSaved(store: string): Partial<CheckoutDraft> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY(store)) ?? "{}") as Partial<CheckoutDraft>;
  } catch {
    return {};
  }
}

function clientUuid(store: string): string {
  try {
    const existing = sessionStorage.getItem(UUID_KEY(store));
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(UUID_KEY(store), fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

const FIELD_ORDER: Array<FieldPath<CheckoutDraft>> = [
  "name",
  "phone",
  "email",
  "address",
  "pickup_location_id",
  "delivery_method_id",
  "payment_method",
  "transfer_amount_reported",
  "recipient_name",
  "recipient_phone",
  "gift_message",
];

const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

const noopSubscribe = () => () => {};

export function CheckoutScreen() {
  const { store, storeName, whatsapp, giftingEnabled, loyaltyEnabled, timezone } = useStorefront();
  const router = useRouter();
  const sp = useSearchParams();
  const client = useQueryClient();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const buyNow = sp.get("mode") === "buy_now" && Boolean(sp.get("product"));
  const cart = useCart(store);
  const cartVersion = cart.data ? `${cart.data.count}|${cart.data.display_subtotal}|${cart.data.coupon_code ?? ""}|${cart.data.currency}` : "-";
  const delivery = useDeliveryOptions(store, cartVersion);
  const payment = usePaymentOptions(store, cartVersion);
  const buyNowProduct = useQuery({
    queryKey: storeKey(store, "product", Number(sp.get("product")), "checkout"),
    queryFn: () => apiFetch(`/api/v1/catalog/products/${sp.get("product")}/`, ProductDetailSchema, { query: { currency: cart.data?.currency } }),
    enabled: buyNow,
  });

  const form = useForm<CheckoutDraft>({
    resolver: zodResolver(checkoutDraftSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      fulfillment: "delivery",
      address: "",
      use_wallet: false,
      is_gift: false,
      gift_message: "",
      transfer_amount_reported: "",
      payment_method: undefined as unknown as PaymentMethod,
    },
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, setError, formState } = form;
  const v = useWatch({ control });
  const [detail, setDetail] = useState<string | null>(null);
  const [changed, setChanged] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<OtpPurpose | null>(null);
  const [verified, setVerified] = useState<Partial<Record<OtpPurpose, string>>>({});
  const [sharwaBalance, setSharwaBalance] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const restoredRef = useRef(false);

  // Returning visitor: name/phone/address from this store's local draft (US-12.1.2).
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = readSaved(store);
    for (const k of ["name", "phone", "email", "address"] as const) if (saved[k]) setValue(k, saved[k] as string);
  }, [store, setValue]);

  // Defaults once the options arrive: the first enabled method, the first delivery option.
  useEffect(() => {
    const first = payment.data?.methods.find((m) => m.enabled);
    if (first && !form.getValues("payment_method")) setValue("payment_method", first.code);
  }, [payment.data, form, setValue]);
  useEffect(() => {
    const m = delivery.data?.delivery_methods[0];
    if (m && !form.getValues("delivery_method_id")) setValue("delivery_method_id", String(m.id));
  }, [delivery.data, form, setValue]);

  const normalizedPhone = v.phone ? normalizePhone(v.phone) : "";
  const phoneValid = /^(967|966)\d{9}$/.test(normalizedPhone);

  // Abandoned-cart capture, once per store and browser (FR-12.08).
  useEffect(() => {
    if (!phoneValid) return;
    const t = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(CONTACT_SENT(store)) === normalizedPhone) return;
        sessionStorage.setItem(CONTACT_SENT(store), normalizedPhone);
      } catch {
        // ignore
      }
      void apiFetch("/api/bff/cart/contact", z.unknown(), { method: "POST", json: { phone: normalizedPhone, name: form.getValues("name") || undefined } }).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(t);
  }, [phoneValid, normalizedPhone, store, form]);

  const quoteInput: QuoteInput = {
    delivery_method_id: v.fulfillment === "delivery" ? v.delivery_method_id || undefined : undefined,
    pickup_location_id: v.fulfillment === "pickup" ? v.pickup_location_id || undefined : undefined,
    payment_method: v.payment_method,
    use_wallet: Boolean(v.use_wallet),
    phone: phoneValid ? normalizedPhone : undefined,
    redeem_points: v.redeem_points || undefined,
    checkout_mode: buyNow ? "buy_now" : "cart",
    product_id: buyNow ? (sp.get("product") ?? undefined) : undefined,
    variant_id: buyNow ? (sp.get("variant") ?? undefined) : undefined,
    size: buyNow ? (sp.get("size") ?? undefined) : undefined,
    color: buyNow ? (sp.get("color") ?? undefined) : undefined,
    quantity: buyNow ? (sp.get("qty") ?? undefined) : undefined,
    start_datetime: buyNow ? (sp.get("start") ?? undefined) : undefined,
    cartVersion,
  };
  const hasLines = buyNow || (cart.data?.items.length ?? 0) > 0;
  const quote = useQuote(store, quoteInput, Boolean(cart.data) && hasLines);
  const recomputing = quote.isFetching;

  const walletPreview = useQuery({
    queryKey: storeKey(store, "checkout", "wallet", normalizedPhone, cartVersion),
    queryFn: () => apiFetch("/api/bff/wallet/balance-preview", WalletPreviewSchema, { method: "POST", json: { phone: normalizedPhone } }),
    enabled: Boolean(v.use_wallet) && phoneValid,
  });
  const loyalty = useQuery({
    queryKey: storeKey(store, "checkout", "loyalty", normalizedPhone),
    queryFn: () => apiFetch("/api/bff/loyalty/balance", LoyaltyBalanceSchema, { query: { phone: normalizedPhone } }),
    enabled: loyaltyEnabled && phoneValid,
    retry: false,
  });

  // A failed quote field (e.g. wallet in another currency) is shown where it belongs.
  useEffect(() => {
    if (quote.error && isApiError(quote.error) && quote.error.fields) {
      for (const [k, msgs] of Object.entries(quote.error.fields)) {
        if (k === "use_wallet") toast.error(msgs[0] ?? "");
        else if (FIELD_ORDER.includes(k as FieldPath<CheckoutDraft>)) setError(k as FieldPath<CheckoutDraft>, { message: msgs[0] });
      }
      if (quote.error.fields.use_wallet) setValue("use_wallet", false);
    }
  }, [quote.error, setError, setValue]);

  const methods = payment.data?.methods ?? [];
  const anyEnabled = methods.some((m) => m.enabled);
  const fullyByWallet = quote.data?.fully_paid_by_wallet === true;

  // The codes are passed in (not read from state) because the submit that follows a fresh
  // verification runs before React has re-rendered with it.
  async function submitValues(values: CheckoutDraft, codes: Partial<Record<OtpPurpose, string>>) {
    setDetail(null);
    setChanged([]);
    const method = values.payment_method;
    // OTP gates (FR-12.06): COD, Sharwa Pay and the wallet each need their code first.
    if (method === "cod" && !codes.cod) return setOtpFor("cod");
    if (method === "sharwa_pay" && !codes.sharwa_pay) return setOtpFor("sharwa_pay");
    if (values.use_wallet && !codes.wallet) return setOtpFor("wallet");

    const fd = new FormData();
    const put = (k: string, val: unknown) => {
      if (val === undefined || val === null || val === "") return;
      fd.set(k, typeof val === "boolean" ? String(val) : String(val));
    };
    put("client_uuid", clientUuid(store));
    put("checkout_mode", buyNow ? "buy_now" : "cart");
    put("name", values.name);
    put("phone", normalizePhone(values.phone));
    put("email", values.email);
    if (values.fulfillment === "pickup") put("pickup_location_id", values.pickup_location_id);
    else {
      put("address", values.address);
      put("delivery_method_id", values.delivery_method_id);
      put("latitude", values.latitude);
      put("longitude", values.longitude);
    }
    put("payment_method", method);
    put("use_wallet", values.use_wallet);
    put("redeem_points", values.redeem_points);
    put("otp", codes.cod);
    put("wallet_otp", codes.wallet);
    put("sharwa_pay_otp", codes.sharwa_pay);
    put("is_gift", values.is_gift);
    if (values.is_gift) {
      put("recipient_name", values.recipient_name);
      put("recipient_phone", values.recipient_phone ? normalizePhone(values.recipient_phone) : undefined);
      put("gift_message", values.gift_message);
    }
    if (method === "manual") {
      put("transfer_amount_reported", values.transfer_amount_reported);
      if (receipt) fd.set("receipt_image", receipt);
    }
    if (buyNow) {
      put("product_id", sp.get("product"));
      put("variant_id", sp.get("variant"));
      put("size", sp.get("size"));
      put("color", sp.get("color"));
      put("quantity", sp.get("qty"));
      put("start_datetime", sp.get("start"));
    }

    setSubmitting(true);
    try {
      const result = await apiFetch("/api/bff/checkout", CheckoutResultSchema, { method: "POST", body: fd, idempotencyKey: clientUuid(store) });
      try {
        localStorage.setItem(DRAFT_KEY(store), JSON.stringify({ name: values.name, phone: values.phone, email: values.email, address: values.address }));
        sessionStorage.removeItem(UUID_KEY(store));
        sessionStorage.setItem(LAST_PHONE(store), normalizePhone(values.phone));
      } catch {
        // storage unavailable
      }
      useWishlist.getState().setPhone(normalizePhone(values.phone));
      await client.invalidateQueries({ queryKey: cartKey(store) });
      if (result.next_action.type === "redirect_gateway" && result.next_action.url) {
        // FR-12.10: leave for the gateway only on the server's instruction.
        window.location.assign(result.next_action.url);
        return;
      }
      router.push(`/checkout/success/${result.public_uuid}`);
    } catch (e) {
      if (!isApiError(e)) {
        setDetail("انقطع الاتصال. أعد المحاولة — لن يتكرر طلبك.");
        return;
      }
      if (e.status === 409) {
        // FR-12.13: reload cart + invoice and show what changed before allowing a new attempt.
        const body = e.body as { changed?: string[] } | undefined;
        setChanged(body?.changed ?? []);
        setDetail(e.detail ?? "تحدّثت سلتك، راجعها قبل التأكيد.");
        await Promise.all([client.invalidateQueries({ queryKey: cartKey(store) }), quote.refetch()]);
        return;
      }
      if (e.fields) {
        let first: FieldPath<CheckoutDraft> | null = null;
        for (const [k, msgs] of Object.entries(e.fields)) {
          if (k === "otp" || k === "wallet_otp" || k === "sharwa_pay_otp") {
            const purpose: OtpPurpose = k === "otp" ? "cod" : k === "wallet_otp" ? "wallet" : "sharwa_pay";
            setVerified((x) => ({ ...x, [purpose]: undefined }));
            setDetail(msgs[0] ?? "رمز التأكيد غير صحيح.");
            continue;
          }
          if (k === "receipt_image") {
            setReceiptError(msgs[0] ?? null);
            continue;
          }
          if (FIELD_ORDER.includes(k as FieldPath<CheckoutDraft>)) {
            setError(k as FieldPath<CheckoutDraft>, { message: msgs[0] });
            first ??= k as FieldPath<CheckoutDraft>;
          } else setDetail(msgs[0] ?? e.userMessage);
        }
        if (first) {
          form.setFocus(first);
          document.getElementById(`field-${first}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        if (e.fields.delivery_method_id) void delivery.refetch();
      } else setDetail(e.userMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const summaryItems = useMemo(() => {
    if (buyNow && buyNowProduct.data) {
      const p = buyNowProduct.data;
      const variant = p.variants?.find((x) => String(x.id) === sp.get("variant"));
      const label = variant ? p.attributes?.map((a) => a.options.find((o) => variant.option_ids.includes(o.id))?.value).filter(Boolean).join(" / ") : [sp.get("size"), sp.get("color")].filter(Boolean).join(" / ");
      return [{ key: "buy-now", name: p.name, image: p.image_url || p.image || null, label: label || null, quantity: Number(sp.get("qty") ?? 1), start: sp.get("start"), productId: p.id }];
    }
    return (cart.data?.items ?? []).map((i) => ({
      key: `${i.product_id}-${i.variant_id ?? ""}-${i.size ?? ""}-${i.color ?? ""}-${i.start_datetime ?? ""}`,
      name: i.name,
      image: i.image ?? null,
      label: i.variant_label ?? ([i.size, i.color].filter(Boolean).join(" / ") || null),
      quantity: i.quantity,
      start: i.start_datetime ?? null,
      productId: i.product_id,
    }));
  }, [buyNow, buyNowProduct.data, cart.data, sp]);

  // The first client render must equal the server's (skeleton): the cart query can resolve
  // through another subscriber before this Suspense boundary hydrates.
  if (cart.isPending || !hydrated) return <CheckoutSkeleton />;
  if (!hasLines) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-16 md:px-6" data-testid="checkout-empty">
        <h1 className="text-2xl font-bold">لا يمكن إتمام طلب بسلة فارغة</h1>
        <Link href="/products" className={cn(buttonVariants({ variant: "cta" }), "h-11 px-5")}>
          تصفّح المنتجات
        </Link>
      </div>
    );
  }
  if (payment.data && !anyEnabled && methods.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-16 md:px-6">
        <h1 className="text-2xl font-bold">المتجر لا يستقبل طلبات حالياً</h1>
        {whatsapp ? (
          <a href={`https://wa.me/${whatsapp}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-5")}>
            <MessageCircleIcon aria-hidden />
            تواصل عبر واتساب
          </a>
        ) : null}
      </div>
    );
  }

  const err = (k: FieldPath<CheckoutDraft>) => formState.errors[k]?.message as string | undefined;
  const input =
    "store-frame h-11 w-full rounded-lg border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive md:text-sm";
  const options = delivery.data;
  const items = (
    <ul className="divide-y divide-border">
      {summaryItems.map((i) => (
        <li key={i.key} className="flex items-center gap-3 py-2.5">
          <div className="relative w-12 shrink-0 overflow-hidden rounded-md">
            <ProductImage src={i.image} alt={i.name} sizes="48px" thumb />
            <span className="absolute -top-0 end-0 rounded-es-md bg-foreground px-1 font-mono text-[10px] text-background tabular-nums">{formatNumber(i.quantity)}</span>
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate">{i.name}</p>
            {i.label ? <p className="text-xs text-muted-foreground">{i.label}</p> : null}
            {i.start ? (
              <p className="text-xs text-muted-foreground">
                الموعد: <span className="tabular-nums">{formatDateTime(i.start, timezone)}</span>{" "}
                <Link href={`/p/${i.productId}`} className="store-link">
                  تغيير
                </Link>
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );

  const confirm = (
    <div className="space-y-2">
      {changed.length ? (
        <p className="text-sm text-warning" data-testid="checkout-changed">
          تغيّر: {changed.join("، ")}
        </p>
      ) : null}
      {detail ? (
        <p className="text-sm text-destructive" role="alert" data-testid="checkout-detail">
          {detail}
        </p>
      ) : null}
      <Button type="submit" variant="cta" className="h-12 w-full text-base" disabled={submitting || !anyEnabled} data-testid="checkout-submit">
        {submitting ? "جارٍ تأكيد الطلب…" : (
          <>
            تأكيد الطلب
            {quote.data ? (
              <>
                {" "}
                · <Money value={quote.data.display_upfront_required ?? quote.data.display_total} />
              </>
            ) : null}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">يتواصل معك {storeName} عبر واتساب لتأكيد التوصيل.</p>
    </div>
  );

  return (
    <form onSubmit={(e) => void handleSubmit((values) => submitValues(values, verified))(e)} noValidate className="mx-auto w-full max-w-7xl px-4 pt-4 pb-32 md:px-6 md:pt-8 md:pb-12" data-testid="checkout-form">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:mb-6 md:text-3xl">إتمام الطلب</h1>
      <div className="mb-5">
        <MobileInvoiceBar invoice={quote.data} recomputing={recomputing}>
          {items}
        </MobileInvoiceBar>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
        <div className="space-y-8 md:col-span-7">
          {/* 1 — contact */}
          <section aria-labelledby="s-contact" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="s-contact" className="text-lg font-bold">
                بياناتك
              </h2>
              {v.name || v.phone ? (
                <button
                  type="button"
                  className="min-h-11 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    try {
                      localStorage.removeItem(DRAFT_KEY(store));
                    } catch {
                      // ignore
                    }
                    for (const k of ["name", "phone", "email", "address"] as const) setValue(k, "");
                  }}
                >
                  مسح
                </button>
              ) : null}
            </div>
            <Field id="name" label="الاسم" error={err("name")}>
              <input id="field-name" autoComplete="name" {...register("name")} aria-invalid={Boolean(err("name"))} className={input} />
            </Field>
            <Field id="phone" label="رقم واتساب" error={err("phone")} hint={phoneValid ? <span dir="ltr" className="font-mono">{prettyPhone(normalizedPhone)}</span> : "مثال: 0770841802"}>
              <input id="field-phone" dir="ltr" inputMode="tel" autoComplete="tel" {...register("phone")} aria-invalid={Boolean(err("phone"))} className={cn(input, "font-mono")} />
            </Field>
            <Field id="email" label="البريد الإلكتروني (اختياري)" error={err("email")}>
              <input id="field-email" dir="ltr" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(err("email"))} className={input} />
            </Field>
          </section>

          {/* 2 — delivery or pickup */}
          <section aria-labelledby="s-delivery" className="space-y-4 border-t border-border pt-6">
            <h2 id="s-delivery" className="text-lg font-bold">
              التوصيل
            </h2>
            {options && options.pickup_locations.length > 0 ? (
              <Controller
                control={control}
                name="fulfillment"
                render={({ field }) => (
                  <div role="tablist" aria-label="طريقة الاستلام" className="store-frame inline-flex rounded-lg border-border p-1">
                    {(["delivery", "pickup"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={field.value === k}
                        onClick={() => field.onChange(k)}
                        className={cn("min-h-11 rounded-md px-4 text-sm", field.value === k ? "bg-foreground text-background" : "text-muted-foreground")}
                      >
                        {k === "delivery" ? "توصيل للعنوان" : "استلام من الفرع"}
                      </button>
                    ))}
                  </div>
                )}
              />
            ) : null}
            {v.fulfillment === "pickup" && options ? (
              <Field id="pickup_location_id" label="نقطة الاستلام" error={err("pickup_location_id")}>
                <div id="field-pickup_location_id" role="radiogroup" className="space-y-2">
                  {options.pickup_locations.map((p) => (
                    <label key={p.id} className={cn("store-frame flex cursor-pointer gap-3 rounded-xl border-border p-4 shadow-card bg-card", v.pickup_location_id === String(p.id) && "ring-2 ring-foreground")}>
                      <input type="radio" value={String(p.id)} {...register("pickup_location_id")} className="mt-1 size-4 accent-[var(--foreground)]" />
                      <span className="text-sm">
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-muted-foreground">{p.address}</span>
                        {p.phone ? (
                          <span dir="ltr" className="block font-mono text-xs text-muted-foreground">
                            {prettyPhone(p.phone)}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
            ) : (
              <>
                <Field id="address" label={v.is_gift ? "عنوان المستلم" : "العنوان"} error={err("address")}>
                  <textarea id="field-address" rows={2} autoComplete="street-address" {...register("address")} aria-invalid={Boolean(err("address"))} className={cn(input, "h-auto py-2")} />
                </Field>
                <LocateMe
                  lat={v.latitude}
                  lng={v.longitude}
                  onPick={(lat, lng) => {
                    setValue("latitude", lat);
                    setValue("longitude", lng);
                  }}
                />
                {options && options.delivery_methods.length > 0 ? (
                  <div id="field-delivery_method_id" role="radiogroup" aria-label="طريقة التوصيل" className="space-y-2">
                    {options.delivery_methods.map((m) => (
                      <label key={m.id} className={cn("store-frame flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-border px-4 py-3 shadow-card bg-card", v.delivery_method_id === String(m.id) && "ring-2 ring-foreground")}>
                        <input type="radio" value={String(m.id)} {...register("delivery_method_id")} className="size-4 accent-[var(--foreground)]" />
                        <span className="flex-1 text-sm">
                          <span className="block font-medium">
                            {m.name}
                            {m.is_sharwa_official ? <span className="ms-2 text-xs font-normal text-muted-foreground">شروة شيب</span> : null}
                          </span>
                          {m.estimated_time ? <span className="block text-xs text-muted-foreground">{m.estimated_time}</span> : null}
                        </span>
                        {options.free_shipping_applies ? <span className="text-sm text-success">مجاني</span> : <Money value={m.display_price} className="text-sm" />}
                      </label>
                    ))}
                  </div>
                ) : options ? (
                  <p className="text-sm text-muted-foreground">
                    رسوم التوصيل {options.free_shipping_applies ? <span className="text-success">مجانية</span> : <Money value={options.display_default_delivery_fee} />}
                  </p>
                ) : null}
                {err("delivery_method_id") ? <p className="text-sm text-destructive">{err("delivery_method_id")}</p> : null}
              </>
            )}
          </section>

          {/* 3 — payment */}
          <section aria-labelledby="s-payment" className="space-y-4 border-t border-border pt-6">
            <h2 id="s-payment" className="text-lg font-bold">
              الدفع
            </h2>
            {fullyByWallet ? <p className="text-sm text-success">مدفوع بالكامل من المحفظة.</p> : null}
            <div id="field-payment_method" role="radiogroup" aria-label="طريقة الدفع" className={cn("space-y-2", fullyByWallet && "pointer-events-none opacity-50")}>
              {methods.map((m) => (
                <label
                  key={m.code}
                  data-testid={`pay-${m.code}`}
                  className={cn(
                    "store-frame flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-border px-4 py-3 shadow-card bg-card",
                    v.payment_method === m.code && "ring-2 ring-foreground",
                    !m.enabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input type="radio" value={m.code} disabled={!m.enabled} {...register("payment_method")} className="mt-1 size-4 accent-[var(--foreground)]" />
                  <span className="flex-1 text-sm">
                    <span className="block font-medium">{m.label}</span>
                    {!m.enabled && m.reason ? <span className="block text-muted-foreground">{m.reason}</span> : null}
                    {m.code === "cod" && m.enabled ? <span className="block text-xs text-muted-foreground">نؤكد طلبك برمز واتساب.</span> : null}
                    {(m.code === "jeeb" || m.code === "kuraimi") && m.enabled ? <span className="block text-xs text-muted-foreground">ستنتقل إلى بوابة الدفع لإكمال العملية.</span> : null}
                    {m.code === "sharwa_pay" && sharwaBalance ? (
                      <span className="block text-xs text-muted-foreground">
                        رصيدك <Money value={sharwaBalance} />
                      </span>
                    ) : null}
                  </span>
                  {verified[m.code as OtpPurpose] ? <CheckIcon aria-label="تم التأكيد" className="size-4 text-success" /> : null}
                </label>
              ))}
            </div>
            {err("payment_method") ? <p className="text-sm text-destructive">{err("payment_method")}</p> : null}
            {v.payment_method === "manual" && payment.data ? (
              <ManualTransfer
                accounts={payment.data.payout_accounts}
                register={register("transfer_amount_reported")}
                amountError={err("transfer_amount_reported")}
                receipt={receipt}
                receiptError={receiptError}
                onReceipt={(f, e) => {
                  setReceipt(f);
                  setReceiptError(e);
                }}
              />
            ) : null}
          </section>

          {/* 4 — wallet · loyalty · coupon */}
          <section aria-labelledby="s-credits" className="space-y-4 border-t border-border pt-6">
            <h2 id="s-credits" className="text-lg font-bold">
              الخصومات والرصيد
            </h2>
            {cart.data && !buyNow ? <CouponField cart={cart.data} /> : null}
            <Controller
              control={control}
              name="use_wallet"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p id="wallet-label" className="font-medium">
                      الدفع من محفظتي
                    </p>
                    {!phoneValid ? <p className="text-muted-foreground">أدخل رقم واتساب أولاً.</p> : null}
                    {field.value && walletPreview.data ? (
                      <p className="text-muted-foreground">
                        الرصيد <Money value={walletPreview.data.display_balance} /> · يُستخدم <Money value={walletPreview.data.display_applicable} />
                      </p>
                    ) : null}
                  </div>
                  <Switch aria-labelledby="wallet-label" checked={field.value} disabled={!phoneValid} onCheckedChange={(on) => field.onChange(on)} />
                </div>
              )}
            />
            {loyaltyEnabled && loyalty.data && loyalty.data.balance >= loyalty.data.min_points_to_redeem ? (
              <div className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">نقاط الولاء</p>
                  <p className="text-muted-foreground">
                    استبدال <span className="font-mono tabular-nums">{formatNumber(loyalty.data.balance)}</span> نقطة = <Money value={loyalty.data.display_value} />
                  </p>
                </div>
                {v.redeem_points ? (
                  <Button type="button" variant="ghost" className="h-11" onClick={() => setValue("redeem_points", undefined)}>
                    إلغاء
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="h-11" onClick={() => setOtpFor("loyalty")}>
                    استبدال
                  </Button>
                )}
              </div>
            ) : null}
          </section>

          {/* 5 — gift */}
          {giftingEnabled ? (
            <section aria-labelledby="s-gift" className="space-y-4 border-t border-border pt-6">
              <Controller
                control={control}
                name="is_gift"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="s-gift" className="text-lg font-bold">
                      هذا الطلب هدية
                    </h2>
                    <Switch aria-labelledby="s-gift" checked={field.value} onCheckedChange={(on) => field.onChange(on)} data-testid="gift-toggle" />
                  </div>
                )}
              />
              {v.is_gift ? (
                <div className="space-y-4">
                  <Field id="recipient_name" label="اسم المستلم" error={err("recipient_name")}>
                    <input id="field-recipient_name" {...register("recipient_name")} aria-invalid={Boolean(err("recipient_name"))} className={input} />
                  </Field>
                  <Field
                    id="recipient_phone"
                    label="رقم المستلم"
                    error={err("recipient_phone")}
                    hint={v.recipient_phone && normalizePhone(v.recipient_phone) === normalizedPhone ? "المستلم هو أنت." : undefined}
                  >
                    <input id="field-recipient_phone" dir="ltr" inputMode="tel" {...register("recipient_phone")} aria-invalid={Boolean(err("recipient_phone"))} className={cn(input, "font-mono")} />
                  </Field>
                  <Field
                    id="gift_message"
                    label="رسالة الهدية"
                    error={err("gift_message")}
                    hint={
                      <span>
                        <span className="font-mono tabular-nums">{formatNumber((v.gift_message ?? "").length)}</span>/200
                      </span>
                    }
                  >
                    <textarea id="field-gift_message" rows={3} maxLength={200} {...register("gift_message")} className={cn(input, "h-auto py-2")} />
                  </Field>
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="hidden md:block">{confirm}</div>
        </div>

        <aside className="hidden md:col-span-5 md:block" aria-label="ملخص الطلب">
          <div className="store-frame sticky top-24 space-y-4 rounded-xl border-border p-5 shadow-card bg-card">
            <h2 className="store-heading text-lg font-bold">ملخص الطلب</h2>
            {items}
            {quote.data ? <InvoiceLines invoice={quote.data} recomputing={recomputing} /> : <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />}
          </div>
        </aside>
      </div>

      {/* Phones: the confirm button sticks to the bottom with the total (M12 §6). */}
      <div className="store-frame fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 border-border bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        {confirm}
      </div>

      {otpFor && phoneValid ? (
        <OtpVerifyDialog
          open
          onOpenChange={(o) => !o && setOtpFor(null)}
          purpose={otpFor}
          phone={normalizedPhone}
          onInfo={(info) => {
            if (otpFor === "sharwa_pay" && typeof info.display_balance === "string") setSharwaBalance(info.display_balance);
          }}
          onVerified={(otp) => {
            const purpose = otpFor;
            const codes = { ...verified, [purpose]: otp };
            setVerified(codes);
            setOtpFor(null);
            if (purpose === "loyalty" && loyalty.data) setValue("redeem_points", String(loyalty.data.balance));
            else void handleSubmit((values) => submitValues(values, codes))();
          }}
        />
      ) : null}
    </form>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`field-${id}`} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" data-testid={`error-${id}`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** US-12.1.3 / FR-12.09 — coordinates only after the buyer asks; refusing never blocks checkout. */
function LocateMe({ lat, lng, onPick }: { lat?: string; lng?: string; onPick: (lat: string, lng: string) => void }) {
  const [state, setState] = useState<"idle" | "busy" | "denied">("idle");
  if (lat && lng) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPinIcon aria-hidden className="size-4" />
        حُدِّد موقعك <span dir="ltr" className="font-mono text-xs">{lat}, {lng}</span>
      </p>
    );
  }
  return (
    <div className="text-sm">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 store-link"
        disabled={state === "busy"}
        onClick={() => {
          if (!navigator.geolocation) return setState("denied");
          setState("busy");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              onPick(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
              setState("idle");
            },
            () => setState("denied"),
            { enableHighAccuracy: true, timeout: 10_000 },
          );
        }}
      >
        <MapPinIcon aria-hidden className="size-4" />
        {state === "busy" ? "نحدّد موقعك…" : "تحديد موقعي"}
      </button>
      {state === "denied" ? <p className="text-xs text-muted-foreground">لم نتمكن من تحديد موقعك — يكفي العنوان المكتوب.</p> : null}
    </div>
  );
}

function ManualTransfer({
  accounts,
  register,
  amountError,
  receipt,
  receiptError,
  onReceipt,
}: {
  accounts: Array<{ account_type: "bank" | "wallet"; provider_name: string; account_number: string; account_name: string }>;
  register: ReturnType<ReturnType<typeof useForm<CheckoutDraft>>["register"]>;
  amountError?: string;
  receipt: File | null;
  receiptError: string | null;
  onReceipt: (f: File | null, error: string | null) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="store-frame space-y-4 rounded-xl border-border p-4 shadow-card bg-card" data-testid="manual-transfer">
      <p className="text-sm font-medium">حوّل المبلغ إلى أحد الحسابات التالية:</p>
      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.account_number} className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="block">
                {a.provider_name} <span className="text-muted-foreground">· {a.account_type === "bank" ? "حساب بنكي" : "محفظة"}</span>
              </span>
              <span dir="ltr" className="block font-mono tabular-nums">
                {a.account_number}
              </span>
              <span className="block text-xs text-muted-foreground">{a.account_name}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-1.5"
              aria-label={`نسخ رقم ${a.provider_name}`}
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
      <Field id="transfer_amount_reported" label="المبلغ المحوَّل (اختياري)" error={amountError}>
        <input id="field-transfer_amount_reported" dir="ltr" inputMode="decimal" {...register} className="store-frame h-11 w-48 rounded-lg border-input bg-background px-3 font-mono text-base outline-none md:text-sm" />
      </Field>
      <div className="space-y-1.5">
        <label htmlFor="field-receipt" className="block text-sm font-medium">
          صورة الإيصال (يمكن إرفاقها لاحقاً)
        </label>
        {receipt ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate">{receipt.name}</span>
            <Button type="button" variant="ghost" className="h-11" aria-label="حذف الإيصال" onClick={() => onReceipt(null, null)}>
              <XIcon aria-hidden />
            </Button>
          </div>
        ) : (
          <FileField
            id="field-receipt"
            accept={ACCEPT}
            onFile={(f) => {
              if (f && (f.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp|pdf)$/i.test(f.name))) {
                onReceipt(null, "الإيصال: صورة أو PDF حتى 5MB.");
                return false;
              }
              onReceipt(f, null);
            }}
          />
        )}
        {receiptError ? <p className="text-sm text-destructive">{receiptError}</p> : null}
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-8 md:grid-cols-12 md:px-6" aria-hidden>
      <div className="space-y-4 md:col-span-7">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="hidden h-80 animate-pulse rounded-xl bg-muted md:col-span-5 md:block" />
    </div>
  );
}
