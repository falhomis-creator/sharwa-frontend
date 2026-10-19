import type { MockResult } from "@/lib/bff/mock-route";
import { normalizePhone } from "@/lib/format";
import { displayMoney, type Currency } from "@/mocks/_fixtures";
import { findClient, nextPlatformId, platformState, type WalletRow, type WalletTx } from "@/mocks/platform/state";
import { storeState } from "@/mocks/store-state";

/**
 * M40 «محفظة شروة» — customer side (T181). Every row is `[NEEDS BACKEND]` (M40 §7).
 *
 * ONE source of truth with the platform console (M20 US-20.5): wallets, top-up and
 * withdrawal requests are the rows of `platformState()` — a top-up made here is the one
 * the reviewer approves in `console.<base>/sharwa-pay/topups`, and its approval (or a
 * withdrawal's rejection + reversal) is what this wallet then shows. Only the OTP
 * sessions are local to this module.
 *
 * Money is formatted here (`display_*`) and never summed across currencies (FR-40.03).
 */
type Body = Record<string, unknown>;

export const PAY_CURRENCIES = ["SAR", "USD", "YER_OLD", "YER_NEW"] as const satisfies readonly Currency[];
export const OTP_TTL_SECONDS = 600;
export const MOCK_PAY_OTP = "123456";
/** Fixture: this phone's code is always already expired (US-40.1 independent test without waiting 11 min). */
export const MOCK_PAY_EXPIRED_PHONE = "967770000600";
/** Fixture: a wallet that exists but is suspended (`is_active=false`). */
export const MOCK_PAY_INACTIVE_PHONE = "967778889990";
const SEND_LIMIT = 3;
const SEND_WINDOW_MS = 10 * 60_000;
const VERIFY_LIMIT = 5;
const VERIFY_LOCK_MS = 5 * 60_000;
const RECEIPT_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

interface OtpRow {
  sends: number[];
  sent_at: number;
  attempts: number;
  locked_until: number;
}
interface PayLocal {
  otp: Map<string, OtpRow>;
  /** Request → tx links the platform row does not carry. */
  topupNotes: Map<number, string>;
}
function local(): PayLocal {
  return storeState<PayLocal>(null, "sharwa-pay-customer", () => ({ otp: new Map(), topupNotes: new Map() }));
}

export function normalizePayPhone(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const n = normalizePhone(s);
  return /^(967|966)\d{8,9}$/.test(n) ? n : null;
}

const retryAfter = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export function sendOtp(b: Body): MockResult<{ ok: true; phone: string; expires_in: number }> {
  const phone = normalizePayPhone(b.phone);
  if (!phone) return { ok: false, status: 400, body: { phone: ["أدخل رقم جوال يمني أو سعودي صحيحاً."] } };
  const t = Date.now();
  const row = local().otp.get(phone) ?? { sends: [], sent_at: 0, attempts: 0, locked_until: 0 };
  row.sends = row.sends.filter((x) => t - x < SEND_WINDOW_MS);
  if (row.sends.length >= SEND_LIMIT) {
    return { ok: false, status: 429, body: { detail: "طلبات كثيرة — حاول لاحقاً.", retry_after: retryAfter(SEND_WINDOW_MS - (t - row.sends[0]!)) } };
  }
  row.sends.push(t);
  row.sent_at = phone === MOCK_PAY_EXPIRED_PHONE ? t - (OTP_TTL_SECONDS + 1) * 1000 : t;
  row.attempts = 0;
  local().otp.set(phone, row);
  return { ok: true, data: { ok: true, phone, expires_in: OTP_TTL_SECONDS } };
}

export function verifyOtp(b: Body): MockResult<{ ok: true; phone: string }> {
  const phone = normalizePayPhone(b.phone);
  const code = typeof b.code === "string" ? b.code.trim() : "";
  if (!phone) return { ok: false, status: 400, body: { phone: ["أدخل رقم جوال صحيحاً."] } };
  if (!/^\d{6}$/.test(code)) return { ok: false, status: 400, body: { code: ["الرمز 6 أرقام."] } };
  const t = Date.now();
  const row = local().otp.get(phone);
  if (!row) return { ok: false, status: 400, body: { detail: "اطلب رمزاً أولاً.", reason: "no_code" } };
  if (row.locked_until > t) return { ok: false, status: 429, body: { detail: "محاولات كثيرة — أُقفل التحقق مؤقتاً.", retry_after: retryAfter(row.locked_until - t) } };
  if (t - row.sent_at > OTP_TTL_SECONDS * 1000) return { ok: false, status: 400, body: { detail: "انتهت صلاحية الرمز. اطلب رمزاً جديداً.", reason: "expired" } };
  if (code !== MOCK_PAY_OTP) {
    row.attempts += 1;
    if (row.attempts >= VERIFY_LIMIT) {
      row.locked_until = t + VERIFY_LOCK_MS;
      return { ok: false, status: 429, body: { detail: "محاولات كثيرة — أُقفل التحقق مؤقتاً.", retry_after: retryAfter(VERIFY_LOCK_MS) } };
    }
    return { ok: false, status: 400, body: { detail: "الرمز غير صحيح.", reason: "invalid" } };
  }
  local().otp.delete(phone);
  return { ok: true, data: { ok: true, phone } };
}

