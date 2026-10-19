import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAdminSession } from "@/features/platform-admin/api/session";
import { AdminLoginScreen } from "@/features/platform-admin/components/login-screen";

export const metadata: Metadata = { title: "تسجيل الدخول" };

/** Blocks on the session read instead of prerendering a shell (same reason as the console layout). */
export const instant = false;

/** `console.<base>/login` — an open session goes straight to the overview. */
export default async function AdminLoginPage() {
  await connection();
  if (await getAdminSession()) redirect("/");
  return <AdminLoginScreen />;
}
