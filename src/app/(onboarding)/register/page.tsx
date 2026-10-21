import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { env } from "@/env";
import { RegisterForm } from "@/features/onboarding/components/register-form";
import { PROV_COOKIE, decodeStatusToken } from "@/features/onboarding/handoff";
import { register as copy } from "@/features/onboarding/onboarding.content";
import { STORE_NAME_MAX } from "@/features/onboarding/schemas";

export const metadata: Metadata = { title: "أنشئ متجرك" };

/**
 * Panel 01 (M02 US-02.1). `?store_name=` is M01's hand-over contract and the only query
 * parameter this wizard ever reads; nothing personal is written back to a URL (FR-02.10).
 * Rendered per request like the rest of the `(onboarding)` group.
 */
export const instant = false;

export default async function RegisterPage(props: PageProps<"/register">) {
  const [params, jar] = await Promise.all([props.searchParams, cookies()]);
  const raw = params.store_name;
  const storeName = ((Array.isArray(raw) ? raw[0] : raw) ?? "").trim().slice(0, STORE_NAME_MAX);
  const rawResume = jar.get(PROV_COOKIE)?.value;
  const resumeToken = rawResume ? decodeStatusToken(rawResume) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {resumeToken ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-border px-4 py-1 text-sm">
          <span className="py-2 text-muted-foreground">{copy.resume.text}</span>
          <Link
            href={`/register/status/${encodeURIComponent(resumeToken)}`}
            className="inline-flex h-11 items-center font-medium underline underline-offset-4"
          >
            {copy.resume.action}
          </Link>
        </div>
      ) : null}
      <RegisterForm initialStoreName={storeName} baseDomain={env.NEXT_PUBLIC_TENANT_BASE_DOMAIN} />
    </div>
  );
}
