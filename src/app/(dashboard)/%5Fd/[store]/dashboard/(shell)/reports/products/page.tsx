import { redirect } from "next/navigation";

/** `/dashboard/reports/products` (nav `products.report`, feature `product_report`) → the `best_sellers` report (M25). */
export default function ProductReportPage() {
  redirect("/dashboard/reports/best_sellers");
}
