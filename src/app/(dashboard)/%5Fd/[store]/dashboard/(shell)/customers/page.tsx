import type { Metadata } from "next";
import { CustomersScreen } from "@/features/customers/components/customers-screen";

export const metadata: Metadata = { title: "العملاء", robots: { index: false, follow: false } };

/** `/dashboard/customers` — M07 US-07.1 (T097). Data is client-fetched through the BFF. */
export default function CustomersPage() {
  return <CustomersScreen />;
}
