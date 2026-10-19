"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { isApiError, type ApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProducts, useVariantAttributes } from "@/features/products/api/products";
import { useExtra, useExtraWrite } from "@/features/products/api/extras";
import type { ProductDetail } from "@/features/products/schemas";
import {
  AUCTION_STATUSES,
  AUCTION_STATUS_LABELS,
  COMPAT_OPERATORS,
  COMPAT_OPERATOR_LABELS,
  PERSONALIZATION_TYPES,
  PERSONALIZATION_TYPE_LABELS,
  SERIAL_STATUS_LABELS,
  duplicateSerials,
  duplicateTier,
  splitCodes,
  type AuctionSettings,
  type PersonalizationFieldRow,
  type PersonalizationType,
} from "@/features/products/schemas/extras";

/**
 * «الأنماط المتقدمة» tab of the product editor (M37 FR-37.01 + M36 US-36.3): one
 * collapsible section per enabled flag — tier prices (always), bundle + compatibility
 * rules (`is_bundle`), personalization fields (`is_personalizable`), auction
 * (`is_auction`), serial codes (`is_serialized`). Each section saves its own resource
 * immediately (they are separate rows server side, not fields of the product form);
 * derived amounts are the server's strings (FR-37.02). A flag is switched in the side
 * column of the «المنتج» tab and takes effect here once the product is saved.
 */
export function AdvancedPanels({ product, readOnly }: { product: ProductDetail; readOnly: boolean }) {
  const none = !product.is_bundle && !product.is_personalizable && !product.is_auction && !product.is_serialized;
  return (
    <div className="flex flex-col" data-testid="advanced-panels">
      <Panel id="tiers" title="أسعار الكميات" description="سعر الوحدة ينخفض عند بلوغ كمية معيّنة؛ يُطبَّق أعلى حدٍّ لا يتجاوز كمية المشتري.">
        <TierPrices productId={product.id} readOnly={readOnly} />
      </Panel>
      {product.is_bundle ? (
        <Panel id="bundle" title="الحزمة" description="مكوّنات الحزمة وقواعد التوافق بين خيارات مكوّناتها.">
          <BundleComponents product={product} readOnly={readOnly} />
          <CompatibilityRules productId={product.id} readOnly={readOnly} />
        </Panel>
      ) : null}
      {product.is_personalizable ? (
        <Panel id="personalization" title="حقول التخصيص" description="يملؤها المشتري في صفحة المنتج وتُلحق بالطلب دون خصم مخزون. اسحب لإعادة الترتيب.">
          <PersonalizationFields productId={product.id} readOnly={readOnly} />
        </Panel>
      ) : null}
      {product.is_auction ? (
        <Panel id="auction" title="المزاد" description="قطعة واحدة لأعلى مزايد؛ المخزون مثبّت على 1 والسعر الاحتياطي لا يظهر للمشترين أبداً.">
          <AuctionSettingsPanel productId={product.id} readOnly={readOnly} />
        </Panel>
      ) : null}
      {product.is_serialized ? (
        <Panel id="serials" title="الأكواد التسلسلية" description="كود فريد لكل قطعة (IMEI، رقم الضمان).">
          <SerialCodes productId={product.id} readOnly={readOnly} />
        </Panel>
      ) : null}
      {none ? (
        <p className="py-6 text-sm text-muted-foreground">
          فعّل «حزمة» أو «قابل للتخصيص» أو «مزاد» أو «أرقام تسلسلية» من عمود الأعلام في تبويب «المنتج» واحفظ، لتظهر أقسامها هنا.
        </p>
      ) : null}
    </div>
  );
}

