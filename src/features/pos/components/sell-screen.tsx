"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ScanBarcode, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { inputClass, numericInputClass } from "@/components/shared/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { lookupBarcode, newIdempotencyKey, useCreateOrder, usePosContext, useProductSearch, useQuote, useRequestDiscountApproval } from "@/features/pos/api";
import { cartId, useCart, usePosCart, type CartLine } from "@/features/pos/cart-store";
import { usePosStore } from "@/features/pos/components/pos-provider";
import { useOnline } from "@/features/pos/components/pos-frame";
import { ReceiptView } from "@/features/pos/components/receipt-view";
import { ShiftGuard } from "@/features/pos/components/shift-guard";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, discountExceededSchema, type PosPaymentMethod, type PosProduct, type Quote, type Receipt, type Shift } from "@/features/pos/schemas";

/**
 * `/pos/sell` — M16 US-16.2/16.3. Search on top (barcode reader = typing + Enter), the
 * result grid in the middle, the cart pinned at the START side (right in RTL) with the
 * server's total in large Mono. On 390px the cart is a bottom sheet behind a count button.
 *
 * Keyboard (FR-16.11): F2 search · + / − quantity of the active line · F9 complete · Esc
 * clear the search / close.
 */
export function SellScreen() {
  return <ShiftGuard>{(shift) => <Till shift={shift} />}</ShiftGuard>;
}

