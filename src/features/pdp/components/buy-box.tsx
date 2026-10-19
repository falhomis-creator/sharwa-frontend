"use client";

import { Share2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatNumber, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_POLICY_LABELS } from "@/features/products/schemas/enums";
import { useCartAction } from "@/features/cart/api";
import { cardImage, type ProductDetail } from "@/features/storefront/schemas/catalog";
import { lineKey } from "@/features/storefront/schemas/cart";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import dynamic from "next/dynamic";
import { QuantityStepper } from "@/features/pdp/components/quantity-stepper";
import { VariantPicker } from "@/features/pdp/components/variant-picker";
import { activeTier, resolveVariant, selectionFromVariant, variantLabel } from "@/features/pdp/variants";
import { bundleChoicesOf, firstViolation } from "@/features/pdp/compat";
import { useCartUi } from "@/stores/cart-ui";
import { usePdp } from "@/stores/pdp";
import { useShopperPhone } from "@/features/engagement/api";
import { WishlistButton } from "@/features/engagement/components/wishlist-button";

// Below-the-fold / conditional blocks are split into their own chunks (T095): most products
// have none of them, so the PDP's first paint pays for neither their code nor their deps.
const block = () => <div className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden />;
const AuctionPanel = dynamic(() => import("@/features/pdp/components/auction-panel").then((m) => m.AuctionPanel), { loading: block });
const BookingPicker = dynamic(() => import("@/features/pdp/components/booking-picker").then((m) => m.BookingPicker), { loading: block });
const TierTable = dynamic(() => import("@/features/pdp/components/special-pricing").then((m) => m.TierTable));
const FormulaQuote = dynamic(() => import("@/features/pdp/components/special-pricing").then((m) => m.FormulaQuote), { loading: block });
const BundleParts = dynamic(() => import("@/features/pdp/components/special-pricing").then((m) => m.BundleParts));
const PersonalizationFields = dynamic(() => import("@/features/pdp/components/special-pricing").then((m) => m.PersonalizationFields));

/**
 * The buy box (M10 US-10.1…US-10.7): name, price of the CURRENT choice (variant → tier →
 * product, always a server string — FR-10.02), availability, payment policy, the pickers,
 * ONE dominant «أضف إلى السلة» and an outline «اشترِ الآن». Price and availability announce
 * through `aria-live` (FR-10.09). A missing required choice focuses its group with a message
 * and nothing is sent (US-10.2.5, SC-10.3). On phones a sticky bar repeats price + button
 * whenever the real button is off-screen (FR-10.06).
 */
