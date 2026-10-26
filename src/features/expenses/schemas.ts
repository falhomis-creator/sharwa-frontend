import { z } from "zod";
import { CURRENCIES, currencySchema, type Currency } from "@/lib/schemas/money";

/**
 * M33 — المصروفات التشغيلية (T166). `OperatingExpense` (discovery 02 §12): four categories,
 * VALUES verbatim, labels Arabic. Served by Django `GET/POST /api/v1/expenses/` (INT-043,
 * `api/views_expenses.py`) through `/api/bff/expenses` — module `expenses` in
 * SHARWA_LIVE_MODULES, the fixture otherwise. The month groups and their per-currency totals
 * are BUILT BY THE SERVER (FR-33.03): the browser never sums.
 */
export const EXPENSE_CATEGORIES = ["packaging", "rent", "salaries", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  packaging: "تغليف",
  rent: "إيجار",
  salaries: "رواتب",
  other: "أخرى",
};

export { CURRENCIES as EXPENSE_CURRENCIES };
export type { Currency };

export const expenseRowSchema = z.object({
  id: z.number().int(),
  category: z.enum(EXPENSE_CATEGORIES),
  /** «1,250.00 ر.س» — the server's string, shown verbatim. */
  display_amount: z.string(),
  currency: currencySchema,
  /** `YYYY-MM-DD`. */
  expense_date: z.string(),
  note: z.string(),
  /** The staff member who entered it; `null` = the owner (US-33.1.3). */
  created_by_name: z.string().nullable(),
});
export type ExpenseRow = z.infer<typeof expenseRowSchema>;

export const expenseMonthSchema = z.object({
  /** `YYYY-MM`. */
  month: z.string(),
  totals: z.array(z.object({ currency: currencySchema, display_total: z.string() })),
  rows: z.array(expenseRowSchema),
});
export type ExpenseMonth = z.infer<typeof expenseMonthSchema>;

export const expenseListSchema = z.object({ count: z.number().int(), months: z.array(expenseMonthSchema) });
export type ExpenseList = z.infer<typeof expenseListSchema>;

/** FR-33.01: the five model fields only. */
export const expenseInputSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { message: "اختر الفئة." }),
  amount: z
    .string()
    .trim()
    .min(1, "أدخل المبلغ.")
    .regex(/^\d+(\.\d{1,2})?$/, "مبلغ غير صحيح — رقم بمنزلتين عشريتين على الأكثر.")
    .refine((v) => Number(v) >= 0.01, "قيمة المصروف موجبة دائماً."),
  currency: currencySchema,
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر التاريخ."),
  note: z.string().max(500, "الملاحظة 500 حرف على الأكثر."),
});
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
