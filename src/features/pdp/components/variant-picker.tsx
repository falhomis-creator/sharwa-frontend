"use client";

import { cn } from "@/lib/utils";
import type { ProductDetail } from "@/features/storefront/schemas/catalog";
import { optionState } from "@/features/pdp/variants";
import { usePdp } from "@/stores/pdp";

/**
 * Variant picker in the merchant's chosen style (M10 US-10.2.1, FR-10.03): `swatches` —
 * 44px squares, the swatch colour the ONE allowed inline style (it is data — M10 §11 VII),
 * selection by ring; `dropdown` — a native select; `radio` — text buttons. Unavailable
 * combinations stay visible, struck through, `aria-disabled`, with the reason (US-10.2.2).
 * Legacy products without variants pick from `sizes_list` / `colors_list` (US-10.2.4).
 */
export function VariantPicker({ product }: { product: ProductDetail }) {
  const attributes = product.attributes ?? [];
  const variants = product.variants ?? [];
  const selected = usePdp((s) => s.selected);
  const choose = usePdp((s) => s.choose);
  const missing = usePdp((s) => s.missing);
  const style = product.variant_display_style ?? "radio";

  return (
    <div className="space-y-5">
      {attributes.map((attr) => {
        const chosen = attr.options.find((o) => o.id === selected[attr.id]);
        const isMissing = missing.includes(`attr:${attr.id}`);
        const groupId = `attr-${attr.id}`;
        const useSwatch = style === "swatches" && attr.options.some((o) => o.color || o.image);
        const useSelect = style === "dropdown" && !useSwatch;
        return (
          <fieldset key={attr.id} id={groupId} tabIndex={-1} className="min-w-0 space-y-2 outline-none" aria-describedby={isMissing ? `${groupId}-error` : undefined}>
            <legend className="text-sm">
              <span className="font-medium">{attr.name}</span>
              {chosen ? <span className="ms-2 text-muted-foreground">{chosen.value}</span> : null}
            </legend>
            {useSelect ? (
              <select
                aria-label={attr.name}
                value={selected[attr.id] ?? ""}
                onChange={(e) => e.target.value && choose(attr.id, Number(e.target.value))}
                aria-invalid={isMissing || undefined}
                className="store-frame h-11 w-full rounded-lg border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
              >
                <option value="">اختر {attr.name}</option>
                {attr.options.map((o) => {
                  const st = optionState(product, variants, attributes, selected, attr, o.id);
                  return (
                    <option key={o.id} value={o.id} disabled={!st.available}>
                      {o.value}
                      {st.available ? "" : ` — ${st.reason}`}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={attr.name}>
                {attr.options.map((o) => {
                  const st = optionState(product, variants, attributes, selected, attr, o.id);
                  const isOn = selected[attr.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={isOn}
                      aria-disabled={!st.available || undefined}
                      title={st.reason ?? o.value}
                      onClick={() => st.available && choose(attr.id, o.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && st.available) choose(attr.id, o.id);
                      }}
                      data-testid={`option-${o.id}`}
                      className={cn(
                        "store-frame relative inline-flex min-h-11 items-center justify-center rounded-lg border-border text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        useSwatch ? "size-11 p-1" : "min-w-11 px-3",
                        isOn && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                        !st.available && "cursor-not-allowed text-muted-foreground line-through opacity-50",
                      )}
                    >
                      {useSwatch ? (
                        <>
                          <span aria-hidden className="block size-full rounded-[calc(var(--radius)-4px)] border border-border" style={{ backgroundColor: o.color ?? undefined }} />
                          <span className="sr-only">{o.value}</span>
                          {!st.available ? <span aria-hidden className="absolute inset-x-1 top-1/2 h-px -rotate-45 bg-foreground" /> : null}
                        </>
                      ) : (
                        o.value
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {isMissing ? (
              <p id={`${groupId}-error`} className="text-sm text-destructive">
                اختر {attr.name} أولاً.
              </p>
            ) : null}
          </fieldset>
        );
      })}
      <LegacyOptions product={product} />
    </div>
  );
}

function LegacyOptions({ product }: { product: ProductDetail }) {
  const size = usePdp((s) => s.size);
  const color = usePdp((s) => s.color);
  const set = usePdp((s) => s.set);
  const missing = usePdp((s) => s.missing);
  if ((product.attributes ?? []).length > 0) return null;
  const groups = [
    { key: "size" as const, label: "المقاس", values: product.sizes_list, value: size },
    { key: "color" as const, label: "اللون", values: product.colors_list, value: color },
  ].filter((g) => g.values.length > 0);
  return (
    <>
      {groups.map((g) => (
        <fieldset key={g.key} id={`legacy-${g.key}`} tabIndex={-1} className="min-w-0 space-y-2 outline-none">
          <legend className="text-sm">
            <span className="font-medium">{g.label}</span>
            {g.value ? <span className="ms-2 text-muted-foreground">{g.value}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={g.label}>
            {g.values.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={g.value === v}
                onClick={() => set({ [g.key]: g.value === v ? null : v, missing: missing.filter((m) => m !== `legacy:${g.key}`) })}
                className={cn(
                  "store-frame inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border-border px-3 text-sm",
                  g.value === v && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {missing.includes(`legacy:${g.key}`) ? <p className="text-sm text-destructive">اختر {g.label} أولاً.</p> : null}
        </fieldset>
      ))}
    </>
  );
}
