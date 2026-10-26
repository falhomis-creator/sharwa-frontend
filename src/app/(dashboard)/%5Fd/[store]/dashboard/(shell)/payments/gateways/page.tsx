import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** `/dashboard/payments/gateways` → `/dashboard/payments` (the M34 settings link and the old nav path; the gateways list lives on the overview). */
export default function Page() {
  redirect("/dashboard/payments");
}
