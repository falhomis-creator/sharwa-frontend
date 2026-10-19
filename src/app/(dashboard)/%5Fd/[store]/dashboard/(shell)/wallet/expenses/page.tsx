import type { Metadata } from "next";
import { ExpensesScreen } from "@/features/expenses/components/expenses-screen";

export const metadata: Metadata = { title: "المصروفات التشغيلية", robots: { index: false, follow: false } };

/** `/dashboard/wallet/expenses` — M33 US-33.1/33.2 (T167); the sidebar's «محفظة المتجر» group. */
export default function Page() {
  return <ExpensesScreen />;
}