function walletRow(phone: string): WalletRow | undefined {
  return platformState().wallets.get(phone);
}
const balance = (w: WalletRow | undefined, c: Currency) => w?.balances[c] ?? 0;

export function walletView(phone: string) {
  const w = walletRow(phone);
  return {
    customer_phone: phone,
    customer_name: w?.customer_name ?? null,
    is_active: phone !== MOCK_PAY_INACTIVE_PHONE,
    exists: Boolean(w),
    balances: PAY_CURRENCIES.map((c) => ({ currency: c, display_balance: displayMoney(balance(w, c), c), balance: balance(w, c).toFixed(2) })),
  };
}

const STORE_FOR_PURCHASE = ["noor", "glow", "bunn", "zahra"];

function txSource(phone: string, t: WalletTx) {
  const ord = /^ORD-(\d+)$/.exec(t.reference);
  if (t.reason === "purchase" || t.reason === "purchase_refund") {
    const schema = STORE_FOR_PURCHASE[t.id % STORE_FOR_PURCHASE.length]!;
    const client = findClient(schema);
    return { source_tenant_schema: schema, source_store_name: client?.name ?? null, source_store_available: client ? client.is_active : false, source_order_id: ord ? Number(ord[1]) : null };
  }
  if (t.reason === "platform_fee") {
    const client = platformState().clients.find((c) => c.merchant_phone === phone);
    return { source_tenant_schema: client?.schema_name ?? null, source_store_name: client?.name ?? null, source_store_available: client?.is_active ?? false, source_order_id: null };
  }
  return { source_tenant_schema: null, source_store_name: null, source_store_available: true, source_order_id: null };
}

export function listTransactions(phone: string, p: URLSearchParams) {
  const w = walletRow(phone);
  if (!w) return { count: 0, results: [] };
  // balance_after: replay backwards from today's balance, per currency.
  const running: Partial<Record<Currency, number>> = { ...w.balances };
  const sorted = [...w.transactions].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  const rows = sorted.map((t) => {
    const after = running[t.currency] ?? 0;
    running[t.currency] = after - (t.direction === "credit" ? t.amount : -t.amount);
    const ref = /^(TOP|WD)-(\d+)$/.exec(t.reference);
    return {
      id: t.id,
      transaction_type: t.direction,
      reason: t.reason,
      display_amount: displayMoney(t.amount, t.currency),
      currency: t.currency,
      display_balance_after: displayMoney(after, t.currency),
      ...txSource(phone, t),
      related_request: ref && (ref[1] === "TOP" ? platformState().topups : platformState().withdrawals).some((r) => r.id === Number(ref[2])) ? { kind: ref[1] === "TOP" ? ("topup" as const) : ("withdrawal" as const), id: Number(ref[2]) } : null,
      created_at: t.created_at,
    };
  });
  const currency = p.get("currency");
  const reason = p.get("reason");
  const filtered = rows.filter((r) => (!currency || r.currency === currency) && (!reason || r.reason === reason));
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  return { count: filtered.length, results: filtered.slice((page - 1) * 20, page * 20) };
}

export function listRequests(phone: string) {
  const s = platformState();
  return {
    topups: s.topups
      .filter((t) => t.customer_phone === phone)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((t) => ({ id: t.id, display_amount: displayMoney(t.amount, t.currency), currency: t.currency, bank_transaction_id: t.bank_transaction_id, reference_note: local().topupNotes.get(t.id) ?? "", status: t.status, rejection_reason: t.status === "rejected" ? t.note || "رُفض الطلب." : null, credited_at: t.status === "approved" ? t.decided_at : null, created_at: t.created_at })),
    withdrawals: s.withdrawals
      .filter((w) => w.customer_phone === phone)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((w) => ({ id: w.id, display_amount: displayMoney(w.amount, w.currency), currency: w.currency, payout_destination: w.destination, status: w.status, rejection_reason: w.status === "rejected" ? w.note || "رُفض الطلب." : null, created_at: w.created_at })),
  };
}

