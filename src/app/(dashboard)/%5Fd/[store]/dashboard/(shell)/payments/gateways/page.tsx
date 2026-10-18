import { redirect } from "next/navigation";

/** `/dashboard/payments/gateways` → `/dashboard/payments` (the M34 settings link and the old nav path; the gateways list lives on the overview). */
export default function Page() {
  redirect("/dashboard/payments");
}
