import type { AdminRole, AdminSession } from "@/features/platform-admin/schemas/auth";
import { MOCK_MERCHANT_PASSWORD } from "@/mocks/dashboard/auth";

/**
 * Console auth fixtures (M20 §7 «المصادقة» — `[NEEDS BACKEND]`). A dev-only cookie stands
 * in for the Django admin `sessionid` on the public schema, exactly like the merchant
 * marker (`sharwa_mock_session`) does on a store origin. It is a separate name so a
 * merchant session can never open the console and vice versa (FR-20.01).
 *
 * Local credentials (same password as every other mocked login):
 * - `admin` → superuser — everything;
 * - `ops`   → operator  — reads everything, writes Sharwa Pay and dues only (FR-20.09).
 */
export const MOCK_ADMIN_COOKIE = "sharwa_mock_admin";

const USERS: Record<string, { role: AdminRole; full_name: string }> = {
  admin: { role: "superuser", full_name: "فارس — مالك المنصة" },
  ops: { role: "operator", full_name: "سلمى — التشغيل" },
};

export function adminCookie(role: AdminRole): string {
  return `${MOCK_ADMIN_COOKIE}=${role}; Path=/; HttpOnly; SameSite=Lax`;
}

export function clearedAdminCookie(): string {
  return `${MOCK_ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function parseAdminRole(value: string | undefined | null): AdminRole | null {
  return value === "superuser" || value === "operator" ? value : null;
}

export function adminSessionFor(role: AdminRole): AdminSession {
  const [username, user] = Object.entries(USERS).find(([, u]) => u.role === role)!;
  return { username, full_name: user.full_name, role };
}

export function adminLoginMock(username: unknown, password: unknown): { ok: true; role: AdminRole } | { ok: false; status: number; body: Record<string, unknown> } {
  const u = typeof username === "string" ? username.trim().toLowerCase() : "";
  if (!u) return { ok: false, status: 400, body: { username: ["أدخل اسم المستخدم."] } };
  if (typeof password !== "string" || !password) return { ok: false, status: 400, body: { password: ["أدخل كلمة المرور."] } };
  const user = USERS[u];
  if (!user || password !== MOCK_MERCHANT_PASSWORD) return { ok: false, status: 400, body: { detail: "اسم المستخدم أو كلمة المرور غير صحيحة." } };
  return { ok: true, role: user.role };
}

export function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
