import { z } from "zod";

/**
 * M18 contracts (§7 — every row `[NEEDS BACKEND]`). Permission codes stay `z.string()`:
 * the matrix is built from `GET /api/v1/permissions/` (FR-18.03), never from a local list.
 */
export const STAFF_STATUSES = ["active", "inactive", "terminated"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = { active: "نشط", inactive: "معطّل", terminated: "مُنهى" };

export const staffSchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  phone: z.string(),
  is_active: z.boolean(),
  terminated_at: z.string().nullable(),
  enforce_ip_whitelist: z.boolean(),
  enforce_roster_schedule: z.boolean(),
  token_version: z.number().int(),
  last_seen_at: z.string().nullable(),
  created_at: z.string(),
  status: z.enum(STAFF_STATUSES),
  roles_summary: z.string().optional().default(""),
});
export type StaffMember = z.infer<typeof staffSchema>;
/** INT-022: `POST /staff/` and `POST /staff/<id>/reset-password/` return the staff password ONCE. */
export const createdStaffSchema = staffSchema.extend({ temporary_password: z.string().optional() });
export const passwordResetSchema = z.object({ temporary_password: z.string(), token_version: z.number().int() });
export const staffListSchema = z.object({ count: z.number().int(), results: z.array(staffSchema) });

export const staffFormSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم مطلوب."),
  phone: z.string().trim().min(9, "رقم الهاتف غير صالح."),
  is_active: z.boolean(),
  enforce_ip_whitelist: z.boolean(),
  enforce_roster_schedule: z.boolean(),
});
export type StaffForm = z.infer<typeof staffFormSchema>;

export const permissionSchema = z.object({ code: z.string(), name: z.string(), category: z.string() });
export type Permission = z.infer<typeof permissionSchema>;
export const permissionsSchema = z.array(permissionSchema);

export const roleSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  is_system_role: z.boolean(),
  max_discount_percent: z.string().nullable(),
  permission_codes: z.array(z.string()),
  members_count: z.number().int().default(0),
});
export type Role = z.infer<typeof roleSchema>;
export const rolesSchema = z.array(roleSchema);

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, "اسم الدور مطلوب."),
  max_discount_percent: z.string().trim().refine((v) => v === "" || (/^\d{1,3}(\.\d+)?$/.test(v) && Number(v) <= 100), "النسبة بين 0 و100."),
  permission_codes: z.array(z.string()).min(1, "حدد صلاحية واحدة على الأقل."),
});
export type RoleForm = z.infer<typeof roleFormSchema>;

export const LOCATION_ROLES = ["manager", "cashier", "warehouse_operator", "driver", "pickup_agent"] as const;
export type LocationRole = (typeof LOCATION_ROLES)[number];
export const LOCATION_ROLE_LABELS: Record<LocationRole, string> = {
  manager: "مدير",
  cashier: "كاشير",
  warehouse_operator: "عامل مستودع",
  driver: "سائق",
  pickup_agent: "موظف استلام",
};

export const assignmentSchema = z.object({
  location_id: z.number().int(),
  location_name: z.string(),
  location_active: z.boolean(),
  role_id: z.number().int().nullable(),
  location_role: z.enum(LOCATION_ROLES).nullable(),
});
export type Assignment = z.infer<typeof assignmentSchema>;
export const assignmentsSchema = z.array(assignmentSchema);

export const overrideSchema = z.object({ id: z.number().int(), staff_id: z.number().int(), permission_code: z.string(), allow: z.boolean() });
export type Override = z.infer<typeof overrideSchema>;
export const overridesSchema = z.array(overrideSchema);

export const effectivePermissionSchema = z.object({ code: z.string(), from_role: z.boolean(), override: z.boolean().nullable(), effective: z.boolean() });
export const effectivePermissionsSchema = z.array(effectivePermissionSchema);

