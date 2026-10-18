import { redirect } from "next/navigation";

/** `/dashboard/payments/accounts` → `/dashboard/payments/payout-accounts` (the path named in M14 §6). */
export default function Page() {
  redirect("/dashboard/payments/payout-accounts");
}
