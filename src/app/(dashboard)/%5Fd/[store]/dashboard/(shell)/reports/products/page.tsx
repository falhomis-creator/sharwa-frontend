import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** `/dashboard/reports/products` (nav `products.report`, feature `product_report`) → the `best_sellers` report (M25). */
export default function ProductReportPage() {
  redirect("/dashboard/reports/best_sellers");
}
