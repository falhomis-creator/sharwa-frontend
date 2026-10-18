"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ProductDetail } from "@/features/storefront/schemas/catalog";

/**
 * The PDP's lower half, split out of the first-paint bundle (T095, Lighthouse mobile ≥ 90).
 * Nothing here is even REQUESTED until the reader scrolls within ~240px of it: reviews are
 * fetched on the client anyway (`useInfiniteQuery`); the related rows render once in view
 * too (their links are not in the HTML — the Product JSON-LD and the breadcrumb are what
 * crawlers need from this page).
 */
const Reviews = dynamic(() => import("@/features/pdp/components/reviews").then((m) => m.Reviews), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />,
});
const RelatedRows = dynamic(() => import("@/features/pdp/components/related-rows").then((m) => m.RelatedRows));

function useNearViewport<T extends Element>(margin = "240px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setNear(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, near]);
  return { ref, near };
}

export function BelowTheFold({
  productId,
  summary,
  related,
}: {
  productId: number;
  summary: ProductDetail["reviews_summary"];
  related: ProductDetail["related"];
}) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="space-y-10">
      {near ? (
        <>
          <Reviews productId={productId} summary={summary} />
          <RelatedRows related={related} />
        </>
      ) : (
        // Reserve roughly the final height so the page does not jump when the rows arrive.
        <div className="min-h-[32rem]" aria-hidden />
      )}
    </div>
  );
}
