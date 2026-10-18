import "server-only";
import type { Session } from "@/features/dashboard-shell/schemas";
import { mockJson } from "@/mocks/runtime";

/** FR-25.11: the whole module needs the `reports` plan feature (the permission gate is `mockRoute`'s). */
export function reportsFeatureOff(session: Session): Promise<Response> | null {
  if (session.features.includes("reports")) return null;
  return mockJson({ detail: "ميزة التقارير غير مفعّلة في خطتك." }, { status: 403 });
}
