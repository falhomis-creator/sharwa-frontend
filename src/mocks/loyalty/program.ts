import type { MockResult } from "@/lib/bff/mock-route";
import { isEmptyStore } from "@/mocks/empty-store";
import { storeState } from "@/mocks/store-state";

/**
 * `LoyaltyProgram` singleton (discovery 02 §5) — written from M13 (`/marketing/loyalty`),
 * read by M35 (wallet points tab) and the storefront checkout (M12 redeem). Defaults are
 * the model's: 10 riyals earn a point, 10 points redeem a riyal.
 */
export interface LoyaltyProgram {
  is_enabled: boolean;
  riyals_per_point: number;
  points_per_riyal_redemption: number;
  min_points_to_redeem: number;
}

export function loyaltyProgram(store: string | null): LoyaltyProgram {
  return storeState(store, "loyalty:program", () => ({
    is_enabled: !isEmptyStore(store),
    riyals_per_point: 10,
    points_per_riyal_redemption: 10,
    min_points_to_redeem: 100,
  }));
}

/** `PATCH /api/v1/marketing/loyalty/` — positive integers only when enabled (M13 §8). */
export function updateLoyaltyProgram(store: string | null, body: Record<string, unknown>): MockResult<LoyaltyProgram> {
  const p = loyaltyProgram(store);
  const next = { ...p };
  const errors: Record<string, string[]> = {};
  if ("is_enabled" in body) next.is_enabled = body.is_enabled === true || body.is_enabled === "true";
  for (const key of ["riyals_per_point", "points_per_riyal_redemption", "min_points_to_redeem"] as const) {
    if (key in body) {
      const n = Number(body[key]);
      if (!Number.isInteger(n) || n < 0) errors[key] = ["القيمة يجب أن تكون عدداً صحيحاً."];
      else next[key] = n;
    }
  }
  if (next.is_enabled) {
    for (const key of ["riyals_per_point", "points_per_riyal_redemption"] as const) {
      if (next[key] <= 0) errors[key] = ["القيمة يجب أن تكون أكبر من صفر."];
    }
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  Object.assign(p, next);
  return { ok: true, data: p };
}
