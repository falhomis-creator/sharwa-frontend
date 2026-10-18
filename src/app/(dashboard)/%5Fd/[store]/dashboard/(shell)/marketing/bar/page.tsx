import { redirect } from "next/navigation";

/**
 * `/dashboard/marketing/bar` — M13 US-13.8 «الشريط التسويقي». The announcement bar is one
 * setting owned by M34 (`/dashboard/settings/announcement`); the hub links there and this
 * route only redirects (deviation recorded in the M13 report).
 */
export default function Page() {
  redirect("/dashboard/settings/announcement");
}
