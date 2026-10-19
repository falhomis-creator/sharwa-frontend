import type { Metadata } from "next";
import { DuesDetailScreen } from "@/features/platform-admin/components/money/dues-detail-screen";

export const metadata: Metadata = { title: "مستحقات متجر" };

/** Blocks on `params` like the console layout it renders in. */
export const instant = false;

/** `console.<base>/dues/<schema>` — M45 US-45.2/45.3. The schema is a path segment, never a query string (FR-20.01). */
export default async function DuesDetailPage({ params }: { params: Promise<{ schema: string }> }) {
  const { schema } = await params;
  return <DuesDetailScreen schema={decodeURIComponent(schema)} />;
}
