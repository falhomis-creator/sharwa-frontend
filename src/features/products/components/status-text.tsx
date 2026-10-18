import type { ProductStatus } from "@/features/products/schemas";
import { PRODUCT_STATUS_LABELS } from "@/features/products/schemas";
import { cn } from "@/lib/utils";

/** Status as text with a 6px dot — no filled badges (M04 §11 I). */
const DOT: Record<ProductStatus, string> = {
  published: "bg-success",
  draft: "bg-muted-foreground",
  scheduled: "bg-info",
  archived: "bg-border",
};

export function ProductStatusText({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[status])} />
      {PRODUCT_STATUS_LABELS[status]}
    </span>
  );
}
