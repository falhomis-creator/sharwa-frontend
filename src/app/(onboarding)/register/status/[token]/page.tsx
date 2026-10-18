import type { Metadata } from "next";
import { env } from "@/env";
import { RegistrationStatus } from "@/features/onboarding/components/registration-status";

export const metadata: Metadata = { title: "تجهيز المتجر" };

/**
 * Panel 03 (M02 US-02.4/5). The signed status token is the only identifier this wizard
 * ever puts in a URL, and it is a path param (FR-02.10). Rendered per request like the
 * rest of the `(onboarding)` group.
 */
export const instant = false;

export default async function RegistrationStatusPage(props: PageProps<"/register/status/[token]">) {
  const { token } = await props.params;
  return <RegistrationStatus token={token} whatsapp={env.NEXT_PUBLIC_PLATFORM_WHATSAPP} />;
}
