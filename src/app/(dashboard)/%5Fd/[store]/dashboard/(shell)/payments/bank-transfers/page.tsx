import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** `/dashboard/payments/bank-transfers` → `/dashboard/payments/payout-accounts?tab=bank` (the pre-M14 nav path). */
export default function Page() {
  redirect("/dashboard/payments/payout-accounts?tab=bank");
}
