"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useServices } from "@/features/bookings/api";

/** M26 US-26.1 — `/dashboard/bookings/services`: the `is_bookable` products, duration, window count. */
export function ServicesScreen() {
  const q = useServices();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الخدمات القابلة للحجز" description="حدّد لكل خدمة ساعات توفرها بحسب يوم الأسبوع؛ تُولَّد المواعيد منها على الخادم." />
      {q.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          title="لا خدمات قابلة للحجز"
          description="فعّل «قابل للحجز» في منتج وحدّد مدة الموعد، ثم اضبط ساعات توفره هنا."
          action={
            <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              إلى المنتجات
            </Link>
          }
        />
      ) : (
        <table className="w-full text-sm" data-testid="services-table">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="py-2 text-start font-normal">الخدمة</th>
              <th className="py-2 text-start font-normal">مدة الموعد</th>
              <th className="hidden py-2 text-start font-normal sm:table-cell">نوافذ التوفر</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {q.data.map((s) => (
              <tr key={s.id}>
                <td className="py-3">
                  <Link href={`/dashboard/products/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="py-3">
                  {s.booking_duration_minutes ? (
                    <>
                      <Mono>{s.booking_duration_minutes}</Mono> دقيقة
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden py-3 sm:table-cell">{s.availability_count ? <Mono>{s.availability_count}</Mono> : <span className="text-muted-foreground">غير متاحة بعد</span>}</td>
                <td className="py-3 text-end">
                  <Link href={`/dashboard/bookings/services/${s.id}/availability`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 lg:h-8")} data-testid="availability-link">
                    ساعات التوفر
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
