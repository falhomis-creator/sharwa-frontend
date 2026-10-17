import { validateSubdomain } from "@/lib/tenant";

/** Stores that "exist" in mock land (also used by the tenant probe mock in T049). */
export const MOCK_EXISTING_STORES = ["noor", "shop", "alqahwa", "sharwastore"] as const;

export interface CheckSubdomainResult {
  available: boolean;
  reason: string;
}

/** Mirrors `GET /register/check-subdomain/` reasons verbatim (discovery 01 §6). */
export function checkSubdomainMock(sub: string): CheckSubdomainResult {
  const local = validateSubdomain(sub);
  if (!local.ok) return { available: false, reason: local.reason };
  if ((MOCK_EXISTING_STORES as readonly string[]).includes(sub)) return { available: false, reason: "مستخدم بالفعل" };
  return { available: true, reason: "" };
}
