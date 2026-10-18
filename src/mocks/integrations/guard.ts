import type { Session } from "@/features/dashboard-shell/schemas";
import { mockJson } from "@/mocks/runtime";

/** Domains, tracking tools and webhooks are the store owner's alone (FR-19.09). */
export function ownerOnly(session: Session, what: string): Promise<Response> | null {
  return session.kind === "merchant" ? null : mockJson({ detail: `${what} مقصورة على مالك المتجر.` }, { status: 403 });
}

export function idFrom(raw: string): number {
  return /^\d+$/.test(raw) ? Number(raw) : -1;
}