function Till({ shift }: { shift: Shift }) {
  const store = usePosStore();
  const id = cartId(store, shift.register.id, shift.id);
  const cart = useCart(id);
  const ctx = usePosContext();
  const online = useOnline();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [scanMiss, setScanMiss] = useState<string | null>(null);
  const [variantFor, setVariantFor] = useState<PosProduct | null>(null);
  const [sheet, setSheet] = useState(false);
  const [method, setMethod] = useState<PosPaymentMethod>("cash");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [needsApproval, setNeedsApproval] = useState<string | null>(null);
  const deferred = useDeferredValue(q.trim());
  const search = useProductSearch(deferred);
  const items = useMemo(() => cart.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity, discount_percent: l.discount_percent || undefined })), [cart.lines]);
  const quote = useQuote(items, cart.cartDiscount);
  const create = useCreateOrder();
  const canDiscount = ctx.data?.can_discount ?? false;
  const api = usePosCart.getState();

  const addProduct = useCallback(
    (p: PosProduct, variantId: number | null = null) => {
      if (p.out_of_stock && variantId === null) return;
      if (p.has_variants && variantId === null) {
        setVariantFor(p);
        return;
      }
      const v = p.variants.find((x) => x.id === variantId);
      usePosCart.getState().add(id, {
        product_id: p.id,
        variant_id: v?.id ?? null,
        name: p.name,
        variant_label: v?.label ?? null,
        sku: v?.sku ?? p.sku,
        min_quantity: p.min_quantity,
        max_quantity: p.max_quantity,
        is_serialized: p.is_serialized,
      });
    },
    [id],
  );

  async function onEnter() {
    const term = q.trim();
    if (!term) return;
    // A reader types the code and sends Enter: exact barcode first (FR-16.03).
    try {
      const res = await lookupBarcode(term);
      if (res.exact && res.results[0]) {
        addProduct(res.results[0], res.exact.variant_id);
        setQ("");
        setScanMiss(null);
        return;
      }
    } catch {
      // fall through to the name search below
    }
    const hits = search.data?.results ?? [];
    if (hits.length === 1 && deferred === term) {
      addProduct(hits[0]!);
      setQ("");
      return;
    }
    if (/^\d{6,}$/.test(term)) setScanMiss(term);
  }

  const complete = useCallback(
    async (extra: { manager_code?: string; approval_id?: number } = {}) => {
      const state = usePosCart.getState();
      const current = state.carts[id];
      if (!current?.lines.length || create.isPending) return;
      const key = current.pendingKey ?? newIdempotencyKey();
      state.setPending(id, key);
      try {
        const res = await create.mutateAsync({
          register_id: shift.register.id,
          items: current.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity, discount_percent: l.discount_percent || undefined })),
          cart_discount_percent: current.cartDiscount || undefined,
          payment_method: method,
          idempotency_key: key,
          ...(current.approvalId && !extra.manager_code ? { approval_id: current.approvalId } : {}),
          ...extra,
        });
        state.clear(id);
        setNeedsApproval(null);
        setSheet(false);
        setReceipt(res.receipt);
      } catch (err) {
        if (!isApiError(err)) {
          // Never answered: keep the key; the next attempt (or reconnect) re-sends it.
          toast.error("لم يكتمل الإتمام بسبب الشبكة — سيُعاد الإرسال بنفس المفتاح فلا يتكرر الطلب.");
          return;
        }
        state.setPending(id, null);
        const exceeded = discountExceededSchema.safeParse(err.body);
        if (exceeded.success) {
          setNeedsApproval(exceeded.data.detail);
          setSheet(true);
          return;
        }
        if (err.fields?.manager_code) {
          toast.error(err.fields.manager_code[0]!);
          return;
        }
        toast.error(err.userMessage);
      }
    },
    [create, id, method, shift.register.id],
  );

  // Back online with an unconfirmed «إتمام» → re-send once with the same key (US-16.5.1).
  const resent = useRef<string | null>(null);
  useEffect(() => {
    if (online && cart.pendingKey && !create.isPending && resent.current !== cart.pendingKey) {
      resent.current = cart.pendingKey;
      void complete();
    }
  }, [online, cart.pendingKey, create.isPending, complete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F9") {
        e.preventDefault();
        void complete();
      } else if (e.key === "Escape" && !receipt && !variantFor) {
        setQ("");
        setScanMiss(null);
      } else if (!typing && (e.key === "+" || e.key === "=")) {
        usePosCart.getState().bump(id, 1);
      } else if (!typing && (e.key === "-" || e.key === "_")) {
        usePosCart.getState().bump(id, -1);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [complete, id, receipt, variantFor]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const count = cart.lines.reduce((acc, l) => acc + l.quantity, 0);
  const cartPanel = (
    <CartPanel
      cartKey={id}
      lines={cart.lines}
      cartDiscount={cart.cartDiscount}
      quote={quote.data}
      quoteStale={quote.isFetching}
      quoteError={quote.isError}
      canDiscount={canDiscount}
      maxDiscount={ctx.data?.max_discount_percent ?? null}
      method={method}
      onMethod={setMethod}
      onComplete={() => void complete()}
      completing={create.isPending}
      pending={Boolean(cart.pendingKey)}
      needsApproval={needsApproval}
      approvalId={cart.approvalId}
      onManagerCode={(code) => void complete({ manager_code: code })}
      onApprovalRequested={(approval) => api.setApproval(id, approval)}
      onApprovedRetry={() => void complete()}
    />
  );

  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-[22rem_minmax(0,1fr)] lg:grid-cols-[26rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-e border-border md:flex md:flex-col" aria-label="السلة" data-testid="pos-cart">
        {cartPanel}
      </aside>

      <section className="flex min-w-0 flex-col gap-3 p-3 pb-24 md:p-4 md:pb-4" aria-label="المنتجات">
        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute inset-y-0 start-3 my-auto size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          <input
            ref={searchRef}
            id="pos-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setScanMiss(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onEnter();
              }
            }}
            placeholder="امسح الباركود أو ابحث بالاسم أو SKU (F2)"
            aria-label="بحث المنتجات بالباركود أو الاسم أو SKU"
            aria-keyshortcuts="F2"
            autoComplete="off"
            data-testid="pos-search"
            className={cn(inputClass, "h-12 ps-11 text-base md:h-12 md:text-base")}
          />
        </div>
        {scanMiss ? (
          <p role="alert" className="text-sm" data-testid="pos-scan-miss">
            لا منتج بهذا الباركود <Mono>{scanMiss}</Mono>.{" "}
            <button type="button" className="underline underline-offset-4" onClick={() => setScanMiss(null)}>
              ابحث بالاسم بدلاً منه
            </button>
          </p>
        ) : null}
        <ProductGrid query={deferred} search={search} onPick={(p) => addProduct(p)} />
        <p className="hidden text-xs text-muted-foreground lg:block">
          <Mono>F2</Mono> بحث · <Mono>+</Mono>/<Mono>−</Mono> الكمية · <Mono>F9</Mono> إتمام · <Mono>Esc</Mono> إلغاء
        </p>
      </section>

      {/* 390px: the cart is a bottom sheet behind a fixed count button (§6). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 md:hidden">
        <button type="button" onClick={() => setSheet(true)} data-testid="pos-cart-open" className="flex h-12 w-full items-center gap-3 rounded-lg bg-primary px-4 text-primary-foreground">
          <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden />
          <span>السلة</span>
          <Mono className="rounded-sm border border-current/30 px-1.5 text-sm">{count}</Mono>
          <span className="ms-auto">
            <Money value={cart.lines.length ? (quote.data?.display_total ?? null) : null} className="text-base" />
          </span>
        </button>
      </div>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 p-0 md:hidden" data-testid="pos-cart-sheet">
          <SheetTitle className="sr-only">السلة</SheetTitle>
          {cartPanel}
        </SheetContent>
      </Sheet>

      <VariantPicker product={variantFor} onClose={() => setVariantFor(null)} onPick={(p, v) => {
        addProduct(p, v);
        setVariantFor(null);
        searchRef.current?.focus();
      }} />

      <Dialog open={receipt !== null} onOpenChange={(o) => {
        if (!o) {
          setReceipt(null);
          setTimeout(() => searchRef.current?.focus(), 0);
        }
      }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md" data-testid="pos-receipt-dialog">
          <DialogTitle>اكتمل البيع</DialogTitle>
          {receipt ? <ReceiptView receipt={receipt} /> : null}
          <div className="flex flex-wrap gap-2 pt-2">
            {receipt ? (
              <Link href={`/pos/receipts/${receipt.id}?print=1`} target="_blank" className={buttonVariants({ variant: "outline", className: "h-12 flex-1 px-4" })}>
                طباعة
              </Link>
            ) : null}
            <Button className="h-12 flex-1 px-4" onClick={() => setReceipt(null)} data-testid="pos-new-sale" autoFocus>
              بيع جديد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductGrid({ query, search, onPick }: { query: string; search: ReturnType<typeof useProductSearch>; onPick: (p: PosProduct) => void }) {
  if (search.isError) return <ErrorState error={search.error} onRetry={() => void search.refetch()} />;
  if (!search.data) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-busy data-testid="pos-grid-skeleton">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }
  if (!search.data.results.length) return <p className="py-10 text-center text-sm text-muted-foreground">لا نتائج لهذا البحث{query ? <> «{query}»</> : null}.</p>;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" data-testid="pos-grid">
      {search.data.results.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            disabled={p.out_of_stock && !p.has_variants}
            onClick={() => onPick(p)}
            data-testid="pos-product"
            data-product-id={p.id}
            className="flex h-full min-h-28 w-full flex-col gap-2 rounded-lg border border-border p-2 text-start transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
          >
            <div className="flex gap-2">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="size-12 shrink-0 rounded-md border border-border object-cover" loading="lazy" />
              ) : (
                <span aria-hidden className="size-12 shrink-0 rounded-md border border-border bg-muted" />
              )}
              <span className="line-clamp-2 min-w-0 text-sm font-medium">{p.name}</span>
            </div>
            <span className="mt-auto flex items-end justify-between gap-2">
              <Mono className="truncate text-[11px] text-muted-foreground">{p.sku}</Mono>
              <Money value={p.display_price} className="text-sm" />
            </span>
            {p.out_of_stock && !p.has_variants ? <span className="text-xs text-muted-foreground">نفد في هذا الفرع</span> : p.has_variants ? <span className="text-xs text-muted-foreground">بمتغيرات</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function VariantPicker({ product, onClose, onPick }: { product: PosProduct | null; onClose: () => void; onPick: (p: PosProduct, variantId: number) => void }) {
  return (
    <Dialog open={product !== null} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md" data-testid="pos-variants">
        <DialogTitle>اختر المتغير — {product?.name}</DialogTitle>
        <ul className="grid gap-2">
          {product?.variants.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                disabled={v.out_of_stock}
                onClick={() => onPick(product, v.id)}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-border px-3 text-start text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="min-w-0 flex-1 truncate">{v.label || v.sku}</span>
                {v.out_of_stock ? <span className="text-xs text-muted-foreground">نفد في هذا الفرع</span> : <Mono className="text-xs text-muted-foreground">{v.sku}</Mono>}
                <Money value={v.display_price} />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function CartPanel(props: {
  cartKey: string;
  lines: CartLine[];
  cartDiscount: string;
  quote: Quote | undefined;
  quoteStale: boolean;
  quoteError: boolean;
  canDiscount: boolean;
  maxDiscount: string | null;
  method: PosPaymentMethod;
  onMethod: (m: PosPaymentMethod) => void;
  onComplete: () => void;
  completing: boolean;
  pending: boolean;
  needsApproval: string | null;
  approvalId: number | null;
  onManagerCode: (code: string) => void;
  onApprovalRequested: (id: number) => void;
  onApprovedRetry: () => void;
}) {
  const { cartKey, lines, quote } = props;
  const s = usePosCart.getState();
  const exceeds = quote?.discount_exceeds_limit ?? false;
  const hasLineErrors = quote?.lines.some((l) => l.error) ?? false;
  const empty = lines.length === 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-medium">السلة</span>
        {!empty ? (
          <button type="button" className="h-12 text-xs text-muted-foreground hover:text-foreground" onClick={() => s.clear(cartKey)}>
            تفريغ
          </button>
        ) : null}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto" data-testid="pos-cart-lines">
        {empty ? <li className="px-4 py-10 text-center text-sm text-muted-foreground">السلة فارغة — امسح منتجاً أو اختره من القائمة.</li> : null}
        {lines.map((l, i) => {
          const priced = quote?.lines[i] && quote.lines[i]!.product_id === l.product_id ? quote.lines[i] : undefined;
          return (
            <li key={l.key} className="flex flex-col gap-2 px-4 py-3" data-testid="pos-cart-line" onFocus={() => s.setActive(cartKey, l.key)}>
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.variant_label ? `${l.variant_label} · ` : ""}
                    <Mono>{l.sku}</Mono>
                    {priced ? (
                      <>
                        {" "}
                        · <Mono>{priced.display_unit_price}</Mono>
                      </>
                    ) : null}
                  </span>
                </span>
                <Money value={priced?.display_line_total ?? null} className={cn("text-sm", props.quoteStale && "text-muted-foreground")} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border">
                  <button type="button" aria-label="إنقاص الكمية" className="flex size-12 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => s.setQty(cartKey, l.key, l.quantity - 1)} disabled={l.quantity <= Math.max(1, l.min_quantity ?? 1)}>
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <input
                    aria-label={`كمية ${l.name}`}
                    inputMode="numeric"
                    dir="ltr"
                    value={l.quantity}
                    onChange={(e) => s.setQty(cartKey, l.key, Number(e.target.value.replace(/\D/g, "")) || 1)}
                    className="h-12 w-12 bg-transparent text-center font-mono tabular-nums outline-none"
                    data-testid="pos-qty"
                  />
                  <button type="button" aria-label="زيادة الكمية" className="flex size-12 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => s.setQty(cartKey, l.key, l.quantity + 1)} disabled={l.is_serialized || (l.max_quantity !== null && l.quantity >= l.max_quantity)}>
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
                {props.canDiscount ? (
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    خصم
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      value={l.discount_percent}
                      onChange={(e) => s.setLineDiscount(cartKey, l.key, e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="0"
                      aria-label={`نسبة خصم ${l.name}`}
                      className={cn(numericInputClass, "h-12 w-16 md:h-12")}
                    />
                    %
                  </label>
                ) : null}
                <button type="button" aria-label={`حذف ${l.name}`} className="ms-auto flex size-12 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => s.remove(cartKey, l.key)}>
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              {priced?.error ? (
                <p role="alert" className="text-xs text-destructive">
                  {priced.error}
                </p>
              ) : l.is_serialized ? (
                <p className="text-xs text-muted-foreground">منتج بأرقام تسلسلية: قطعة واحدة لكل سطر.</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex shrink-0 flex-col gap-3 border-t border-border p-4">
        {props.canDiscount && !empty ? (
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              خصم على السلة {props.maxDiscount ? <span className="text-xs">(حدّك <Mono>{props.maxDiscount}%</Mono>)</span> : null}
            </span>
            <span className="flex items-center gap-1">
              <input
                inputMode="decimal"
                dir="ltr"
                value={props.cartDiscount}
                onChange={(e) => s.setCartDiscount(cartKey, e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
                aria-label="نسبة خصم السلة"
                data-testid="pos-cart-discount"
                className={cn(numericInputClass, "h-12 w-20 md:h-12")}
              />
              %
            </span>
          </label>
        ) : null}

        {(exceeds || props.needsApproval) && !empty ? (
          <DiscountApproval
            message={props.needsApproval ?? `يتجاوز حدّك (${props.maxDiscount}%) — طلب اعتماد المدير`}
            percent={highestPercent(props.cartDiscount, lines)}
            approvalId={props.approvalId}
            displayTotal={quote?.display_total}
            onManagerCode={props.onManagerCode}
            onRequested={props.onApprovalRequested}
            onRetry={props.onApprovedRetry}
          />
        ) : null}

        <dl className="flex flex-col gap-1 text-sm" data-testid="pos-totals">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">المجموع</dt>
            <dd>
              <Money value={empty ? null : quote?.display_subtotal} />
            </dd>
          </div>
          {quote?.display_discount && !empty ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">الخصم</dt>
              <dd>
                <Money value={quote.display_discount} />
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-medium">الإجمالي</dt>
            <dd>
              <Money value={empty ? null : quote?.display_total} className={cn("text-3xl font-semibold", props.quoteStale && "text-muted-foreground")} />
            </dd>
          </div>
          {props.quoteError ? <p className="text-xs text-destructive">تعذّر حساب الإجمالي من الخادم.</p> : null}
        </dl>

        <div role="radiogroup" aria-label="طريقة الدفع" className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={props.method === m}
              onClick={() => props.onMethod(m)}
              className={cn("h-12 rounded-lg border text-sm transition-colors", props.method === m ? "border-foreground bg-muted font-medium" : "border-border text-muted-foreground hover:bg-muted")}
            >
              {PAYMENT_METHOD_LABELS[m]}
            </button>
          ))}
        </div>

        <Button
          className="h-14 text-base"
          disabled={empty || props.completing || hasLineErrors || (exceeds && !props.approvalId && !props.needsApproval) || !quote}
          onClick={props.onComplete}
          aria-keyshortcuts="F9"
          data-testid="pos-complete"
        >
          {props.completing ? "جارٍ الإتمام…" : props.pending ? "إعادة الإرسال (F9)" : "إتمام (F9)"}
        </Button>
      </div>
    </div>
  );
}

/** FR-16.05 / SC-16.4: over the ceiling is an approval path, never a raw error. */
function DiscountApproval({ message, percent, approvalId, displayTotal, onManagerCode, onRequested, onRetry }: { message: string; percent: string; approvalId: number | null; displayTotal?: string; onManagerCode: (code: string) => void; onRequested: (id: number) => void; onRetry: () => void }) {
  const [code, setCode] = useState("");
  const request = useRequestDiscountApproval();
  async function ask() {
    try {
      const res = await request.mutateAsync({ discount_percent: percent, display_total: displayTotal });
      onRequested(res.approval_id);
      toast.success(res.detail);
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر إرسال طلب الاعتماد.");
    }
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm" data-testid="pos-discount-approval">
      <p className="font-medium">{message}</p>
      {approvalId ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-muted-foreground">
            طلب الاعتماد <Mono>#{approvalId}</Mono> عند المدير. أعد «إتمام» بعد اعتماده.
          </span>
          <Button variant="outline" className="h-12 px-3" onClick={onRetry}>
            تحقّق وأتمّ
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              dir="ltr"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="رمز المدير"
              aria-label="رمز المدير"
              data-testid="pos-manager-code"
              className={cn(numericInputClass, "h-12 flex-1 md:h-12")}
            />
            <Button className="h-12 px-3" disabled={code.length < 4} onClick={() => onManagerCode(code)} data-testid="pos-manager-submit">
              اعتماد وإتمام
            </Button>
          </div>
          <Button variant="outline" className="h-12" disabled={request.isPending} onClick={() => void ask()}>
            إرسال طلب اعتماد للمدير
          </Button>
        </>
      )}
    </div>
  );
}

/** The highest percent typed in the cart — what the approval request asks for (not money). */
function highestPercent(cartDiscount: string, lines: CartLine[]): string {
  const all = [cartDiscount, ...lines.map((l) => l.discount_percent)].map((v) => Number(v) || 0);
  return String(Math.max(0, ...all));
}
