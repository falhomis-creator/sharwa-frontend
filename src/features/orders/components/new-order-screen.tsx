"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, inputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBox } from "@/components/shared/data-table/filter-bar";
import { isApiError } from "@/lib/api-error";
import { normalizePhone, toWesternDigits } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { orderKeys, ordersApi, useOrderFormOptions } from "@/features/orders/api";
import { useProduct, useProducts } from "@/features/products/api/products";
import { ProductThumb } from "@/features/products/components/product-thumb";
import type { ProductListItem } from "@/features/products/schemas";

/**
 * `/dashboard/orders/new` (US-06.6, T078): a phone order — customer by phone, product lines
 * from the Ready product search (variant picked per line), delivery or pickup, and
 * `sales_channel: phone`. Staff with `orders.create_b2b` may send it as a wholesale draft
 * instead, which waits for approval (M18). Totals are NOT computed here: the server prices
 * the order (constitution II — money only from `display_*`).
 */
interface Line {
  key: number;
  product: ProductListItem;
  variantId: number | null;
  quantity: number;
}

function phoneFor(input: string): string {
  const d = toWesternDigits(input).replace(/\D/g, "");
  return normalizePhone(input, d.startsWith("05") || d.startsWith("5") ? "966" : "967");
}

function LineRow({ line, index, errors, onChange, onRemove }: { line: Line; index: number; errors: Record<string, string>; onChange: (l: Line) => void; onRemove: () => void }) {
  const detail = useProduct(line.product.has_variants ? line.product.id : null);
  const variants = detail.data?.variants ?? [];
  const variant = variants.find((v) => v.id === line.variantId);
  const qtyError = errors[`items.${index}.quantity`] ?? errors[`items.${index}.product_id`];
  return (
    <li className="flex flex-col gap-2 border-b border-border p-3 last:border-0" data-testid="order-line">
      <div className="flex items-center gap-3">
        <ProductThumb src={line.product.image} name={line.product.name} size={40} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{line.product.name}</span>
          <Mono className="text-xs text-muted-foreground">{variant?.sku ?? line.product.sku}</Mono>
        </span>
        <Money value={variant?.display_effective_price ?? line.product.display_price} className="text-sm" />
        <button type="button" onClick={onRemove} aria-label={`إزالة «${line.product.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {line.product.has_variants ? (
          detail.isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <NativeSelect
              value={line.variantId ?? ""}
              onChange={(e) => onChange({ ...line, variantId: e.target.value ? Number(e.target.value) : null })}
              className="h-11 lg:h-8"
              aria-label={`متغير «${line.product.name}»`}
            >
              <option value="">اختر المتغير</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id} disabled={Number(v.stock) <= 0}>
                  {v.label}
                  {Number(v.stock) <= 0 ? " — نفد" : ""}
                </option>
              ))}
            </NativeSelect>
          )
        ) : null}
        <div className="flex items-center rounded-lg border border-input">
          <button type="button" aria-label="إنقاص الكمية" onClick={() => onChange({ ...line, quantity: Math.max(1, line.quantity - 1) })} className="flex size-11 items-center justify-center lg:size-8">
            <Minus className="size-3.5" aria-hidden />
          </button>
          <input
            inputMode="numeric"
            dir="ltr"
            value={line.quantity}
            onChange={(e) => onChange({ ...line, quantity: Math.max(1, Number(toWesternDigits(e.target.value).replace(/\D/g, "")) || 1) })}
            aria-label={`كمية «${line.product.name}»`}
            className="h-11 w-12 bg-transparent text-center font-mono text-sm outline-none lg:h-8"
          />
          <button type="button" aria-label="زيادة الكمية" onClick={() => onChange({ ...line, quantity: line.quantity + 1 })} className="flex size-11 items-center justify-center lg:size-8">
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
        {qtyError ? <p role="alert" className="text-xs text-destructive">{qtyError}</p> : null}
      </div>
    </li>
  );
}

export function NewOrderScreen() {
  const router = useRouter();
  const store = useStore();
  const qc = useQueryClient();
  const { canPermission } = useAccess();
  const canCreate = canPermission("orders.update_status");
  const canB2b = canPermission("orders.create_b2b");
  const options = useOrderFormOptions();
  const [q, setQ] = useState("");
  const results = useProducts({ q, page_size: 6, status: "published" }, { enabled: q.trim().length > 0 });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [methodId, setMethodId] = useState("");
  const [address, setAddress] = useState("");
  const [pickupId, setPickupId] = useState("");
  const [channel, setChannel] = useState<"phone" | "b2b_draft">("phone");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function add(p: ProductListItem) {
    const existing = lines.find((l) => l.product.id === p.id && !p.has_variants);
    if (existing) setLines(lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)));
    else {
      setLines([...lines, { key: nextKey, product: p, variantId: null, quantity: 1 }]);
      setNextKey(nextKey + 1);
    }
  }

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.customer_name = "أدخل اسم العميل.";
    if (!phone.trim()) e.customer_phone = "أدخل رقم الهاتف.";
    if (lines.length === 0) e.items = "أضف منتجاً واحداً على الأقل.";
    lines.forEach((l, i) => {
      if (l.product.has_variants && !l.variantId) e[`items.${i}.quantity`] = "اختر المتغير.";
    });
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setBusy(true);
    try {
      const methods = options.data?.delivery_methods ?? [];
      const pickups = options.data?.pickup_locations ?? [];
      const res = await ordersApi.create({
        customer_name: name.trim(),
        customer_phone: phoneFor(phone),
        sales_channel: channel,
        delivery,
        delivery_method_id: delivery === "delivery" ? Number(methodId || methods[0]?.id) : undefined,
        address: delivery === "delivery" ? address : undefined,
        pickup_location_id: delivery === "pickup" ? Number(pickupId || pickups[0]?.id) : undefined,
        items: lines.map((l) => ({ product_id: l.product.id, variant_id: l.variantId ?? undefined, quantity: String(l.quantity) })),
      });
      await qc.invalidateQueries({ queryKey: orderKeys(store).all });
      await qc.invalidateQueries({ queryKey: storeKey(store, "dashboard") });
      toast.success(res.pending_approval ? `أُرسلت مسودة الجملة #${res.id} — طلب الموافقة #${res.pending_approval.id}` : `أُنشئ الطلب #${res.id}`);
      router.push(`/dashboard/orders/${res.id}`);
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر إنشاء الطلب.");
    } finally {
      setBusy(false);
    }
  }

  if (!canCreate) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">إنشاء الطلبات يدوياً يتطلب صلاحية «تحديث حالة الطلب».</p>;
  }

  const inCart = new Set(lines.map((l) => l.product.id));
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/orders" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> الطلبات
      </Link>
      <PageHeader title="طلب يدوي" description="لعميل اتصل هاتفياً: المنتجات، والتوصيل أو الاستلام. يُحسب الإجمالي عند الإنشاء." />
      <form
        className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        data-testid="new-order-form"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="lines-h">
            <h2 id="lines-h" className="text-sm font-medium">
              المنتجات
            </h2>
            <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو SKU" label="بحث عن منتج" delay={200} />
            {q.trim() ? (
              results.isLoading ? (
                <Skeleton className="h-24" />
              ) : (results.data?.results.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">لا منتج يطابق</p>
              ) : (
                <ul className="rounded-lg border border-border" data-testid="new-order-results">
                  {results.data!.results.map((p) => (
                    <li key={p.id} className="flex min-h-12 items-center gap-2 border-b border-border px-2 last:border-0">
                      <ProductThumb src={p.image} name={p.name} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      <Money value={p.display_price} className="text-sm" />
                      <Button type="button" variant="outline" size="sm" className="h-11 gap-1 lg:h-8" onClick={() => add(p)} disabled={Number(p.stock) <= 0 && !p.has_variants}>
                        <Plus className="size-3.5" aria-hidden /> {inCart.has(p.id) ? "واحد آخر" : "إضافة"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">{errors.items ?? "ابحث عن منتج وأضفه."}</p>
            ) : (
              <ul className="rounded-lg border border-border">
                {lines.map((l, i) => (
                  <LineRow
                    key={l.key}
                    line={l}
                    index={i}
                    errors={errors}
                    onChange={(next) => setLines(lines.map((x) => (x.key === l.key ? next : x)))}
                    onRemove={() => setLines(lines.filter((x) => x.key !== l.key))}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-4" aria-labelledby="customer-h">
            <h2 id="customer-h" className="text-sm font-medium">
              العميل
            </h2>
            <Field label="رقم الهاتف" htmlFor="o-phone" required error={errors.customer_phone} hint="مثال: 0501234567 أو 770841802">
              <input id="o-phone" type="tel" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="الاسم" htmlFor="o-name" required error={errors.customer_name}>
              <input id="o-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="delivery-h">
            <h2 id="delivery-h" className="text-sm font-medium">
              الاستلام
            </h2>
            <div role="radiogroup" aria-label="طريقة الاستلام" className="grid grid-cols-2 gap-2">
              {(["delivery", "pickup"] as const).map((d) => (
                <label key={d} className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border text-sm has-checked:border-foreground lg:h-9">
                  <input type="radio" name="delivery" className="sr-only" checked={delivery === d} onChange={() => setDelivery(d)} />
                  {d === "delivery" ? "توصيل" : "استلام من فرع"}
                </label>
              ))}
            </div>
            {delivery === "delivery" ? (
              <>
                <Field label="طريقة التوصيل" htmlFor="o-method">
                  <NativeSelect id="o-method" value={methodId} onChange={(e) => setMethodId(e.target.value)} className="h-11 lg:h-8">
                    {(options.data?.delivery_methods ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.display_price} · {m.estimated_time}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="العنوان" htmlFor="o-address" required error={errors.address}>
                  <textarea
                    id="o-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="min-h-16 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                  />
                </Field>
              </>
            ) : (
              <Field label="نقطة الاستلام" htmlFor="o-pickup" error={errors.pickup_location_id}>
                <NativeSelect id="o-pickup" value={pickupId} onChange={(e) => setPickupId(e.target.value)} className="h-11 lg:h-8">
                  {(options.data?.pickup_locations ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </section>

          {canB2b ? (
            <section className="flex flex-col gap-2" aria-labelledby="channel-h">
              <h2 id="channel-h" className="text-sm font-medium">
                النوع
              </h2>
              <NativeSelect value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="h-11 lg:h-8" aria-labelledby="channel-h">
                <option value="phone">طلب هاتفي</option>
                <option value="b2b_draft">مسودة جملة (بانتظار الموافقة)</option>
              </NativeSelect>
            </section>
          ) : null}

          <Button type="submit" size="lg" className="h-11 lg:h-10" disabled={busy} data-testid="create-order">
            {busy ? "جارٍ الإنشاء…" : channel === "b2b_draft" ? "إرسال المسودة للموافقة" : "إنشاء الطلب"}
          </Button>
        </div>
      </form>
    </div>
  );
}
