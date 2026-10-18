"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { formatNumber } from "@/lib/format";
import { PAGE_SIZES } from "@/components/shared/data-table/use-table-url-state";

/** «1–50 من 1,000» + previous/next (server pagination, FR-04.01 / FR-06.01). */
export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-1 pt-3 text-sm text-muted-foreground">
      <p aria-live="polite">
        <Mono>
          {formatNumber(from)}–{formatNumber(to)}
        </Mono>{" "}
        من <Mono>{formatNumber(total)}</Mono>
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2">
            <span className="sr-only whitespace-nowrap md:not-sr-only">لكل صفحة</span>
            <NativeSelect
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-11 w-20 lg:h-8"
              aria-label="عدد الصفوف لكل صفحة"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="الصفحة السابقة"
          className="flex size-11 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 lg:size-8"
        >
          <ChevronRight className="size-4 rtl:rotate-0 ltr:rotate-180" strokeWidth={1.75} aria-hidden />
        </button>
        <Mono className="min-w-12 text-center text-foreground">
          {page}/{pages}
        </Mono>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="الصفحة التالية"
          className="flex size-11 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 lg:size-8"
        >
          <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
