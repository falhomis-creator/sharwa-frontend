import { registeredStore } from "@/mocks/public/register";

/**
 * A store with nothing in it yet — `shop` (the M03 empty-overview fixture) or any store
 * the mocked onboarding wizard just created (M02 → M03). Shared by every dashboard mock so
 * the overview, the catalogue, the orders and the notifications agree on «empty».
 */
export function isEmptyStore(store: string | null): boolean {
  return store === "shop" || Boolean(registeredStore(store));
}
