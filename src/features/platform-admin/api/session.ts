import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminSession } from "@/features/platform-admin/schemas/auth";
import { MOCK_ADMIN_COOKIE, adminSessionFor, parseAdminRole } from "@/mocks/platform/auth";
import { isMocksOn } from "@/mocks/runtime";

/**
 * Console session on the server (M20 §7 «المصادقة»). Until Django exposes an admin session
 * contract for `/api/v1/platform/*`, only the dev marker cookie resolves (mocks on). With
 * mocks off there is no session and the console stays on its login screen.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isMocksOn()) return null;
  const role = parseAdminRole((await cookies()).get(MOCK_ADMIN_COOKIE)?.value);
  return role ? adminSessionFor(role) : null;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}
