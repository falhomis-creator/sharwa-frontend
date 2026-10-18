import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** US-41.5 — the same answer for an unknown UUID and another store's: nothing leaks. */
export default function TrackingNotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-20" data-testid="tracking-not-found">
      <h1 className="text-2xl font-bold tracking-tight">لم نجد هذا الطلب</h1>
      <p className="text-sm text-muted-foreground">تأكد من الرابط الذي وصلك عبر واتساب.</p>
      <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-fit px-5")}>
        العودة إلى المتجر
      </Link>
    </main>
  );
}
