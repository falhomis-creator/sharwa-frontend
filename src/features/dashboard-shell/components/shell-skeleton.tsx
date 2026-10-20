import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shell skeleton (M03 §6): the sidebar, the six-number bar and the Bento, at their real
 * geometry so the layout does not jump when the data lands. Hairlines, not grey blobs.
 */
export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="hidden w-64 shrink-0 border-e border-sidebar-border bg-sidebar lg:block">
        <div className="h-12 border-b border-sidebar-border" />
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-sidebar-accent" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-12 border-b border-border bg-card" />
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-6">
          <OverviewSkeleton />
        </div>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-background p-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 lg:col-span-8" />
        <Skeleton className="h-72 lg:col-span-4" />
        <Skeleton className="h-60 lg:col-span-4" />
        <Skeleton className="h-60 lg:col-span-8" />
      </div>
    </div>
  );
}
