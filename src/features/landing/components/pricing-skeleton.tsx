import { Skeleton } from "@/components/ui/skeleton";

/** Two rows of hairline-bordered placeholder while the plan list resolves (T038). */
export function PricingSkeleton() {
  return (
    <div className="mt-12 rounded-xl border border-border/60 bg-elevated p-8 lg:mt-16 lg:p-12">
      <Skeleton className="h-10 w-40" />
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full max-w-56" />
        ))}
      </div>
    </div>
  );
}
