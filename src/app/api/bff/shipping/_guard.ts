import "server-only";
import type { Session } from "@/features/dashboard-shell/schemas";
import { mockJson } from "@/mocks/runtime";
import { CARRIER_CODES, type CarrierCode } from "@/mocks/shipping/state";

/** M15 §2: shipping settings are the owner's; staff only reach the edge-case actions. */
export function ownerOnly(session: Session): Promise<Response> | null {
  if (session.kind === "merchant") return null;
  return mockJson({ detail: "إعدادات الشحن مقصورة على مالك المتجر." }, { status: 403 });
}

export function carrierCode(code: string): CarrierCode | null {
  return (CARRIER_CODES as readonly string[]).includes(code) ? (code as CarrierCode) : null;
}

export function unknownCarrier(): Promise<Response> {
  return mockJson({ detail: "ناقل غير معروف." }, { status: 404 });
}
