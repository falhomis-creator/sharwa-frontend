"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { Money } from "@/components/shared/money";
import { apiFetch } from "@/lib/api-client";
import { formatNumber, toWesternDigits } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { QuoteSchema, type ProductDetail } from "@/features/storefront/schemas/catalog";
import { FileField } from "@/features/storefront/components/file-field";
import { ProductImage } from "@/features/storefront/components/product-image";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { activeTier } from "@/features/pdp/variants";
import { usePdp } from "@/stores/pdp";

/**
 * The special pricing blocks of M10 US-10.3. Each renders ONLY when its data exists
 * (FR-10.08) and shows the server's amounts — the unit price of the active tier, the
 * formula's terms, the bundle's build fee, each field's surcharge — never a local product.
 */
export function TierTable({ product }: { product: ProductDetail }) {
  const quantity = usePdp((s) => s.quantity);
  const tiers = product.tier_prices ?? [];
  if (tiers.length === 0) return null;
  const active = activeTier(tiers, quantity);
  return (
    <div className="space-y-2" data-testid="tier-table">
      <p className="text-sm font-medium">أسعار الكميات</p>
      <table className="store-frame w-full overflow-hidden rounded-lg border-border text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start font-medium">الكمية من</th>
            <th className="px-3 py-2 text-end font-medium">سعر الوحدة</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.min_quantity} aria-current={active?.min_quantity === t.min_quantity || undefined} className={cn("border-t border-border", active?.min_quantity === t.min_quantity && "bg-accent font-semibold")}>
              <td className="px-3 py-2 font-mono tabular-nums">{formatNumber(t.min_quantity)}</td>
              <td className="px-3 py-2 text-end">
                <Money value={t.display_price} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** US-10.3.2 — the value in the product's unit; the price is ASKED from the server. */
export function FormulaQuote({ product }: { product: ProductDetail }) {
  const { store, currency } = useStorefront();
  const id = useId();
  const quantity = usePdp((s) => s.quantity);
  const set = usePdp((s) => s.set);
  const [raw, setRaw] = useState(String(quantity));
  const [value, setValue] = useState(quantity);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const n = Number(toWesternDigits(raw));
      if (Number.isFinite(n) && n > 0) {
        setValue(n);
        set({ quantity: Math.max(1, Math.round(n)) });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [raw, set]);
  const quote = useQuery({
    queryKey: storeKey(store, "product", product.id, "quote", value, currency),
    queryFn: () => apiFetch(`/api/bff/catalog/products/${product.id}/quote`, QuoteSchema, { query: { value, currency } }),
    enabled: Boolean(product.formula) && value > 0,
    staleTime: 60_000,
  });
  const f = product.formula;
  if (!f) return null;
  return (
    <div className="store-frame space-y-3 rounded-lg border-border p-4" data-testid="formula-quote">
      <p className="text-sm text-muted-foreground">
        السعر = سعر الوحدة <Money value={f.display_unit_price} /> × المعامل <span className="font-mono tabular-nums">{f.coefficient}</span>
        {f.display_fixed_extra ? (
          <>
            {" "}
            + إضافة ثابتة <Money value={f.display_fixed_extra} />
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={id} className="space-y-1 text-sm">
          <span className="block font-medium">الكمية ({f.unit})</span>
          <input
            id={id}
            inputMode="decimal"
            dir="ltr"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="store-frame h-11 w-32 rounded-lg border-input bg-background px-3 font-mono text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <p className="text-sm" aria-live="polite">
          السعر النهائي{" "}
          {quote.data ? <Money value={quote.data.display_price} className="text-base font-semibold" /> : <span className="text-muted-foreground">…</span>}
        </p>
      </div>
    </div>
  );
}

/** US-10.3.3 — components with their quantities; optional parts are checkboxes. */
export function BundleParts({ product }: { product: ProductDetail }) {
  const optional = usePdp((s) => s.bundleOptional);
  const set = usePdp((s) => s.set);
  const b = product.bundle;
  if (!product.is_bundle || !b || b.components.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="bundle-parts">
      <p className="text-sm font-medium">محتويات الحزمة</p>
      <ul className="store-frame divide-y divide-border rounded-lg border-border">
        {b.components.map((c) => (
          <li key={c.product_id} className="flex items-center gap-3 p-3">
            <div className="w-12 shrink-0 overflow-hidden rounded-md">
              <ProductImage src={c.image} alt={c.name} sizes="48px" thumb />
            </div>
            <span className="flex-1 text-sm">{c.name}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">×{formatNumber(c.quantity)}</span>
            {c.is_optional ? (
              <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={optional.includes(c.product_id)}
                  onChange={(e) => set({ bundleOptional: e.target.checked ? [...optional, c.product_id] : optional.filter((x) => x !== c.product_id) })}
                  className="size-4 accent-[var(--foreground)]"
                />
                اختياري
              </label>
            ) : null}
          </li>
        ))}
      </ul>
      {b.display_build_fee ? (
        <p className="flex justify-between text-sm text-muted-foreground">
          <span>رسوم التجميع</span>
          <Money value={b.display_build_fee} />
        </p>
      ) : null}
    </div>
  );
}

const ACCEPT = { image: ".jpg,.jpeg,.png,.webp,.gif", file: ".pdf,.jpg,.jpeg,.png,.webp,.gif" } as const;
const MAX_FILE = 5 * 1024 * 1024;

/** US-10.3.4 — the nine field types, required marks, surcharge beside each priced field. */
export function PersonalizationFields({ product }: { product: ProductDetail }) {
  const values = usePdp((s) => s.personalization);
  const missing = usePdp((s) => s.missing);
  const set = usePdp((s) => s.set);
  const [fileErrors, setFileErrors] = useState<Record<number, string>>({});
  const fields = product.personalization_fields ?? [];
  if (!product.is_personalizable || fields.length === 0) return null;
  const put = (id: number, v: unknown) => set({ personalization: { ...values, [String(id)]: v }, missing: missing.filter((m) => m !== `field:${id}`) });
  const input = "store-frame h-11 w-full rounded-lg border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm";

  return (
    <fieldset className="min-w-0 space-y-4" data-testid="personalization">
      <legend className="mb-1 text-sm font-medium">التخصيص</legend>
      {fields.map((f) => {
        const fid = `pf-${f.id}`;
        const err = missing.includes(`field:${f.id}`) ? "هذا الحقل مطلوب." : fileErrors[f.id];
        const label = (
          <span className="flex items-baseline justify-between gap-2 text-sm">
            <span>
              {f.label}
              {f.is_required ? <span className="text-destructive"> *</span> : null}
            </span>
            {f.display_price_add ? (
              <span className="text-xs text-muted-foreground">
                + <Money value={f.display_price_add} />
              </span>
            ) : null}
          </span>
        );
        const v = values[String(f.id)];
        return (
          <div key={f.id} id={fid} tabIndex={-1} className="space-y-1.5 outline-none">
            {f.field_type === "checkbox" ? (
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={v === true} onChange={(e) => put(f.id, e.target.checked)} className="size-4 accent-[var(--foreground)]" />
                {label}
              </label>
            ) : (
              <label htmlFor={`${fid}-input`} className="block">
                {label}
              </label>
            )}
            {f.field_type === "text" ? <input id={`${fid}-input`} value={String(v ?? "")} onChange={(e) => put(f.id, e.target.value)} maxLength={120} className={input} /> : null}
            {f.field_type === "textarea" ? (
              <textarea id={`${fid}-input`} value={String(v ?? "")} onChange={(e) => put(f.id, e.target.value)} rows={3} maxLength={500} className={cn(input, "h-auto py-2")} />
            ) : null}
            {f.field_type === "number" ? (
              <input id={`${fid}-input`} inputMode="decimal" dir="ltr" value={String(v ?? "")} onChange={(e) => put(f.id, toWesternDigits(e.target.value).replace(/[^\d.]/g, ""))} className={cn(input, "w-32 font-mono")} />
            ) : null}
            {f.field_type === "date" ? <input id={`${fid}-input`} type="date" dir="ltr" value={String(v ?? "")} onChange={(e) => put(f.id, e.target.value)} className={cn(input, "w-48")} /> : null}
            {f.field_type === "select" ? (
              <select id={`${fid}-input`} value={String(v ?? "")} onChange={(e) => put(f.id, e.target.value)} className={input}>
                <option value="">اختر</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : null}
            {f.field_type === "multi_select" ? (
              <div className="flex flex-wrap gap-x-5" role="group" aria-label={f.label}>
                {f.options.map((o) => {
                  const list = Array.isArray(v) ? (v as string[]) : [];
                  return (
                    <label key={o} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={list.includes(o)}
                        onChange={(e) => put(f.id, e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
                        className="size-4 accent-[var(--foreground)]"
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            ) : null}
            {f.field_type === "file" || f.field_type === "image" ? (
              <FileField
                id={`${fid}-input`}
                accept={ACCEPT[f.field_type]}
                invalid={Boolean(err)}
                onFile={(file) => {
                  if (!file) return void put(f.id, null);
                  if (file.size > MAX_FILE) {
                    setFileErrors((x) => ({ ...x, [f.id]: "الملف أكبر من 5MB." }));
                    return false;
                  }
                  setFileErrors((x) => ({ ...x, [f.id]: "" }));
                  put(f.id, file.name);
                }}
              />
            ) : null}
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
          </div>
        );
      })}
    </fieldset>
  );
}
