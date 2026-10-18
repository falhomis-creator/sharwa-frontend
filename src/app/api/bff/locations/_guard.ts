import "server-only";
import type { Session } from "@/features/dashboard-shell/schemas";
import { mockJson } from "@/mocks/runtime";

/** M22 §2: defining locations, routing and the mode is the owner's (no `locations.*` key among the 35). */
export function ownerOnly(session: Session): Promise<Response> | null {
  if (session.kind === "merchant") return null;
  return mockJson({ detail: "إدارة المواقع مقصورة على مالك المتجر." }, { status: 403 });
}
