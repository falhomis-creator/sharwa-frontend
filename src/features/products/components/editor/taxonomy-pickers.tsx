"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { includesNormalized } from "@/lib/i18n/normalize";
import { cn } from "@/lib/utils";
import { categoryPath } from "@/features/organization/schemas";
import { orgApi, useBadges, useBrands, useCategories, useCollections, useInvalidateOrganization, useTags } from "@/features/organization/api";
import { CategoryEditorSheet } from "@/features/organization/components/category-editor-sheet";

/**
 * Organization pickers inside the product editor (M05 FR-05.04/05.06/05.12): categories by
 * their full path «إلكترونيات ⟵ هواتف», tags created by typing + Enter from right here,
 * badges as a dot + text, collections as checkboxes — all from the same M05 cache.
 */
export function CategoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const query = useCategories();
  const categories = useMemo(() => query.data ?? [], [query.data]);
  const [creating, setCreating] = useState(false);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const options = categories
    .map((c) => ({ id: c.id, label: categoryPath(c.id, byId) }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <NativeSelect
          id="pe-category"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 md:h-8"
          data-testid="product-category"
        >
          <option value="">بلا تصنيف</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        {!disabled ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="تصنيف جديد"
            title="تصنيف جديد"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted md:size-8"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <CategoryEditorSheet
        open={creating}
        onOpenChange={setCreating}
        category={null}
        onSaved={(c) => onChange(String(c.id))}
      />
    </div>
  );
}

export function BrandPicker({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const brands = useBrands().data ?? [];
  return (
    <NativeSelect id="pe-brand" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-11 md:h-8">
      <option value="">بلا ماركة</option>
      {brands.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function TagPicker({ value, onChange, disabled }: { value: number[]; onChange: (v: number[]) => void; disabled?: boolean }) {
  const tags = useTags().data ?? [];
  const invalidate = useInvalidateOrganization();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = tags.filter((t) => value.includes(t.id));
  const suggestions = draft ? tags.filter((t) => !value.includes(t.id) && includesNormalized(t.name, draft)).slice(0, 6) : [];

  async function commit() {
    const name = draft.trim();
    if (!name) return;
    const existing = tags.find((t) => t.name === name);
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id]);
      setDraft("");
      return;
    }
    setBusy(true);
    try {
      const tag = await orgApi.saveTag(null, { name });
      onChange([...value, tag.id]);
      setDraft("");
      await invalidate();
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر إنشاء الوسم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-1 rounded-md border border-border ps-2 text-sm">
              {t.name}
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== t.id))}
                  aria-label={`إزالة الوسم ${t.name}`}
                  className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground lg:size-6"
                >
                  <X className="size-3" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!disabled ? (
        <div className="relative">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              }
            }}
            disabled={busy}
            placeholder="اكتب وسماً ثم Enter"
            aria-label="إضافة وسم"
            className="h-11 w-full rounded-lg border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm"
            data-testid="tag-input"
          />
          {suggestions.length ? (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover p-1">
              {suggestions.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...value, t.id]);
                      setDraft("");
                    }}
                    className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-sm hover:bg-muted lg:min-h-8"
                  >
                    {t.name}
                    <Mono className="text-[11px] text-muted-foreground">{t.products_count}</Mono>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CheckList({
  items,
  value,
  onChange,
  disabled,
  empty,
  renderLabel,
}: {
  items: Array<{ id: number; name: string; color?: string }>;
  value: number[];
  onChange: (v: number[]) => void;
  disabled?: boolean;
  empty: string;
  renderLabel?: (item: { id: number; name: string; color?: string }) => ReactNode;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col">
      {items.map((it) => (
        <li key={it.id}>
          <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 text-sm lg:min-h-8", disabled && "cursor-default opacity-70")}>
            <Checkbox
              checked={value.includes(it.id)}
              disabled={disabled}
              onCheckedChange={(on) => onChange(on ? [...value, it.id] : value.filter((x) => x !== it.id))}
            />
            {renderLabel ? renderLabel(it) : it.name}
          </label>
        </li>
      ))}
    </ul>
  );
}

export function BadgesPicker(props: { value: number[]; onChange: (v: number[]) => void; disabled?: boolean }) {
  const badges = useBadges().data ?? [];
  return (
    <CheckList
      {...props}
      items={badges}
      empty="لا شارات بعد."
      renderLabel={(b) => (
        <span className="inline-flex items-center gap-1.5">
          {/* Badge colour is merchant data (ProductBadge.color), shown as an 8px dot only. */}
          <span aria-hidden className="size-2 rounded-full border border-border" style={{ backgroundColor: b.color }} />
          {b.name}
        </span>
      )}
    />
  );
}

export function CollectionsPicker(props: { value: number[]; onChange: (v: number[]) => void; disabled?: boolean }) {
  const collections = useCollections().data ?? [];
  return <CheckList {...props} items={collections} empty="لا مجموعات بعد." />;
}
