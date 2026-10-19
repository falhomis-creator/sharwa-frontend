import type { Metadata } from "next";
import { MatrixScreen } from "@/features/platform-admin/components/billing/matrix-screen";

export const metadata: Metadata = { title: "مصفوفة الميزات" };

/** `console.<base>/plans/matrix` — M46 US-46.1 a2/a3. */
export default function PlansMatrixPage() {
  return <MatrixScreen />;
}