export const staffSessionSchema = z.object({
  id: z.number().int(),
  device: z.string(),
  ip: z.string(),
  last_activity_at: z.string(),
  created_at: z.string(),
  is_current: z.boolean(),
});
export const staffSessionsSchema = z.array(staffSessionSchema);
export const tokenSchema = z.object({ id: z.number().int(), name: z.string(), created_at: z.string(), last_used_at: z.string().nullable() });
export const tokensSchema = z.array(tokenSchema);
export const createdTokenSchema = tokenSchema.extend({ token: z.string() });
export const deviceSchema = z.object({ id: z.number().int(), label: z.string(), trusted_at: z.string(), last_seen_at: z.string() });
export const devicesSchema = z.array(deviceSchema);
export const rosterEntrySchema = z.object({ weekday: z.number().int().min(0).max(6), from: z.string().nullable(), to: z.string().nullable() });
export const rosterSchema = z.array(rosterEntrySchema);
export type RosterEntry = z.infer<typeof rosterEntrySchema>;

export const APPROVAL_TYPES = ["refund", "shift_shortage", "stock_writeoff", "discount_exception", "order_approval", "po_approval"] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];
export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  refund: "استرجاع مبلغ",
  shift_shortage: "عجز وردية",
  stock_writeoff: "إعدام مخزون",
  discount_exception: "استثناء خصم",
  order_approval: "اعتماد طلب",
  po_approval: "اعتماد أمر شراء",
};
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = { pending: "معلّق", approved: "مُعتمَد", rejected: "مرفوض" };

export const approvalSchema = z.object({
  id: z.number().int(),
  request_type: z.enum(APPROVAL_TYPES),
  status: z.enum(APPROVAL_STATUSES),
  requester_id: z.number().int().nullable(),
  requester_name: z.string(),
  approver_role: z.string(),
  payload: z.record(z.string(), z.unknown()),
  summary: z.string(),
  entity: z.object({ kind: z.enum(["order", "product", "shift", "purchase_order"]), id: z.number().int(), label: z.string(), available: z.boolean() }).nullable(),
  note: z.string().nullable(),
  decided_by: z.string().nullable(),
  decided_at: z.string().nullable(),
  escalated_at: z.string().nullable(),
  version: z.number().int(),
  created_at: z.string(),
  /** Server-side: the current member asked for it, so they may not decide (SC-18.2). */
  is_mine: z.boolean().default(false),
});
export type Approval = z.infer<typeof approvalSchema>;
export const approvalsSchema = z.object({ count: z.number().int(), results: z.array(approvalSchema) });

export const auditEntrySchema = z.object({
  id: z.number().int(),
  action_code: z.string(),
  actor: z.string(),
  entity: z.string().nullable(),
  before_snapshot: z.record(z.string(), z.unknown()).nullable(),
  after_snapshot: z.record(z.string(), z.unknown()).nullable(),
  prev_hash: z.string(),
  row_hash: z.string(),
  created_at: z.string(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export const auditListSchema = z.object({ count: z.number().int(), results: z.array(auditEntrySchema) });
export const verifySchema = z.object({ ok: z.boolean(), broken_at: z.number().int().nullable(), rows: z.number().int() });

export const ALERT_TYPES = ["export_volume", "view_volume", "message_volume"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];
export const ALERT_TYPE_LABELS: Record<AlertType, string> = { export_volume: "حجم التصدير", view_volume: "حجم العرض", message_volume: "حجم الرسائل" };
export const alertSchema = z.object({
  id: z.number().int(),
  // INT-022: Django keeps the alert after the member row is gone (SET_NULL + `staff_name` snapshot).
  staff_id: z.number().int().nullable(),
  staff_name: z.string(),
  staff_terminated: z.boolean(),
  level: z.enum(["warning", "critical"]),
  alert_type: z.enum(ALERT_TYPES),
  value: z.number(),
  limit: z.number(),
  is_read: z.boolean(),
  created_at: z.string(),
});
export type BehaviorAlert = z.infer<typeof alertSchema>;
export const alertsSchema = z.object({ count: z.number().int(), results: z.array(alertSchema) });

export const staffCountersSchema = z.object({ pending_approvals: z.number().int(), unread_alerts: z.number().int() });

export const WEEKDAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;
