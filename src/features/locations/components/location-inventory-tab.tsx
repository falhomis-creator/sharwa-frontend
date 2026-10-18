"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { SearchBox } from "@/components/shared/data-table";
import { inputClass, numericInputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import {
  useAdjustLocationStock,
  useLocationInventory,
  usePatchLocationRow,
} from "@/features/locations/api";
import type { LocationInventoryRow } from "@/features/locations/schemas";

/**
 * US-22.4 — the location's own stock: on-hand / reserved / quarantine / available (server
 * numbers only), an amber dot when available < reorder point, inline adjust (opens the row,
 * posts to the location's adjust endpoint with `location_id` forced), reorder point and
 * quarantine editable in place. `inventory.view` to read, `inventory.adjust` to write.
 */
export function LocationInventoryTab({
  locationId,
  active,
}: {
  locationId: number;
  active: boolean;
}) {
  const { canPermission } = useAccess();
  const canAdjust = canPermission("inventory.adjust");
  const [q, setQ] = useState("");
  const [below, setBelow] = useState(false);
  const query = useLocationInventory(
    locationId,
    {
      q: q || undefined,
      below_reorder: below ? "true" : undefined,
      page_size: 100,
    },
    active,
  );
  const [openUnit, setOpenUnit] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (query.error && !query.data)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const rows = query.data?.results ?? [];

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-testid="location-inventory"
    >
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="المنتج أو SKU"
          label="بحث في مخزون الموقع"
        />
        <Button
          type="button"
          variant={below ? "default" : "outline"}
          className="h-11 lg:h-8"
          aria-pressed={below}
          onClick={() => setBelow((b) => !b)}
          data-testid="filter-below-reorder"
        >
          تحت حد الطلب
        </Button>
        <span className="ms-auto text-xs text-muted-foreground">
          <Mono>{query.data?.count ?? 0}</Mono> صنف
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={q || below ? "لا أصناف تطابق" : "لا مخزون في هذا الموقع"}
          description={
            q || below
              ? undefined
              : "الكميات تُنشأ عند أول تعديل أو استلام إلى هذا الموقع."
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">مخزون الموقع</caption>
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    المنتج
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    SKU
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">
                    متاح
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">
                    في المخزن
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">
                    محجوز
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">
                    حجر
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">
                    حد الطلب
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">إجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const unit = r.variant_id
                    ? `v${r.variant_id}-${r.product_id}`
                    : `p${r.product_id}`;
                  const open = openUnit === unit;
                  return (
                    <InventoryRow
                      key={unit}
                      row={r}
                      unit={unit}
                      locationId={locationId}
                      open={open}
                      canAdjust={canAdjust}
                      onToggle={() => setOpenUnit(open ? null : unit)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Phones: one card per row; the editor opens under the card (no horizontal table). */}
          <ul
            className="flex flex-col divide-y divide-border rounded-lg border border-border md:hidden"
            data-testid="inventory-cards"
          >
            {rows.map((r) => {
              const unit = r.variant_id
                ? `v${r.variant_id}-${r.product_id}`
                : `p${r.product_id}`;
              const open = openUnit === unit;
              return (
                <li key={unit} className="flex flex-col gap-2 p-3">
                  <div className="flex items-start gap-2">
                    {r.below_reorder ? (
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-warning"
                      />
                    ) : null}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {r.variant_label ? `${r.variant_label} · ` : ""}
                        <Mono>{r.sku}</Mono>
                      </span>
                      {r.below_reorder ? (
                        <span className="sr-only">تحت حد الطلب</span>
                      ) : null}
                    </span>
                    {canAdjust ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 px-2"
                        aria-expanded={open}
                        onClick={() => setOpenUnit(open ? null : unit)}
                      >
                        {open ? "إغلاق" : "تعديل"}
                      </Button>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-4 gap-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground">متاح</dt>
                      <dd>
                        <Mono className="font-medium">{r.available}</Mono>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">المخزن</dt>
                      <dd>
                        <Mono>{r.on_hand}</Mono>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">محجوز</dt>
                      <dd>
                        <Mono>{r.reserved}</Mono>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">حد الطلب</dt>
                      <dd>
                        <Mono>{r.reorder_point}</Mono>
                      </dd>
                    </div>
                  </dl>
                  {open ? (
                    <RowEditor
                      row={r}
                      unit={unit}
                      locationId={locationId}
                      onDone={() => setOpenUnit(null)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function InventoryRow({
  row,
  unit,
  locationId,
  open,
  canAdjust,
  onToggle,
}: {
  row: LocationInventoryRow;
  unit: string;
  locationId: number;
  open: boolean;
  canAdjust: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn("hover:bg-muted/30", row.below_reorder && "bg-warning/5")}
        data-testid="inventory-row"
        data-below={row.below_reorder ? "true" : undefined}
      >
        <td className="px-3 py-2">
          <span className="flex items-center gap-2">
            {row.below_reorder ? (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-warning"
                data-testid="below-reorder-dot"
              />
            ) : null}
            <span className="flex flex-col">
              <span className="font-medium">{row.name}</span>
              {row.variant_label ? (
                <span className="text-xs text-muted-foreground">
                  {row.variant_label}
                </span>
              ) : null}
            </span>
            {row.below_reorder ? (
              <span className="sr-only">تحت حد الطلب</span>
            ) : null}
          </span>
        </td>
        <td className="px-3 py-2">
          <Mono className="text-xs">{row.sku}</Mono>
        </td>
        <td className="px-3 py-2 text-end">
          <Mono className="font-medium">{row.available}</Mono>
        </td>
        <td className="px-3 py-2 text-end">
          <Mono>{row.on_hand}</Mono>
        </td>
        <td className="px-3 py-2 text-end">
          <Mono className="text-muted-foreground">{row.reserved}</Mono>
        </td>
        <td className="px-3 py-2 text-end">
          <Mono className="text-muted-foreground">{row.quarantine}</Mono>
        </td>
        <td className="px-3 py-2 text-end">
          <Mono className="text-muted-foreground">{row.reorder_point}</Mono>
        </td>
        <td className="px-3 py-2 text-end">
          {canAdjust ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 px-2 lg:h-8"
              aria-expanded={open}
              onClick={onToggle}
              data-testid="row-adjust"
            >
              {open ? "إغلاق" : "تعديل"}
            </Button>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="bg-muted/20">
          <td colSpan={8} className="px-3 py-3">
            <RowEditor
              row={row}
              unit={unit}
              locationId={locationId}
              onDone={onToggle}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function RowEditor({
  row,
  unit,
  locationId,
  onDone,
}: {
  row: LocationInventoryRow;
  unit: string;
  locationId: number;
  onDone: () => void;
}) {
  const id = useId();
  const adjust = useAdjustLocationStock(locationId);
  const patch = usePatchLocationRow(locationId);
  const [mode, setMode] = useState<"delta" | "new">("delta");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<"manual_adjust" | "restock">(
    "manual_adjust",
  );
  const [note, setNote] = useState("");
  const [reorder, setReorder] = useState(row.reorder_point);
  const [quarantine, setQuarantine] = useState(row.quarantine);
  const [err, setErr] = useState<string | null>(null);

  const submitAdjust = () => {
    setErr(null);
    adjust.mutate(
      {
        product_id: row.product_id,
        variant_id: row.variant_id,
        reason,
        note: note || undefined,
        ...(mode === "delta" ? { delta: amount } : { new_quantity: amount }),
      },
      {
        onSuccess: (d) => {
          toast.success("عُدِّل المخزون", {
            description: `المتاح الآن ${d.quantity_available ?? d.stock}`,
          });
          onDone();
        },
        onError: (e) => setErr(isApiError(e) ? e.userMessage : "تعذّر التعديل"),
      },
    );
  };
  const submitThresholds = () => {
    setErr(null);
    patch.mutate(
      {
        unit,
        body: { reorder_point: reorder, quarantine_quantity: quarantine },
      },
      {
        onSuccess: () => {
          toast.success("حُفظت الحدود");
          onDone();
        },
        onError: (e) => setErr(isApiError(e) ? e.userMessage : "تعذّر الحفظ"),
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="row-editor">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">تعديل الكمية</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="نوع التعديل">
          <Button
            type="button"
            variant={mode === "delta" ? "default" : "outline"}
            className="h-11 lg:h-8"
            aria-pressed={mode === "delta"}
            onClick={() => setMode("delta")}
          >
            فرق ±
          </Button>
          <Button
            type="button"
            variant={mode === "new" ? "default" : "outline"}
            className="h-11 lg:h-8"
            aria-pressed={mode === "new"}
            onClick={() => setMode("new")}
          >
            كمية جديدة
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            {mode === "delta" ? "الفرق" : "الكمية"}
            <input
              id={`${id}-amt`}
              dir="ltr"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={numericInputClass}
              data-testid="adjust-amount"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            السبب
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className={cn(inputClass, "h-11 md:h-8")}
            >
              <option value="manual_adjust">تعديل يدوي</option>
              <option value="restock">إعادة تعبئة</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs">
          ملاحظة{" "}
          <span className="text-muted-foreground">(مطلوبة عند التخفيض)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            data-testid="adjust-note"
          />
        </label>
        <div>
          <Button
            type="button"
            className="h-11 lg:h-8"
            disabled={adjust.isPending || !amount}
            onClick={submitAdjust}
            data-testid="adjust-submit"
          >
            تطبيق
          </Button>
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">الحدود</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            حد الطلب
            <input
              dir="ltr"
              inputMode="decimal"
              value={reorder}
              onChange={(e) => setReorder(e.target.value)}
              className={numericInputClass}
              data-testid="reorder-point"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            كمية الحجر
            <input
              dir="ltr"
              inputMode="decimal"
              value={quarantine}
              onChange={(e) => setQuarantine(e.target.value)}
              className={numericInputClass}
              data-testid="quarantine"
            />
          </label>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11 lg:h-8"
            disabled={patch.isPending}
            onClick={submitThresholds}
            data-testid="thresholds-submit"
          >
            حفظ الحدود
          </Button>
        </div>
      </fieldset>
      {err ? (
        <p role="alert" className="text-sm text-destructive lg:col-span-2">
          {err}
        </p>
      ) : null}
    </div>
  );
}
