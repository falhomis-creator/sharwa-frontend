import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * In-store 404 (a product that is not sold — draft, archived, scheduled — or a category that
 * does not exist: M10 FR-10.01, M10 §8). The store itself being unknown never lands here:
 * the layout redirects that case to `/_tenant/not-found`, which carries the real 404.
 */
export default function StorefrontNotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-20" data-testid="store-not-found">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">هذا المنتج غير متاح</h1>
      <p className="max-w-prose text-sm leading-7 text-muted-foreground">
        قد يكون المنتج نفد أو أُوقف بيعه، أو أن الرابط غير صحيح. جرّب البحث أو تصفّح الأقسام.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/products" className={cn(buttonVariants(), "h-11 px-5")}>
          تصفّح المنتجات
        </Link>
        <Link href="/search" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}>
          البحث
        </Link>
      </div>
    </main>
  );
}
