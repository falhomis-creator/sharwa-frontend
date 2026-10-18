"use client";

import { Button } from "@/components/ui/button";

/**
 * A storefront read failed (Django unreachable, a payload outside the contract). Cached reads
 * THROW instead of caching an empty store, so this boundary is where a buyer lands — with a
 * retry, not a blank page (M09 §6 «خطأ شبكة بزر إعادة»).
 */
export default function StorefrontError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-20">
      <h1 className="text-2xl font-bold tracking-tight">تعذّر تحميل المتجر الآن</h1>
      <p className="text-sm text-muted-foreground">تحقق من اتصالك ثم أعد المحاولة.</p>
      <Button className="h-11 w-fit px-5" onClick={reset}>
        إعادة المحاولة
      </Button>
    </main>
  );
}
