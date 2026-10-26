import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** `/dashboard/payments/local-wallets` → `/dashboard/payments/payout-accounts?tab=wallet` (the pre-M14 nav path). */
export default function Page() {
  redirect("/dashboard/payments/payout-accounts?tab=wallet");
}
