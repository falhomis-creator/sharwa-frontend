import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** `/dashboard/payments/accounts` → `/dashboard/payments/payout-accounts` (the path named in M14 §6). */
export default function Page() {
  redirect("/dashboard/payments/payout-accounts");
}
