import type { Metadata } from "next";
import { NewReturnScreen } from "@/features/returns/components/new-return-screen";

export const metadata: Metadata = { title: "إرجاع جديد", robots: { index: false, follow: false } };

/** `/dashboard/returns/new?order=` — M24 (T124): create a return from an order's returnable items. */
export default function NewReturnPage() {
  return <NewReturnScreen />;
}