function amountOf(raw: unknown): number | null {
  const s = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n >= 0.01 ? n : null;
}
const isCurrency = (v: unknown): v is Currency => typeof v === "string" && (PAY_CURRENCIES as readonly string[]).includes(v);

export async function createTopup(phone: string, form: FormData): Promise<MockResult<{ id: number; status: "pending" }>> {
  if (phone === MOCK_PAY_INACTIVE_PHONE) return { ok: false, status: 403, body: { detail: "المحفظة موقوفة — تواصل مع الدعم." } };
  const errors: Record<string, string[]> = {};
  const amount = amountOf(form.get("amount"));
  const currency = form.get("currency");
  const tx = String(form.get("bank_transaction_id") ?? "").trim();
  const note = String(form.get("reference_note") ?? "").trim().slice(0, 200);
  const file = form.get("receipt_image");
  if (amount === null) errors.amount = ["أدخل مبلغاً صحيحاً لا يقل عن 0.01."];
  if (!isCurrency(currency)) errors.currency = ["اختر العملة."];
  if (!tx) errors.bank_transaction_id = ["أدخل رقم العملية البنكية."];
  else if (platformState().topups.some((t) => t.bank_transaction_id === tx && t.status !== "rejected")) errors.bank_transaction_id = ["رقم العملية مستخدم مسبقاً."];
  if (!(file instanceof File) || file.size === 0) errors.receipt_image = ["أرفق صورة الإيصال."];
  else {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!RECEIPT_EXT.includes(ext)) errors.receipt_image = ["الصيغ المسموحة: jpg, jpeg, png, webp, gif."];
    else if (file.size > RECEIPT_MAX_BYTES) errors.receipt_image = ["حجم الصورة أكبر من 5 ميغابايت."];
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const s = platformState();
  const id = nextPlatformId(s, "topup");
  s.topups.unshift({ id, customer_phone: phone, amount: amount!, currency: currency as Currency, bank_name: "—", bank_transaction_id: tx, receipt_image: `receipt-upload-${id}`, status: "pending", note: "", created_at: new Date().toISOString(), decided_at: null, decided_by: null });
  if (note) local().topupNotes.set(id, note);
  return { ok: true, status: 201, data: { id, status: "pending" } };
}

export function createWithdrawal(phone: string, b: Body): MockResult<{ id: number; status: "pending"; display_balance_after: string }> {
  if (phone === MOCK_PAY_INACTIVE_PHONE) return { ok: false, status: 403, body: { detail: "المحفظة موقوفة — تواصل مع الدعم." } };
  const errors: Record<string, string[]> = {};
  const amount = amountOf(b.amount);
  const currency = b.currency;
  const dest = typeof b.payout_destination === "string" ? b.payout_destination.trim() : "";
  if (amount === null) errors.amount = ["أدخل مبلغاً صحيحاً لا يقل عن 0.01."];
  if (!isCurrency(currency)) errors.currency = ["اختر العملة."];
  if (dest.length < 6) errors.payout_destination = ["أدخل بيانات الحساب المستقبِل كاملة."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const s = platformState();
  const w = walletRow(phone);
  const bal = balance(w, currency as Currency);
  if (!w || amount! > bal) return { ok: false, status: 400, body: { amount: ["الرصيد غير كافٍ."] } };
  const id = nextPlatformId(s, "withdrawal");
  const t = new Date().toISOString();
  // Debited at request time; the console's rejection reverses it (M40 §5).
  w.balances[currency as Currency] = Math.round((bal - amount!) * 100) / 100;
  w.transactions.unshift({ id: nextPlatformId(s, "wtx"), reason: "withdrawal", amount: amount!, currency: currency as Currency, direction: "debit", reference: `WD-${id}`, created_at: t });
  s.withdrawals.unshift({ id, customer_phone: phone, amount: amount!, currency: currency as Currency, destination: dest, status: "pending", note: "", created_at: t, decided_at: null, decided_by: null });
  return { ok: true, status: 201, data: { id, status: "pending", display_balance_after: displayMoney(w.balances[currency as Currency] ?? 0, currency as Currency) } };
}
