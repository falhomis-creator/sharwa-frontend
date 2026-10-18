import type { Metadata } from "next";
import { getProducts } from "@/features/storefront/api/catalog";
import { getStorefront } from "@/features/storefront/api/context";
import { orderedSections } from "@/features/storefront/schemas/config";
import { JsonLd } from "@/features/storefront/components/json-ld";
import { SectionRenderer } from "@/features/storefront-home/components/section-renderer";

/**
 * Store home (M09 US-09.1, T089): the merchant's sections in their order, server-rendered
 * from the cached `/config/` and catalogue reads (FR-09.01). An empty `sections[]` falls back
 * to «أحدث المنتجات» then the category strip — never a blank page (US-09.1.4).
 */
export async function generateMetadata(): Promise<Metadata> {
  const { config, storeOrigin } = await getStorefront();
  const title = config.seo_title || config.store_name;
  const description = config.seo_description || `تسوّق من ${config.store_name}.`;
  return {
    title,
    description,
    keywords: config.seo_keywords || undefined,
    alternates: { canonical: storeOrigin },
    openGraph: {
      title,
      description,
      siteName: config.store_name,
      type: "website",
      locale: "ar_SA",
      url: storeOrigin,
      images: config.seo_og_image ? [config.seo_og_image] : config.logo ? [config.logo] : undefined,
    },
  };
}

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function StorefrontHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await getStorefront(sp.currency);
  const sections = orderedSections(ctx.config);
  const hasHero = sections.some((s) => s.type === "hero");
  // A brand-new store (no sections, no products yet): a short notice, never a blank page.
  const configured = ctx.config.sections.some((s) => s.is_active);
  const empty = !configured && (await getProducts(ctx.store, ctx.storeHost, { page_size: "1" }, ctx.currency).then((r) => r.ok && r.page.count === 0));
  if (empty) {
    return (
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-3 px-6 py-24" data-testid="store-empty">
        <h1 className="text-3xl font-bold tracking-tight">{ctx.config.store_name}</h1>
        <p className="max-w-prose text-base leading-8 text-muted-foreground">
          يجهّز المتجر منتجاته الآن. عُد قريباً{ctx.config.whatsapp_number ? "، أو تواصل معنا عبر واتساب" : ""}.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="flex-1 pb-6" data-testid="store-home">
      {!hasHero ? <h1 className="sr-only">{ctx.config.store_name}</h1> : null}
      {sections.map((view, i) => (
        <SectionRenderer key={view.id} view={view} index={i} ctx={{ store: ctx.store, storeHost: ctx.storeHost, currency: ctx.currency, config: ctx.config }} />
      ))}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Store",
          name: ctx.config.store_name,
          url: ctx.storeOrigin,
          ...(ctx.config.logo ? { image: ctx.config.logo } : {}),
          ...(ctx.config.whatsapp_number ? { telephone: `+${ctx.config.whatsapp_number}` } : {}),
          ...(ctx.config.seo_description ? { description: ctx.config.seo_description } : {}),
        }}
      />
    </main>
  );
}
