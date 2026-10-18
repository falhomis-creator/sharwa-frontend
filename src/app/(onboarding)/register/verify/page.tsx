import type { Metadata } from "next";
import { OtpForm } from "@/features/onboarding/components/otp-form";

export const metadata: Metadata = { title: "رمز التحقق" };

/**
 * Panel 02 (M02 US-02.3). The URL carries nothing: the OTP session and the draft come
 * from the wizard store (FR-02.10), and a visit without one goes back to `/register`.
 */
export default function VerifyPage() {
  return <OtpForm />;
}
