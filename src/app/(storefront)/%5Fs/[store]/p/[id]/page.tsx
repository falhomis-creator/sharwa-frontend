import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/features/storefront/api/catalog";
import { getStorefront } from "@/features/storefront/api/context";
import { cardImage, type ProductDetail } from "@/features/storefront/schemas/catalog";
import { JsonLd } from "@/features/storefront/components/json-ld";
import { Breadcrumb } from "@/features/storefront/components/breadcrumb";
import { BuyBox } from "@/features/pdp/components/buy-box";
import { Gallery } from "@/features/pdp/components/gallery";
import { BelowTheFold } from "@/features/pdp/components/below-the-fold";

/**
 * Product page (M10, T090): server-rendered from `GET /api/v1/catalog/products/<id>/?currency=`
 * (FR-10.01). A product that is not sold (404 — draft, archived, scheduled) renders the
 * in-store «غير متاح» page, never a cached copy (M10 §8). Two templates: `standard`
 * (gallery 7/12 + sticky buy box 5/12) and `landing_page` (one column, no related rows).
 */
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(id: string, currency?: string | string[]) {
  const ctx = await getStorefront(currency);
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return { ctx, product: null };
  return { ctx, product: await getProduct(ctx.store, ctx.storeHost, n, ctx.currency) };
}

function gallery(product: ProductDetail) {
  const images = (product.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? product.name }));
  if (images.length) return images;
  const single = cardImage(product);
  return single ? [{ url: single, alt: product.name }] : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { product, ctx } = await load(id);
  if (!product) return { title: "هذا المنتج غير متاح", robots: { index: false } };
  const description = product.meta_description || product.description?.slice(0, 160) || `${product.name} من ${ctx.config.store_name}`;
  const image = gallery(product)[0]?.url;
  return {
    title: product.meta_title || product.name,
    description,
    alternates: { canonical: `${ctx.storeOrigin}/p/${product.id}` },
    openGraph: { title: product.name, description, type: "website", url: `${ctx.storeOrigin}/p/${product.id}`, images: image ? [image] : undefined },
  };
}

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { ctx, product } = await load(id, sp.currency);
  if (!product) notFound();
  const images = gallery(product);
  const landing = product.product_template === "landing_page";
  const crumbs = [
    { label: "الرئيسية", href: "/" },
    ...(product.category_path ?? []).map((c) => ({ label: c.name, href: `/c/${c.id}` })),
    { label: product.name },
  ];
  const url = `${ctx.storeOrigin}/p/${product.id}`;
  const ld: Array<Record<string, unknown>> = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description || undefined,
      image: images.map((i) => i.url).filter((u) => /^https?:/.test(u)),
      sku: product.structured?.sku ?? undefined,
      ...(product.structured?.brand ? { brand: { "@type": "Brand", name: product.structured.brand } } : {}),
      // Raw values from `structured{}` — for structured data ONLY (M10 §10).
      ...(product.structured
        ? {
            offers: {
              "@type": "Offer",
              url,
              price: product.structured.price,
              priceCurrency: product.structured.currency,
              availability: `https://schema.org/${product.structured.availability}`,
            },
          }
        : {}),
      ...(product.reviews_summary && product.reviews_summary.count > 0
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.reviews_summary.average_rating, reviewCount: product.reviews_summary.count } }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${ctx.storeOrigin}${c.href}` } : {}) })),
    },
  ];

  const description = product.description ? (
    <section aria-labelledby="desc-title" className="space-y-3">
      <h2 id="desc-title" className="text-xl font-bold md:text-2xl">
        الوصف
      </h2>
      <p className="max-w-prose whitespace-pre-line text-base leading-8 text-muted-foreground">{product.description}</p>
    </section>
  ) : null;

  return (
    <main id="main" className="flex-1 pb-28 md:pb-10" data-testid="pdp" data-template={product.product_template ?? "standard"}>
      <div className={landing ? "mx-auto w-full max-w-3xl px-4 pt-4 md:px-6 md:pt-8" : "mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 md:pt-8"}>
        <Breadcrumb items={crumbs} />
        {landing ? (
          <div className="space-y-8">
            <Gallery images={images} name={product.name} videoUrl={product.video_url} variants={product.variants} attributes={product.attributes} />
            {description}
            <div className="store-frame rounded-xl border-border p-5 md:p-6 shadow-card bg-card">
              <BuyBox key={product.id} product={product} compactTitle />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
              <div className="md:col-span-7">
                <Gallery images={images} name={product.name} videoUrl={product.video_url} variants={product.variants} attributes={product.attributes} />
              </div>
              <div className="md:col-span-5">
                <div className="md:sticky md:top-24">
                  <BuyBox key={product.id} product={product} />
                </div>
              </div>
            </div>
            <div className="mt-10 space-y-10">
              {description}
              <BelowTheFold productId={product.id} summary={product.reviews_summary} related={product.related} />
            </div>
          </>
        )}
      </div>
      <JsonLd data={ld} />
    </main>
  );
}
