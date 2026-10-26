import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/** M31 §6 named this path; the sessions list lives at the sidebar's `/dashboard/support/sessions`. */
export default function SharwaAiSessionsRedirect() {
  redirect("/dashboard/support/sessions");
}
