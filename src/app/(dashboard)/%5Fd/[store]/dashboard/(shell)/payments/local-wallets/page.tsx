import { redirect } from "next/navigation";

/** `/dashboard/payments/local-wallets` → `/dashboard/payments/payout-accounts?tab=wallet` (the pre-M14 nav path). */
export default function Page() {
  redirect("/dashboard/payments/payout-accounts?tab=wallet");
}
