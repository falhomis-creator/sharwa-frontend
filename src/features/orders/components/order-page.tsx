"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrderDetailView } from "@/features/orders/components/order-detail";

export function OrderPage({ orderId }: { orderId: number }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard/orders" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> الطلبات
      </Link>
      <OrderDetailView orderId={orderId} variant="page" />
    </div>
  );
}