export function BuyBox({ product, compactTitle = false }: { product: ProductDetail; compactTitle?: boolean }) {
  const { store } = useStorefront();
  const router = useRouter();
  const attributes = product.attributes ?? [];
  const variants = product.variants ?? [];
  const [url, setUrl] = useQueryStates({ v: parseAsInteger, qty: parseAsInteger }, { history: "replace", scroll: false });
  // Seed the choices from `?v=`/`?qty=` ONCE, before anything subscribes to the store (the
  // page renders this component with `key={product.id}`, so another product remounts it).
  useState(() => {
    const fromUrl = variants.find((v) => v.id === url.v);
    usePdp.getState().reset(product.id, {
      selected: selectionFromVariant(attributes, fromUrl),
      quantity: Math.max(product.min_quantity ?? 1, url.qty ?? product.min_quantity ?? 1),
    });
    return true;
  });
  const pdp = usePdp();
  const action = useCartAction(store);
  const openCart = useCartUi((s) => s.openCart);
  const addButton = useRef<HTMLButtonElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [notify, setNotify] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const variant = resolveVariant(variants, attributes, pdp.selected);
  const tiers = product.tier_prices ?? [];
  const tier = activeTier(tiers, pdp.quantity);
  const price = variant?.display_effective_price ?? tier?.display_price ?? product.display_price;
  const stock = variant ? variant.stock : product.stock;
  const threshold = product.low_stock_threshold ?? 3;
  const out = stock <= 0 && !product.allow_backorder;
  const preorder = stock <= 0 && Boolean(product.allow_backorder);
  const physical = (product.product_type ?? "physical") === "physical";
  // M37: a bundle missing a mandatory component, or a combination a rule forbids, cannot be added.
  const bundle = product.is_bundle ? product.bundle : null;
  const bundleChoices = bundle ? bundleChoicesOf(bundle, pdp.bundleChoices) : [];
  const bundleConflict = bundle ? firstViolation(bundle.rules ?? [], bundleChoices) : null;
  const bundleBlocked = Boolean(bundle?.unavailable_component) || bundleConflict !== null;

  // Mirror the resolved variant and quantity into the URL (shareable — M10 §11 IX).
  useEffect(() => {
    const v = variant?.id ?? null;
    const qty = pdp.quantity > (product.min_quantity ?? 1) ? pdp.quantity : null;
    if (v !== url.v || qty !== url.qty) void setUrl({ v, qty });
  }, [variant?.id, pdp.quantity, product.min_quantity, url.v, url.qty, setUrl]);

  useEffect(() => {
    const el = addButton.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function validate(): boolean {
    const missing: string[] = [];
    for (const a of attributes) if (a.is_required && pdp.selected[a.id] === undefined) missing.push(`attr:${a.id}`);
    if (attributes.length === 0) {
      if (product.sizes_list.length > 0 && !pdp.size) missing.push("legacy:size");
      if (product.colors_list.length > 0 && !pdp.color) missing.push("legacy:color");
    }
    for (const f of product.personalization_fields ?? []) {
      const v = pdp.personalization[String(f.id)];
      const empty = v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
      if (f.is_required && empty) missing.push(`field:${f.id}`);
    }
    if (product.is_bookable && !pdp.startDatetime) missing.push("booking");
    for (const c of bundle?.components ?? []) {
      const needed = c.choice && (!c.is_optional || pdp.bundleOptional.includes(c.product_id));
      if (needed && pdp.bundleChoices[c.product_id] === undefined) missing.push(`bundle:${c.product_id}`);
    }
    pdp.set({ missing });
    if (bundleBlocked) return false;
    if (missing.length) {
      const first = missing[0]!;
      const target = first.startsWith("attr:")
        ? `attr-${first.slice(5)}`
        : first.startsWith("legacy:")
          ? `legacy-${first.slice(7)}`
          : first.startsWith("field:")
            ? `pf-${first.slice(6)}`
            : "booking";
      const el = document.getElementById(target);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return false;
    }
    return true;
  }

  function add(opener: HTMLElement | null) {
    if (!validate()) return;
    const input = {
      product_id: product.id,
      size: pdp.size,
      color: pdp.color,
      variant_id: variant?.id ?? null,
      action_type: "add" as const,
      quantity: pdp.quantity,
      personalization:
        Object.keys(pdp.personalization).length || bundle
          ? {
              ...pdp.personalization,
              ...(bundle ? { bundle_optional: pdp.bundleOptional, bundle_selection: bundleChoices.map((c) => ({ component_id: c.component, option_id: pdp.bundleChoices[c.component] })) } : {}),
            }
          : undefined,
      start_datetime: pdp.startDatetime,
    };
    action.mutate({
      ...input,
      optimistic: { name: product.name, display_price: price, image: variant?.image ?? cardImage(product), variant_label: variantLabel(attributes, variant) },
    });
    openCart(opener, lineKey(input));
  }

  function buyNow() {
    if (!validate()) return;
    const qs = new URLSearchParams({ mode: "buy_now", product: String(product.id), qty: String(pdp.quantity) });
    if (variant) qs.set("variant", String(variant.id));
    if (pdp.size) qs.set("size", pdp.size);
    if (pdp.color) qs.set("color", pdp.color);
    if (pdp.startDatetime) qs.set("start", pdp.startDatetime);
    router.push(`/checkout?${qs.toString()}`);
  }

  const policy =
    product.payment_policy === "deposit"
      ? product.display_deposit
        ? `عربون مقدماً: ${product.display_deposit} والباقي عند الاستلام`
        : PAYMENT_POLICY_LABELS.deposit
      : PAYMENT_POLICY_LABELS[product.payment_policy];

  return (
    <div className="space-y-5" data-testid="buy-box">
      <div className="space-y-2">
        {product.category_path?.length || product.category ? (
          <p className="text-sm text-muted-foreground">{product.category_path?.at(-1)?.name ?? String(product.category ?? "")}</p>
        ) : null}
        <h1 className={cn("font-bold leading-tight tracking-tight", compactTitle ? "text-2xl" : "text-2xl md:text-3xl")}>{product.name}</h1>
        {product.reviews_summary ? (
          <a href="#reviews" className="-my-1.5 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <span className="font-mono tabular-nums text-foreground">{product.reviews_summary.average_rating.toFixed(1)}</span>
            من 5 · <span className="font-mono tabular-nums">{formatNumber(product.reviews_summary.count)}</span> تقييم
          </a>
        ) : null}
      </div>

      <div className="space-y-1.5" aria-live="polite" data-testid="pdp-price">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {product.display_old_price && !variant ? (
            <span className="text-base text-muted-foreground line-through decoration-1">
              <Money value={product.display_old_price} muted />
            </span>
          ) : null}
          <Money value={price} className="text-2xl font-bold md:text-3xl" />
          {product.display_old_price && !variant ? <span className="text-sm font-medium">تخفيض</span> : null}
        </div>
        {out ? (
          <p className="text-sm font-medium text-destructive">نفدت الكمية</p>
        ) : preorder ? (
          <p className="text-sm font-medium text-info">متاح للطلب المسبق</p>
        ) : stock <= threshold && !product.is_auction ? (
          <p className="text-sm font-medium text-warning">
            بقي <span className="font-mono tabular-nums">{formatNumber(stock)}</span> فقط
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">{policy}</p>
        {product.refundable_deposit ? (
          <p className="text-sm" data-testid="refundable-deposit">
            وديعة قابلة للاسترداد: <Money value={product.refundable_deposit.display_amount} />
            {product.refundable_deposit.refund_rule ? <span className="block text-muted-foreground">{product.refundable_deposit.refund_rule}</span> : null}
          </p>
        ) : null}
      </div>

      <VariantPicker product={product} />
      {product.tier_prices?.length ? <TierTable product={product} /> : null}
      {product.pricing_type === "formula" ? <FormulaQuote product={product} /> : null}
      {product.is_bundle && product.bundle?.components.length ? <BundleParts product={product} /> : null}
      {product.is_personalizable && product.personalization_fields?.length ? <PersonalizationFields product={product} /> : null}
      {product.is_bookable ? <BookingPicker productId={product.id} durationMinutes={product.booking_duration_minutes ?? null} missing={pdp.missing.includes("booking")} /> : null}

      {product.is_auction ? (
        <AuctionPanel productId={product.id} onBuyNow={buyNow} />
      ) : (
        <>
          {product.pricing_type !== "formula" && !out ? <QuantityStepper product={product} stock={stock} /> : null}
          <div className="space-y-2">
            {out ? (
              subscribed ? (
                <Button ref={addButton} className="h-12 w-full text-base" disabled data-testid="notify-me" aria-disabled>
                  سنُنبّهك عبر واتساب
                </Button>
              ) : (
                <Button ref={addButton} className="h-12 w-full text-base" onClick={() => setNotify(true)} data-testid="notify-me">
                  أعلمني عند التوفر
                </Button>
              )
            ) : (
              <Button ref={addButton} className="h-12 w-full text-base" onClick={(e) => add(e.currentTarget)} disabled={bundleBlocked} data-testid="add-to-cart">
                أضف إلى السلة
              </Button>
            )}
            {!out ? (
              <Button variant="outline" className="h-11 w-full" onClick={buyNow} disabled={bundleBlocked} data-testid="buy-now">
                اشترِ الآن
              </Button>
            ) : null}
          </div>
          {notify && !subscribed ? (
            <BackInStock
              productId={product.id}
              onDone={() => {
                setNotify(false);
                setSubscribed(true);
              }}
            />
          ) : null}
        </>
      )}

      <div className="flex items-center gap-1">
        <WishlistButton productId={product.id} variant="pdp" />
        <ShareButton name={product.name} />
      </div>

      {physical ? <DeliveryInfo product={product} /> : null}

      {/* Phones: price + the add button stay reachable while the real one is off-screen. */}
      {!product.is_auction && !out ? (
        <div
          className={cn(
            "store-frame fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-x-0 border-b-0 border-border bg-background px-4 py-2 transition-transform md:hidden",
            offscreen ? "translate-y-0" : "pointer-events-none translate-y-[200%]",
          )}
          aria-hidden={!offscreen}
          data-testid="sticky-add"
        >
          <Money value={price} className="text-base font-semibold" />
          <Button className="h-11 flex-1" tabIndex={offscreen ? 0 : -1} onClick={(e) => add(e.currentTarget)}>
            أضف إلى السلة
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** FR-10.07 — delivery, free shipping, the return policy link; plain text rows with 1px rules. */
function DeliveryInfo({ product }: { product: ProductDetail }) {
  const rows = [
    product.delivery_duration ? { label: "مدة التوصيل", value: product.delivery_duration } : null,
    product.is_free_shipping ? { label: "الشحن", value: "شحن مجاني", tone: "text-success" } : null,
  ].filter((r): r is { label: string; value: string; tone?: string } => Boolean(r));
  return (
    <section aria-label="معلومات التسليم" className="border-t border-border pt-4 text-sm">
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 py-2.5">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className={r.tone}>{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-2.5">
          <dt className="text-muted-foreground">الإرجاع</dt>
          <dd>
            <a href="/about#returns" className="store-link -my-2.5 inline-flex min-h-11 items-center underline-offset-4 hover:underline">
              سياسة الاسترجاع
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** FR-10.12 — Web Share where available, otherwise copy the link + WhatsApp. */
function ShareButton({ name }: { name: string }) {
  const [fallback, setFallback] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        className="h-11 gap-2"
        onClick={async () => {
          const url = window.location.href;
          if (navigator.share) {
            await navigator.share({ title: name, url }).catch(() => undefined);
            return;
          }
          await navigator.clipboard?.writeText(url).catch(() => undefined);
          toast("نُسخ رابط المنتج");
          setFallback(true);
        }}
      >
        <Share2Icon aria-hidden />
        مشاركة
      </Button>
      {fallback ? (
        <a
          className="inline-flex min-h-11 items-center px-2 text-sm store-link"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(`${name} ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
        >
          واتساب
        </a>
      ) : null}
    </div>
  );
}

function BackInStock({ productId, onDone }: { productId: number; onDone: () => void }) {
  const { store } = useStorefront();
  const known = useShopperPhone(store).data?.phone_normalized ?? null;
  // Prefilled from the session's phone when it is known (M42 US-42.5): one tap instead of typing.
  const [phone, setPhone] = useState(known ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="store-frame space-y-2 rounded-lg border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await apiFetch(`/api/bff/catalog/products/${productId}/back-in-stock`, z.unknown(), { method: "POST", json: { phone: normalizePhone(phone) } });
          toast.success("سنُنبّهك عبر واتساب عند توفّر المنتج.");
          onDone();
        } catch (err) {
          setError(isApiError(err) ? err.userMessage : "تعذّر الاشتراك.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={`bis-${productId}`} className="text-sm font-medium">
        رقم واتساب لإشعارك
      </label>
      <div className="flex gap-2">
        <input
          id={`bis-${productId}`}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="store-frame h-11 min-w-0 flex-1 rounded-lg border-input bg-background px-3 font-mono text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button type="submit" className="h-11" disabled={!phone.trim() || busy}>
          أعلمني
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
