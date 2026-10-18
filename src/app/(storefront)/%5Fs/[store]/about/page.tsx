import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RichText } from "@/components/ui/rich-text";
import { StoreReviewBlock } from "@/features/engagement/components/store-review-block";
import { getStorefront } from "@/features/storefront/api/context";

/**
 * `/about` — `about_us` and the return policy, when Django exports them (M09 §6, §7
 * `[NEEDS BACKEND]`), then the store reviews block (M42 US-42.6).
 */
export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getStorefront();
  return { title: "من نحن", description: config.about_us ?? undefined };
}

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function AboutPage() {
  const { config } = await getStorefront();
  if (!config.about_us && !config.return_policy) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-10 md:px-6 md:py-14">
      {config.about_us ? (
        <section className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">من نحن</h1>
          <p className="text-base leading-8 text-muted-foreground">{config.about_us}</p>
        </section>
      ) : null}
      {config.return_policy ? (
        <section id="returns" className="store-frame space-y-3 rounded-lg border-border p-5 md:p-8">
          <h2 className="text-xl font-bold">سياسة الاسترجاع</h2>
          <RichText source={config.return_policy} className="text-sm leading-7" />
        </section>
      ) : null}
      <StoreReviewBlock />
    </main>
  );
}
