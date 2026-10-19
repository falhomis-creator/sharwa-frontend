import { z } from "zod";

/**
 * Console session (M20 §7 «المصادقة» — `[NEEDS BACKEND]`): a Django admin session on the
 * public schema. `superuser` may do everything; `operator` (Django staff, not superuser)
 * reads everything and acts on Sharwa Pay and dues only (FR-20.09).
 */
export const ADMIN_ROLES = ["superuser", "operator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = { superuser: "مالك المنصة", operator: "مشرف تشغيلي" };

export const adminSessionSchema = z.object({
  username: z.string(),
  full_name: z.string(),
  role: z.enum(ADMIN_ROLES),
  csrf_token: z.string().optional(),
});
export type AdminSession = z.infer<typeof adminSessionSchema>;

/** What each role may write. Reads are open to both. The server stays the final word (403). */
export type AdminArea = "stores" | "billing" | "apps" | "catalog" | "zones" | "webhooks" | "dues" | "sharwa_pay";
const OPERATOR_WRITES: readonly AdminArea[] = ["dues", "sharwa_pay"];

export function canWrite(role: AdminRole | undefined, area: AdminArea): boolean {
  if (!role) return false;
  return role === "superuser" || OPERATOR_WRITES.includes(area);
}

export const adminLoginInputSchema = z.object({
  username: z.string().trim().min(1, "أدخل اسم المستخدم."),
  password: z.string().min(1, "أدخل كلمة المرور."),
});
export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;
