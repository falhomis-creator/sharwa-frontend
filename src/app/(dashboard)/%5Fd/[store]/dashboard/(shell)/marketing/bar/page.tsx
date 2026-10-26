import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/**
 * `/dashboard/marketing/bar` — M13 US-13.8 «الشريط التسويقي». The announcement bar is one
 * setting owned by M34 (`/dashboard/settings/announcement`); the hub links there and this
 * route only redirects (deviation recorded in the M13 report).
 */
export default function Page() {
  redirect("/dashboard/settings/announcement");
}
