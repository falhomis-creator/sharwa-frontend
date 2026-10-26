import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** M32 §6 named this path; the sidebar's «تذاكر الدعم» is `/dashboard/wallet/tickets`. */
export default function SupportTicketsRedirect() {
  redirect("/dashboard/wallet/tickets");
}
