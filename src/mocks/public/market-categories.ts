import type { MarketCategory } from "@/features/onboarding/schemas";
import { platformState } from "@/mocks/platform/state";

/**
 * `GET /api/v1/public/market-categories/` fixture (M02 §7 — `[NEEDS BACKEND]`).
 * Active `MarketCategory` rows ordered by `display_order` — read from the console's state
 * (M20 US-20.6 a3), so a category the platform owner disables or reorders shows in the
 * wizard at once.
 */
export function marketCategoriesMock(): MarketCategory[] {
  return platformState()
    .categories.filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map(({ id, name }) => ({ id, name }));
}
