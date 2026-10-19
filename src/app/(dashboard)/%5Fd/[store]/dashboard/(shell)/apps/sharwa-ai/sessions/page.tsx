import { redirect } from "next/navigation";

/** M31 §6 named this path; the sessions list lives at the sidebar's `/dashboard/support/sessions`. */
export default function SharwaAiSessionsRedirect() {
  redirect("/dashboard/support/sessions");
}
