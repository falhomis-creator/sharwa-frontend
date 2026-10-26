import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSessionSchema, type AdminSession } from "@/features/platform-admin/schemas/auth";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { MOCK_ADMIN_COOKIE, adminSessionFor, parseAdminRole } from "@/mocks/platform/auth";
import { isMocksOn, isModuleLive } from "@/mocks/runtime";

/**
 * Console session on the server (M20 §7 «المصادقة»).
 *
 * Live (`platform` in `SHARWA_LIVE_MODULES`, or mocks off — INT-030): Django's
 * `GET /api/v1/platform/auth/me/` with the browser's cookies — a Django admin session on the
 * public schema (the BFF reaches Django on its platform host, so no `X-Store-Domain`).
 * 401/403/unreachable ⇒ no session ⇒ the console stays on its login screen.
 *
 * Mock: the dev marker cookie (`sharwa_mock_admin`) resolves to a fixture user.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  if (isModuleLive("platform")) {
    const cookie = jar.toString();
    if (!cookie) return null;
    try {
      const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/platform/auth/me/`, {
        headers: { accept: "application/json", cookie },
        cache: "no-store",
        redirect: "manual",
      });
      if (!res.ok) return null;
      const parsed = adminSessionSchema.safeParse(await res.json());
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
  if (!isMocksOn()) return null;
  const role = parseAdminRole(jar.get(MOCK_ADMIN_COOKIE)?.value);
  return role ? adminSessionFor(role) : null;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}
