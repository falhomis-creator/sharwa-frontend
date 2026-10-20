"use client";

import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { TablePagination } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useProductChanges } from "@/features/products/api/products";

/** «السجل» tab (US-04.8): field, before → after in Mono, who, when. */
export function ChangeLog({ productId }: { productId: number }) {
  const [page, setPage] = useState(1);
  const q = useProductChanges(productId, page);
  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const rows = q.data?.results ?? [];
  if (rows.length === 0) return <EmptyState title="لا تغييرات مسجّلة بعد" description="يُسجَّل هنا كل تعديل على السعر والمخزون والاسم والحالة." />;
  return (
    <div className="flex flex-col gap-3" data-testid="change-log">
      <div className="overflow-x-auto surface-card">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">سجل تغييرات المنتج</caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="h-9 px-3 text-start font-normal">الحقل</th>
              <th scope="col" className="h-9 px-3 text-start font-normal">قبل</th>
              <th scope="col" className="h-9 px-3 text-start font-normal">بعد</th>
              <th scope="col" className="h-9 px-3 text-start font-normal">بواسطة</th>
              <th scope="col" className="h-9 px-3 text-start font-normal">متى</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="h-11 px-3">{r.field_label}</td>
                <td className="h-11 px-3 text-muted-foreground">
                  <Mono>{r.before ?? "—"}</Mono>
                </td>
                <td className="h-11 px-3">
                  <Mono>{r.after ?? "—"}</Mono>
                </td>
                <td className="h-11 px-3">{r.actor}</td>
                <td className="h-11 px-3 text-xs text-muted-foreground" title={formatDateTime(r.at)}>
                  {formatRelative(r.at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} pageSize={20} total={q.data?.count ?? 0} onPageChange={setPage} />
    </div>
  );
}