function Panel({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <details id={id} open className="group scroll-mt-28 border-b border-border py-5 last:border-0" data-testid={`panel-${id}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-2 marker:content-none lg:min-h-0">
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-base font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">{description}</span>
        </span>
        <span aria-hidden className="text-xs text-muted-foreground group-open:hidden">
          عرض
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </details>
  );
}

function errText(e: unknown): string {
  if (!isApiError(e)) return "تعذّر الحفظ.";
  const fields = (e as ApiError).fields;
  return e.detail ?? (fields ? Object.values(fields).flat()[0] : undefined) ?? e.userMessage;
}

function Loading({ q, children }: { q: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }; children: ReactNode }) {
  if (q.isPending) return <Skeleton className="h-24 w-full" />;
  if (q.isError) return <ErrorState error={q.error as Error} onRetry={() => void q.refetch()} />;
  return <>{children}</>;
}

// ── M36 tier prices ──────────────────────────────────────────────────────────────────
function TierPrices({ productId, readOnly }: { productId: number; readOnly: boolean }) {
  const q = useExtra(productId, "tier-prices");
  const write = useExtraWrite(productId, "tier-prices");
  const [min, setMin] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<{ min?: string; price?: string }>({});
  const [previewQty, setPreviewQty] = useState("12");
  const rows = q.data ?? [];
  const qty = Number(previewQty);
  const applied = Number.isFinite(qty) && qty > 0 ? [...rows].reverse().find((r) => qty >= r.min_quantity) : undefined;

  async function add() {
    const n = Number(min);
    const e: typeof error = {};
    if (!Number.isInteger(n) || n < 1) e.min = "أدخل عدداً صحيحاً موجباً.";
    else if (duplicateTier(rows, n)) e.min = "يوجد سعر لهذه الكمية مسبقاً.";
    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) e.price = "أدخل سعراً صحيحاً.";
    setError(e);
    if (Object.keys(e).length) return;
    try {
      await write.mutateAsync({ method: "POST", json: { min_quantity: n, price } });
      setMin("");
      setPrice("");
    } catch (err) {
      const f = isApiError(err) ? err.fields : undefined;
      setError({ min: f?.min_quantity?.[0], price: f?.price?.[0] ?? (f ? undefined : errText(err)) });
    }
  }

  return (
    <Loading q={q}>
      <div className="flex flex-col gap-3" data-testid="tier-prices">
        {rows.length ? (
          <table className="w-full max-w-md text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-start font-normal">من كمية</th>
                <th className="py-2 text-start font-normal">سعر الوحدة</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} aria-current={applied?.id === r.id || undefined} className={cn(applied?.id === r.id && "font-medium")}>
                  <td className="py-2">
                    <Mono>{formatNumber(r.min_quantity)}+</Mono>
                  </td>
                  <td className="py-2">
                    <Money value={r.display_price} />
                  </td>
                  <td className="py-1 text-end">
                    {!readOnly ? (
                      <Button type="button" variant="ghost" size="icon" className="size-11 lg:size-8" aria-label={`حذف سعر ${r.min_quantity}+`} onClick={() => write.mutate({ method: "DELETE", sub: r.id })}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">لا أسعار كميات — يُباع بالسعر الأساسي لكل كمية.</p>
        )}
        {rows.length ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <label htmlFor="tier-preview">معاينة لكمية</label>
            <input id="tier-preview" dir="ltr" inputMode="numeric" value={previewQty} onChange={(e) => setPreviewQty(e.target.value)} className={cn(numericInputClass, "w-20")} />
            <span data-testid="tier-preview">{applied ? <>يُطبَّق سعر <Mono className="text-foreground">{applied.min_quantity}+</Mono></> : "يُطبَّق السعر الأساسي"}</span>
          </div>
        ) : null}
        {!readOnly ? (
          <div className="flex flex-wrap items-start gap-3">
            <Field label="من كمية" htmlFor="tier-min" error={error.min} className="w-32">
              <input id="tier-min" dir="ltr" inputMode="numeric" className={numericInputClass} value={min} onChange={(e) => setMin(e.target.value)} aria-invalid={Boolean(error.min)} />
            </Field>
            <Field label="سعر الوحدة" htmlFor="tier-price" error={error.price} className="w-40">
              <input id="tier-price" dir="ltr" inputMode="decimal" className={numericInputClass} value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={Boolean(error.price)} />
            </Field>
            <Button type="button" variant="outline" className="mt-6 h-11 gap-1.5 lg:h-8" onClick={() => void add()} disabled={write.isPending} data-testid="tier-add">
              <Plus className="size-4" aria-hidden /> أضف
            </Button>
          </div>
        ) : null}
      </div>
    </Loading>
  );
}

// ── Bundle components ────────────────────────────────────────────────────────────────
function BundleComponents({ product, readOnly }: { product: ProductDetail; readOnly: boolean }) {
  const q = useExtra(product.id, "bundle-components");
  const write = useExtraWrite(product.id, "bundle-components");
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const candidates = useProducts({ q: deferred, page_size: 8 }, { enabled: deferred.length >= 2 });
  const [qty, setQty] = useState("1");
  const [optional, setOptional] = useState(false);
  const [error, setError] = useState("");

  async function add(componentId: number) {
    setError("");
    if (componentId === product.id) return setError("لا يمكن إضافة الحزمة إلى نفسها.");
    if (!/^\d+(\.\d{1,3})?$/.test(qty) || Number(qty) <= 0) return setError("أدخل كمية أكبر من صفر (حتى 3 منازل عشرية).");
    try {
      await write.mutateAsync({ method: "POST", json: { component_id: componentId, quantity: qty, is_optional: optional } });
      setSearch("");
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <Loading q={q}>
      <div className="flex flex-col gap-3" data-testid="bundle-components">
        <h3 className="text-sm font-medium">المكوّنات</h3>
        {q.data?.results.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {q.data.results.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  {c.name} <Mono className="text-xs text-muted-foreground">{c.sku}</Mono>
                  {Number(c.stock) <= 0 && !c.is_optional ? <span className="ms-2 text-xs text-destructive">نفد — الحزمة غير متاحة</span> : null}
                </span>
                <Money value={c.display_price} className="text-muted-foreground" />
                <label className="sr-only" htmlFor={`bc-q-${c.id}`}>
                  الكمية
                </label>
                <input
                  id={`bc-q-${c.id}`}
                  dir="ltr"
                  inputMode="decimal"
                  defaultValue={Number(c.quantity).toString()}
                  readOnly={readOnly}
                  onBlur={(e) => e.target.value !== Number(c.quantity).toString() && write.mutate({ method: "PATCH", sub: c.id, json: { quantity: e.target.value } }, { onError: (err) => toast.error(errText(err)) })}
                  className={cn(numericInputClass, "w-20")}
                />
                <label className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground lg:min-h-8">
                  <input type="checkbox" className="size-4 accent-[var(--foreground)]" checked={c.is_optional} disabled={readOnly} onChange={(e) => write.mutate({ method: "PATCH", sub: c.id, json: { is_optional: e.target.checked } })} />
                  اختياري
                </label>
                {!readOnly ? (
                  <Button type="button" variant="ghost" size="icon" className="size-11 lg:size-8" aria-label={`حذف ${c.name}`} onClick={() => write.mutate({ method: "DELETE", sub: c.id })}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">لا مكوّنات بعد — أضف أول مكوّن.</p>
        )}
        {q.data ? (
          <p className="text-sm text-muted-foreground" data-testid="bundle-total">
            {q.data.display_build_fee ? (
              <>
                رسوم التجميع <Money value={q.data.display_build_fee} className="text-foreground" /> ·{" "}
              </>
            ) : null}
            سعر الحزمة (المكوّنات الأساسية) <Money value={q.data.display_bundle_total} className="text-foreground" />
          </p>
        ) : null}
        {!readOnly ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="ابحث عن منتج" htmlFor="bc-search" className="min-w-56 flex-1">
                <input id="bc-search" className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الاسم أو SKU" data-testid="bundle-search" />
              </Field>
              <Field label="الكمية" htmlFor="bc-qty" className="w-24">
                <input id="bc-qty" dir="ltr" inputMode="decimal" className={numericInputClass} value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
                <input type="checkbox" className="size-4 accent-[var(--foreground)]" checked={optional} onChange={(e) => setOptional(e.target.checked)} />
                اختياري
              </label>
            </div>
            {deferred.length >= 2 ? (
              <ul className="divide-y divide-border rounded-md border border-border">
                {(candidates.data?.results ?? [])
                  .filter((p) => !q.data?.results.some((c) => c.component_id === p.id))
                  .map((p) => (
                    <li key={p.id}>
                      <button type="button" className="flex min-h-11 w-full items-center gap-2 px-3 text-start text-sm hover:bg-muted lg:min-h-9" onClick={() => void add(p.id)} data-testid="bundle-candidate">
                        <span className="flex-1">{p.name}</span>
                        <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
                        {p.id === product.id ? <span className="text-xs text-muted-foreground">(هذه الحزمة)</span> : null}
                      </button>
                    </li>
                  ))}
              </ul>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert" data-testid="bundle-error">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Loading>
  );
}

// ── Compatibility rules ──────────────────────────────────────────────────────────────
function CompatibilityRules({ productId, readOnly }: { productId: number; readOnly: boolean }) {
  const q = useExtra(productId, "compatibility-rules");
  const write = useExtraWrite(productId, "compatibility-rules");
  const attrs = useVariantAttributes();
  const [a, setA] = useState("");
  const [op, setOp] = useState<(typeof COMPAT_OPERATORS)[number]>("equals");
  const [mode, setMode] = useState<"attribute" | "value">("attribute");
  const [b, setB] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const known = new Set((attrs.data ?? []).map((x) => x.id));

  async function add() {
    setError("");
    if (!a) return setError("اختر الخاصية.");
    const useValue = op === "in" || mode === "value";
    if (useValue && !value.trim()) return setError("أدخل القيمة أو القيم مفصولة بفاصلة.");
    if (!useValue && !b) return setError("اختر الخاصية الثانية.");
    try {
      await write.mutateAsync({ method: "POST", json: { attribute_a_id: Number(a), operator: op, attribute_b_id: useValue ? null : Number(b), value: useValue ? value : null } });
      setValue("");
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <Loading q={q}>
      <div className="flex flex-col gap-3 border-t border-border pt-4" data-testid="compat-rules">
        <h3 className="text-sm font-medium">قواعد التوافق</h3>
        {q.data?.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {q.data.map((r) => {
              const deleted = attrs.data && (!known.has(r.attribute_a_id) || (r.attribute_b_id !== null && !known.has(r.attribute_b_id)));
              return (
                <li key={r.id} className={cn("flex items-center gap-3 py-2 text-sm", deleted && "text-muted-foreground")}>
                  <span className="flex-1">
                    {r.attribute_a_name ?? "؟"} <span className="text-muted-foreground">{COMPAT_OPERATOR_LABELS[r.operator]}</span>{" "}
                    {r.attribute_b_id !== null ? (r.attribute_b_name ?? "؟") : <Mono>{r.value}</Mono>}
                    {deleted ? <span className="ms-2 text-xs">— خاصية محذوفة</span> : null}
                  </span>
                  {!readOnly ? (
                    <Button type="button" variant="ghost" size="icon" className="size-11 lg:size-8" aria-label="حذف القاعدة" onClick={() => write.mutate({ method: "DELETE", sub: r.id })}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">لا قواعد — كل تركيبات المكوّنات مسموحة.</p>
        )}
        {!readOnly ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="الخاصية" htmlFor="cr-a" className="w-40">
              <NativeSelect id="cr-a" className="h-11 lg:h-8" value={a} onChange={(e) => setA(e.target.value)}>
                <option value="">اختر</option>
                {(attrs.data ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="القاعدة" htmlFor="cr-op" className="w-36">
              <NativeSelect id="cr-op" className="h-11 lg:h-8" value={op} onChange={(e) => setOp(e.target.value as typeof op)}>
                {COMPAT_OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {COMPAT_OPERATOR_LABELS[o]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {op !== "in" ? (
              <Field label="مقارنة بـ" htmlFor="cr-mode" className="w-32">
                <NativeSelect id="cr-mode" className="h-11 lg:h-8" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  <option value="attribute">خاصية</option>
                  <option value="value">قيمة</option>
                </NativeSelect>
              </Field>
            ) : null}
            {op !== "in" && mode === "attribute" ? (
              <Field label="الخاصية الثانية" htmlFor="cr-b" className="w-40">
                <NativeSelect id="cr-b" className="h-11 lg:h-8" value={b} onChange={(e) => setB(e.target.value)}>
                  <option value="">اختر</option>
                  {(attrs.data ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <Field label={op === "in" ? "القيم (مفصولة بفاصلة)" : "القيمة"} htmlFor="cr-v" className="min-w-48 flex-1">
                <input id="cr-v" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
            )}
            <Button type="button" variant="outline" className="h-11 gap-1.5 lg:h-8" onClick={() => void add()} disabled={write.isPending} data-testid="rule-add">
              <Plus className="size-4" aria-hidden /> أضف قاعدة
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </Loading>
  );
}

// ── Personalization fields (dnd-kit) ─────────────────────────────────────────────────
function PersonalizationFields({ productId, readOnly }: { productId: number; readOnly: boolean }) {
  const q = useExtra(productId, "personalization-fields");
  const write = useExtraWrite(productId, "personalization-fields");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [draft, setDraft] = useState<{ label: string; field_type: PersonalizationType; price_add: string; is_required: boolean; options_csv: string }>({ label: "", field_type: "text", price_add: "", is_required: false, options_csv: "" });
  const [error, setError] = useState<Record<string, string>>({});
  const rows = q.data ?? [];

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rows.findIndex((r) => r.id === e.active.id);
    const to = rows.findIndex((r) => r.id === e.over!.id);
    const next = arrayMove(rows, from, to);
    try {
      await write.mutateAsync({ method: "POST", sub: "reorder", json: { ordered_ids: next.map((r) => r.id) } });
    } catch (err) {
      toast.error(errText(err));
    }
  }

  async function add() {
    const e: Record<string, string> = {};
    if (!draft.label.trim()) e.label = "أدخل عنوان الحقل.";
    if ((draft.field_type === "select" || draft.field_type === "multi_select") && !draft.options_csv.split(",").some((x) => x.trim())) e.options_csv = "أدخل خيارات القائمة مفصولة بفاصلة.";
    if (draft.price_add && !/^\d+(\.\d{1,2})?$/.test(draft.price_add)) e.price_add = "أدخل مبلغاً صحيحاً.";
    setError(e);
    if (Object.keys(e).length) return;
    try {
      await write.mutateAsync({ method: "POST", json: draft });
      setDraft({ label: "", field_type: "text", price_add: "", is_required: false, options_csv: "" });
    } catch (err) {
      const f = isApiError(err) ? err.fields : undefined;
      setError(f ? Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v[0] ?? ""])) : { label: errText(err) });
    }
  }

  const hasOptions = draft.field_type === "select" || draft.field_type === "multi_select";
  return (
    <Loading q={q}>
      <div className="flex flex-col gap-3" data-testid="personalization-fields">
        {rows.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border border-y border-border">
                {rows.map((r) => (
                  <FieldRow key={r.id} row={r} readOnly={readOnly} onDelete={() => write.mutate({ method: "DELETE", sub: r.id })} onToggleRequired={(v) => write.mutate({ method: "PATCH", sub: r.id, json: { is_required: v } })} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted-foreground">لا حقول تخصيص بعد.</p>
        )}
        {!readOnly ? (
          <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
            <div className="flex flex-wrap items-start gap-3">
              <Field label="عنوان الحقل" htmlFor="pf-label" error={error.label} className="min-w-48 flex-1">
                <input id="pf-label" className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} data-testid="pf-label" />
              </Field>
              <Field label="النوع" htmlFor="pf-type" className="w-40">
                <NativeSelect id="pf-type" className="h-11 lg:h-8" value={draft.field_type} onChange={(e) => setDraft({ ...draft, field_type: e.target.value as PersonalizationType })} data-testid="pf-type">
                  {PERSONALIZATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PERSONALIZATION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="سعر إضافي" htmlFor="pf-price" error={error.price_add} className="w-32">
                <input id="pf-price" dir="ltr" inputMode="decimal" className={numericInputClass} value={draft.price_add} onChange={(e) => setDraft({ ...draft, price_add: e.target.value })} />
              </Field>
              <label className="mt-6 flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
                <input type="checkbox" className="size-4 accent-[var(--foreground)]" checked={draft.is_required} onChange={(e) => setDraft({ ...draft, is_required: e.target.checked })} />
                إلزامي
              </label>
            </div>
            {hasOptions ? (
              <Field label="الخيارات (مفصولة بفاصلة)" htmlFor="pf-options" error={error.options_csv}>
                <Textarea id="pf-options" rows={2} value={draft.options_csv} onChange={(e) => setDraft({ ...draft, options_csv: e.target.value })} placeholder="ذهبي,فضي" data-testid="pf-options" />
              </Field>
            ) : null}
            <Button type="button" variant="outline" className="h-11 gap-1.5 self-start lg:h-8" onClick={() => void add()} disabled={write.isPending} data-testid="pf-add">
              <Plus className="size-4" aria-hidden /> أضف حقلاً
            </Button>
          </div>
        ) : null}
      </div>
    </Loading>
  );
}

function FieldRow({ row, readOnly, onDelete, onToggleRequired }: { row: PersonalizationFieldRow; readOnly: boolean; onDelete: () => void; onToggleRequired: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: readOnly });
  return (
    <li ref={setNodeRef} style={{ transform: translateToString(transform), transition }} className={cn("flex items-center gap-2 bg-background py-2 text-sm", isDragging && "relative z-10 opacity-80")} data-testid="pf-row">
      {!readOnly ? (
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`نقل «${row.label}»`} className="flex size-11 shrink-0 cursor-grab items-center justify-center text-muted-foreground lg:size-8">
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <span className="min-w-0 flex-1">
        {row.label}
        {row.is_required ? <span className="text-destructive"> *</span> : null}
        <span className="ms-2 text-xs text-muted-foreground">{PERSONALIZATION_TYPE_LABELS[row.field_type]}</span>
        {row.options_csv ? <span className="ms-2 text-xs text-muted-foreground">({row.options_csv.split(",").join("، ")})</span> : null}
      </span>
      {row.display_price_add ? (
        <span className="text-xs text-muted-foreground">
          + <Money value={row.display_price_add} />
        </span>
      ) : null}
      <label className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground lg:min-h-8">
        <input type="checkbox" className="size-4 accent-[var(--foreground)]" checked={row.is_required} disabled={readOnly} onChange={(e) => onToggleRequired(e.target.checked)} />
        إلزامي
      </label>
      {!readOnly ? (
        <Button type="button" variant="ghost" size="icon" className="size-11 lg:size-8" aria-label={`حذف «${row.label}»`} onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}
    </li>
  );
}

// ── Auction ──────────────────────────────────────────────────────────────────────────
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AuctionSettingsPanel({ productId, readOnly }: { productId: number; readOnly: boolean }) {
  const q = useExtra(productId, "auction");
  const bids = useExtra(productId, "auction/bids");
  const write = useExtraWrite(productId, "auction");
  return (
    <Loading q={q}>
      {q.data ? <AuctionForm key={JSON.stringify(q.data)} data={q.data} readOnly={readOnly} onSave={(json) => write.mutateAsync({ method: "PUT", json })} pending={write.isPending} /> : null}
      <div className="flex flex-col gap-2 border-t border-border pt-4" data-testid="auction-bids">
        <h3 className="text-sm font-medium">العطاءات</h3>
        {bids.data?.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-start font-normal">المزايد</th>
                <th className="py-2 text-start font-normal">الهاتف</th>
                <th className="py-2 text-start font-normal">المبلغ</th>
                <th className="hidden py-2 text-start font-normal sm:table-cell">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bids.data.map((b, i) => (
                <tr key={`${b.created_at}-${i}`}>
                  <td className="py-2">{b.bidder_name}</td>
                  <td className="py-2">{b.bidder_phone ? <Mono>{b.bidder_phone}</Mono> : "—"}</td>
                  <td className="py-2">
                    <Money value={b.display_amount} />
                  </td>
                  <td className="hidden py-2 sm:table-cell">
                    <Mono className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</Mono>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">لا عطاءات بعد.</p>
        )}
      </div>
    </Loading>
  );
}

function AuctionForm({ data, readOnly, onSave, pending }: { data: AuctionSettings; readOnly: boolean; onSave: (json: Record<string, unknown>) => Promise<unknown>; pending: boolean }) {
  const [v, setV] = useState({
    status: data.status,
    start_bid: data.start_bid,
    bid_step: data.bid_step,
    reserve: data.reserve ?? "",
    buy_now: data.buy_now ?? "",
    end_at: toLocalInput(data.end_at),
    anti_sniping_seconds: String(data.anti_sniping_seconds),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locked = readOnly || data.status === "ended";
  const put = (k: keyof typeof v, value: string) => setV((s) => ({ ...s, [k]: value }));

  async function submit() {
    setErrors({});
    try {
      await onSave({ ...v, end_at: v.end_at ? new Date(v.end_at).toISOString() : null, anti_sniping_seconds: Number(v.anti_sniping_seconds) });
      toast.success("حُفظت إعدادات المزاد");
    } catch (e) {
      const f = isApiError(e) ? e.fields : undefined;
      if (f) setErrors(Object.fromEntries(Object.entries(f).map(([k, m]) => [k, m[0] ?? ""])));
      else toast.error(errText(e));
    }
  }

  const input = (k: keyof typeof v, label: string, hint?: string) => (
    <Field label={label} htmlFor={`au-${k}`} error={errors[k]} hint={hint}>
      <input id={`au-${k}`} dir="ltr" inputMode="decimal" className={numericInputClass} value={v[k]} readOnly={locked} onChange={(e) => put(k, e.target.value)} data-testid={`au-${k}`} />
    </Field>
  );

  return (
    <div className="flex flex-col gap-4" data-testid="auction-form">
      <p className="text-sm">
        الحالة: <span className="font-medium" data-testid="auction-status">{AUCTION_STATUS_LABELS[data.status]}</span> · عدد العطاءات <Mono>{formatNumber(data.bids_count)}</Mono>
        {data.display_highest_bid ? (
          <>
            {" "}· أعلى عطاء <Money value={data.display_highest_bid} />
          </>
        ) : null}
        {data.status === "ended" && data.reserve_met === false ? <span className="ms-2 text-muted-foreground">— لم يُبلغ السعر الاحتياطي</span> : null}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="الحالة" htmlFor="au-status" error={errors.status}>
          <NativeSelect id="au-status" className="h-11 lg:h-8" value={v.status} disabled={readOnly} onChange={(e) => put("status", e.target.value)}>
            {AUCTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {AUCTION_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {input("start_bid", "سعر البداية")}
        {input("bid_step", "الزيادة الدنيا")}
        {input("reserve", "السعر الاحتياطي", "مخفي عن المشترين دائماً.")}
        {input("buy_now", "اشترِ الآن")}
        <Field label="ينتهي في" htmlFor="au-end_at" error={errors.end_at} hint="اتركه فارغاً: مفتوح حتى إشعار آخر.">
          <input id="au-end_at" type="datetime-local" dir="ltr" className={inputClass} value={v.end_at} readOnly={locked} onChange={(e) => put("end_at", e.target.value)} />
        </Field>
        <Field label="تمديد ضد القنص (ثانية)" htmlFor="au-anti" error={errors.anti_sniping_seconds}>
          <input id="au-anti" dir="ltr" inputMode="numeric" className={numericInputClass} value={v.anti_sniping_seconds} readOnly={locked} onChange={(e) => put("anti_sniping_seconds", e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">المخزون مثبّت على قطعة واحدة طوال المزاد.</p>
      {!readOnly ? (
        <Button type="button" className="h-11 self-start lg:h-9" onClick={() => void submit()} disabled={pending} data-testid="auction-save">
          حفظ إعدادات المزاد
        </Button>
      ) : null}
    </div>
  );
}

// ── Serial codes ─────────────────────────────────────────────────────────────────────
function SerialCodes({ productId, readOnly }: { productId: number; readOnly: boolean }) {
  const q = useExtra(productId, "serials");
  const write = useExtraWrite(productId, "serials");
  const [raw, setRaw] = useState("");
  const [serverDup, setServerDup] = useState<string[]>([]);
  const codes = useMemo(() => splitCodes(raw), [raw]);
  const existing = useMemo(() => (q.data?.results ?? []).map((r) => r.code), [q.data]);
  const dups = [...new Set([...duplicateSerials(codes, existing), ...serverDup])];
  const stock = Number(q.data?.stock ?? 0);
  const total = q.data ? q.data.counts.available + q.data.counts.reserved : 0;

  async function save() {
    if (dups.length || !codes.length) return;
    try {
      await write.mutateAsync({ method: "POST", json: { codes } });
      setRaw("");
      toast.success(`أُضيف ${formatNumber(codes.length)} كود`);
    } catch (e) {
      const body = isApiError(e) ? (e.body as { duplicates?: string[] } | undefined) : undefined;
      if (body?.duplicates) setServerDup(body.duplicates);
      else toast.error(errText(e));
    }
  }

  return (
    <Loading q={q}>
      <div className="flex flex-col gap-3" data-testid="serials">
        {q.data ? (
          <p className="text-sm" data-testid="serial-counts">
            متاح <Mono>{formatNumber(q.data.counts.available)}</Mono> · محجوز <Mono>{formatNumber(q.data.counts.reserved)}</Mono> · مُباع <Mono>{formatNumber(q.data.counts.sold)}</Mono>
            {total < stock ? (
              <span className="ms-2 text-warning">
                الأكواد أقل من المخزون بـ <Mono>{formatNumber(stock - total)}</Mono>
              </span>
            ) : null}
          </p>
        ) : null}
        {q.data?.results.length ? (
          <ul className="grid max-h-64 grid-cols-1 gap-x-6 overflow-y-auto border-y border-border py-2 text-sm sm:grid-cols-2">
            {q.data.results.map((r) => (
              <li key={r.code} className="flex items-center justify-between gap-2 py-1">
                <Mono>{r.code}</Mono>
                <span className="text-xs text-muted-foreground">{SERIAL_STATUS_LABELS[r.status]}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {!readOnly ? (
          <>
            <Field label="ألصق الأكواد (سطر أو فاصلة لكل كود)" htmlFor="sn-paste">
              <Textarea id="sn-paste" dir="ltr" rows={4} className="font-mono" value={raw} onChange={(e) => {
                setRaw(e.target.value);
                setServerDup([]);
              }} data-testid="serials-paste" />
            </Field>
            {dups.length ? (
              <p className="text-sm text-destructive" role="alert" data-testid="serials-dups">
                أكواد مكررة: {dups.map((d) => (
                  <Mono key={d} className="me-2">
                    {d}
                  </Mono>
                ))}
              </p>
            ) : null}
            <Button type="button" variant="outline" className="h-11 self-start lg:h-8" disabled={!codes.length || dups.length > 0 || write.isPending} onClick={() => void save()} data-testid="serials-save">
              أضف {codes.length ? <Mono className="ms-1">{formatNumber(codes.length)}</Mono> : null} كود
            </Button>
          </>
        ) : null}
      </div>
    </Loading>
  );
}
