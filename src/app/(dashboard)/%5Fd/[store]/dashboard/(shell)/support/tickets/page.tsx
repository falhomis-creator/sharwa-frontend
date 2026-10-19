import { redirect } from "next/navigation";

/** M32 §6 named this path; the sidebar's «تذاكر الدعم» is `/dashboard/wallet/tickets`. */
export default function SupportTicketsRedirect() {
  redirect("/dashboard/wallet/tickets");
}
