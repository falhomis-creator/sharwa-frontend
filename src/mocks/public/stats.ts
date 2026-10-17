import type { PublicStats } from "@/features/landing/schemas/stats";

/** Stable values → stable screenshots (constitution IV). */
export function statsMock(): PublicStats {
  return { stores: 1200, orders_30d: 48500 };
}
