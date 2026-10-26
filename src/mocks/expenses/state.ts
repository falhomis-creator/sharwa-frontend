import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney, int, pick, seeded, type Currency } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, seedOf, storeState } from "@/mocks/store-state";

/**
 * M33 mock state (T166) — `OperatingExpense` rows per store, ordered `-expense_date, -id`
 * like `operating_expenses_view` and `expenses_api_service.list_expenses` (INT-043).
 * Validation messages are the ones Django returns verbatim. The list answer groups by month and carries one total
 * PER CURRENCY, formatted here as Django would (`format_money`) — never one mixed total.
 */
type Category = "packaging" | "rent" | "salaries" | "other";
const CATEGORIES: readonly Category[] = ["packaging", "rent", "salaries", "other"];
const CURRENCIES: readonly Currency[] = ["SAR", "USD", "YER_OLD", "YER_NEW"];

interface MockExpense {
  id: number;
  category: Category;
  /** Decimal(14,2) as text. */
  amount: string;
  currency: Currency;
  expense_date: string;
  note: string;
  created_by_name: string | null;
}

interface ExpensesState {
  rows: MockExpense[];
  ids: { expense: number };
}

const PAGE_SIZE = 50;
const NOTES: Record<Category, string[]> = {
  packaging: ["كراتين شحن مقاس متوسط", "أكياس هدايا وشريط", "ملصقات وطباعة فواتير", "فلين تغليف للزجاجات"],
  rent: ["إيجار المستودع — دفعة شهرية", "إيجار المحل", "إيجار نقطة الاستلام في جدة"],
  salaries: ["راتب مندوب التوصيل", "راتب موظف خدمة العملاء", "مكافأة نهاية الموسم"],
  other: ["فاتورة الكهرباء", "اشتراك الإنترنت", "صيانة الطابعة", "ضيافة", ""],
};

function dateDaysAgo(days: number): string {
  const d = new Date(FIXTURE_NOW - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function seed(store: string | null): ExpensesState {
  const state: ExpensesState = { rows: [], ids: { expense: 0 } };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 3333);
  const rows: MockExpense[] = [];
  for (let i = 0; i < 46; i++) {
    const category = pick(rnd, CATEGORIES);
    // Mostly SAR; some Yemeni-rial entries in the same months (US-33.2.1), one USD.
    const currency: Currency = i === 9 ? "USD" : i % 5 === 3 ? "YER_NEW" : i % 13 === 7 ? "YER_OLD" : "SAR";
    const base = category === "rent" ? int(rnd, 1500, 4500) : category === "salaries" ? int(rnd, 1800, 5200) : int(rnd, 40, 650);
    const amount = currency === "YER_NEW" ? base * 140 : currency === "YER_OLD" ? base * 140 : currency === "USD" ? Math.round(base / 3.75) : base;
    rows.push({
      id: 0,
      category,
      amount: (amount + (rnd() < 0.4 ? 0.5 : 0)).toFixed(2),
      currency,
      expense_date: dateDaysAgo(int(rnd, 0, 175)),
      note: pick(rnd, NOTES[category]),
      created_by_name: rnd() < 0.3 ? pick(rnd, ["سارة الحربي", "منى القحطاني"]) : null,
    });
  }
  // Ids follow entry order (oldest first), as a real table would.
  rows.sort((a, b) => a.expense_date.localeCompare(b.expense_date));
  rows.forEach((r) => (r.id = ++state.ids.expense));
  state.rows = rows;
  return state;
}

export function expensesState(store: string | null): ExpensesState {
  return storeState(store, "expenses", () => seed(store));
}

function view(r: MockExpense) {
  return {
    id: r.id,
    category: r.category,
    display_amount: displayMoney(Number(r.amount), r.currency),
    currency: r.currency,
    expense_date: r.expense_date,
    note: r.note,
    created_by_name: r.created_by_name,
  };
}

export function listExpenses(store: string | null, params: URLSearchParams) {
  const category = params.get("category");
  const currency = params.get("currency");
  const from = params.get("from");
  const to = params.get("to");
  const filtered = expensesState(store)
    .rows.filter(
      (r) =>
        (!category || r.category === category) &&
        (!currency || r.currency === currency) &&
        (!from || r.expense_date >= from) &&
        (!to || r.expense_date <= to),
    )
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.id - a.id);
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const monthsInPage = [...new Set(pageRows.map((r) => r.expense_date.slice(0, 7)))];
  const months = monthsInPage.map((month) => {
    // A month's totals cover the WHOLE filtered month, not only the rows on this page.
    const inMonth = filtered.filter((r) => r.expense_date.startsWith(month));
    const totals = CURRENCIES.flatMap((c) => {
      const rows = inMonth.filter((r) => r.currency === c);
      if (!rows.length) return [];
      const sum = rows.reduce((a, r) => a + Math.round(Number(r.amount) * 100), 0) / 100;
      return [{ currency: c, display_total: displayMoney(sum, c) }];
    });
    return { month, totals, rows: pageRows.filter((r) => r.expense_date.startsWith(month)).map(view) };
  });
  return { count: filtered.length, months };
}

export function createExpense(store: string | null, body: Record<string, unknown>, createdBy: string | null): MockResult<ReturnType<typeof view>> {
  const e: Record<string, string[]> = {};
  const category = String(body.category ?? "");
  if (!(CATEGORIES as readonly string[]).includes(category)) e.category = ["اختر فئة صحيحة."];
  const amount = String(body.amount ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) < 0.01) e.amount = ["قيمة المصروف موجبة دائماً."];
  else if (Number(amount) >= 1e12) e.amount = ["المبلغ أكبر من المسموح."];
  const currency = String(body.currency ?? "SAR");
  if (!(CURRENCIES as readonly string[]).includes(currency)) e.currency = ["عملة غير مدعومة."];
  const date = String(body.expense_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) e.expense_date = ["أدخل تاريخاً صحيحاً."];
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 500) e.note = ["الملاحظة 500 حرف على الأكثر."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const state = expensesState(store);
  const row: MockExpense = { id: ++state.ids.expense, category: category as Category, amount: Number(amount).toFixed(2), currency: currency as Currency, expense_date: date, note, created_by_name: createdBy };
  state.rows.push(row);
  return { ok: true, status: 201, data: view(row) };
}
