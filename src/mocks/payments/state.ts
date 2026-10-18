import type { MockResult } from "@/lib/bff/mock-route";
import { addDecimal, compareDecimal, isDecimal } from "@/lib/decimal";
import type {
  AccountType,
  Due,
  DueKind,
  DueStatus,
  DuesResponse,
  Gateway,
  MerchantWallet,
  PayoutAccount,
  PayoutAccountsResponse,
  StorePayments,
  TransactionType,
  WalletTransaction,
  Withdrawal,
  WithdrawalStatus,
} from "@/features/payments/schemas";
import { displayMoney, int, seeded, type Currency } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { ordersState } from "@/mocks/orders/state";
import { patchPayments, readSettings } from "@/mocks/settings/state";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";

/**
 * M14 fixtures (every row `[NEEDS BACKEND]`, §7): `PaymentCredential` per gateway of the
 * `GATEWAY_REGISTRY`, `PayoutAccount`, the singleton `MerchantWallet` in four currencies,
 * its append-only ledger, `MerchantWithdrawalRequest` and the platform dues
 * (`PlatformCommissionRecord` / `AppBillingCharge`).
 *
 * FR-14.01 / SC-14.1: credential values are held here (as Django holds them encrypted) and
 * NEVER leave this file — `gatewayView` only exposes `has_credentials`, the descriptors and
 * a four-character mask. The two store switches are the M34 settings row's own fields
 * (`enable_sharwa_pay`, `enable_manual_payment`), read and written through its exports.
 */
type Body = Record<string, unknown>;
const CURRENCY_LIST = ["SAR", "USD", "YER_OLD", "YER_NEW"] as const satisfies readonly Currency[];

// ── GATEWAY_REGISTRY (discovery 03 §3) ───────────────────────────────────────────────
interface RegistryField {
  name: string;
  label: string;
  is_secret: boolean;
  required: boolean;
}
export const GATEWAY_REGISTRY: Record<string, { name: string; description: string; fields: RegistryField[] }> = {
  jeeb: {
    name: "جيب",
    description: "محفظة جيب الإلكترونية — يدفع العميل من تطبيق جيب ويعود إلى متجرك.",
    fields: [
      { name: "merchant_id", label: "رقم التاجر (Merchant ID)", is_secret: false, required: true },
      { name: "api_key", label: "مفتاح الواجهة (API Key)", is_secret: true, required: true },
      { name: "webhook_secret", label: "سرّ الإشعارات (Webhook Secret)", is_secret: true, required: false },
    ],
  },
  kuraimi: {
    name: "الكريمي",
    description: "بنك الكريمي — دفع فوري من حساب «كريمي جوال» برمز تأكيد.",
    fields: [
      { name: "merchant_code", label: "كود التاجر", is_secret: false, required: true },
      { name: "username", label: "اسم المستخدم", is_secret: false, required: true },
      { name: "password", label: "كلمة المرور", is_secret: true, required: true },
      { name: "api_secret", label: "المفتاح السرّي", is_secret: true, required: true },
    ],
  },
};

interface CredentialRow {
  values: Record<string, string>;
  is_enabled: boolean;
  updated_at: string | null;
}

/** Seed secrets for `noor` — the check script asserts none of these strings ever reaches the network or the DOM. */
export const SEEDED_SECRETS = ["sk_live_9c41b2e07f2a", "whsec_51d0aa93e6b4"] as const;

function seedCredentials(store: string | null): Record<string, CredentialRow> {
  const rows: Record<string, CredentialRow> = {};
  for (const code of Object.keys(GATEWAY_REGISTRY)) rows[code] = { values: {}, is_enabled: false, updated_at: null };
  if (store === "noor") {
    rows.jeeb = {
      values: { merchant_id: "JB-204718", api_key: SEEDED_SECRETS[0], webhook_secret: SEEDED_SECRETS[1] },
      is_enabled: true,
      updated_at: new Date(Date.UTC(2026, 8, 28, 11, 20)).toISOString(),
    };
  }
  return rows;
}

function credentials(store: string | null) {
  return storeState(store, "payments:credentials", () => seedCredentials(store));
}

const mask = (v: string) => `••••${v.slice(-4)}`;

function gatewayView(code: string, row: CredentialRow): Gateway {
  const reg = GATEWAY_REGISTRY[code]!;
  const has = reg.fields.filter((f) => f.required).every((f) => Boolean(row.values[f.name]));
  return {
    gateway_code: code,
    name: reg.name,
    description: reg.description,
    is_enabled: has && row.is_enabled,
    has_credentials: has,
    updated_at: row.updated_at,
    fields: reg.fields.map((f) => {
      const v = row.values[f.name];
      return {
        name: f.name,
        label: f.label,
        is_secret: f.is_secret,
        required: f.required,
        masked_hint: f.is_secret && v ? mask(v) : null,
        value: f.is_secret ? null : (v ?? null),
      };
    }),
  };
}

export function listGateways(store: string | null): Gateway[] {
  const rows = credentials(store);
  return Object.keys(GATEWAY_REGISTRY).map((code) => gatewayView(code, rows[code]!));
}

export function getGateway(store: string | null, code: string): Gateway | null {
  if (!GATEWAY_REGISTRY[code]) return null;
  return gatewayView(code, credentials(store)[code]!);
}

/** `PUT gateways/<code>/credentials/` — empty fields keep the stored value; 204. */
export function saveCredentials(store: string | null, code: string, body: Body): MockResult<null> {
  const reg = GATEWAY_REGISTRY[code];
  if (!reg) return { ok: false, status: 404, body: { detail: "البوابة غير معروفة." } };
  const row = credentials(store)[code]!;
  const errors: Record<string, string[]> = {};
  const next = { ...row.values };
  for (const f of reg.fields) {
    const raw = body[f.name];
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v) {
      if (v.length > 200) errors[f.name] = ["القيمة أطول من المسموح."];
      else if (f.name === "merchant_id" && !/^[A-Za-z0-9-]{4,}$/.test(v)) errors[f.name] = ["رقم التاجر أحرف لاتينية وأرقام فقط."];
      else next[f.name] = v;
    } else if (f.required && !row.values[f.name]) {
      errors[f.name] = ["هذا الحقل مطلوب."];
    }
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  row.values = next;
  row.updated_at = new Date().toISOString();
  return { ok: true, data: null, status: 204 };
}

/** `PATCH gateways/<code>/` `{is_enabled}` — enabling needs stored credentials. */
export function setGatewayEnabled(store: string | null, code: string, body: Body): MockResult<Gateway> {
  const reg = GATEWAY_REGISTRY[code];
  if (!reg) return { ok: false, status: 404, body: { detail: "البوابة غير معروفة." } };
  if (typeof body.is_enabled !== "boolean") return { ok: false, status: 400, body: { is_enabled: ["قيمة غير صالحة."] } };
  const row = credentials(store)[code]!;
  const view = gatewayView(code, row);
  if (body.is_enabled && !view.has_credentials) return { ok: false, status: 400, body: { is_enabled: ["أدخل بيانات الاعتماد واحفظها قبل التفعيل."] } };
  row.is_enabled = body.is_enabled;
  row.updated_at = new Date().toISOString();
  return { ok: true, data: gatewayView(code, row) };
}

// ── Store switches (the M34 settings row) ────────────────────────────────────────────
export function readStorePayments(store: string | null, host: string): StorePayments {
  const s = readSettings(store, host);
  return {
    enable_sharwa_pay: s.enable_sharwa_pay,
    enable_manual_payment: s.enable_manual_payment,
    active_payout_accounts: accounts(store).filter((a) => a.is_active).length,
  };
}

export function patchStorePayments(store: string | null, host: string, body: Body): MockResult<StorePayments> {
  const res = patchPayments(store, host, body);
  if (!res.ok) return res;
  return { ok: true, data: readStorePayments(store, host) };
}

// ── Payout accounts ──────────────────────────────────────────────────────────────────
function seedAccounts(store: string | null): PayoutAccount[] {
  if (isEmptyStore(store)) return [];
  return [
    { id: 1, account_type: "bank", provider_name: "بنك الكريمي الإسلامي", account_number: "3004 1187 2290 15", account_name: "مؤسسة نور للعطور", is_active: true, sort_order: 0 },
    { id: 2, account_type: "bank", provider_name: "بنك التضامن", account_number: "YE21 TIBY 0000 0042 1170 08", account_name: "مؤسسة نور للعطور", is_active: true, sort_order: 1 },
    { id: 3, account_type: "bank", provider_name: "مصرف الراجحي", account_number: "SA44 8000 0204 6080 1012 3456", account_name: "نورة عبدالله الحضرمي", is_active: false, sort_order: 2 },
    { id: 4, account_type: "wallet", provider_name: "جيب", account_number: "777 410 225", account_name: "متجر نور", is_active: true, sort_order: 0 },
    { id: 5, account_type: "wallet", provider_name: "ون كاش", account_number: "733 902 118", account_name: "متجر نور", is_active: true, sort_order: 1 },
    { id: 6, account_type: "wallet", provider_name: "موبايل موني", account_number: "711 004 563", account_name: "نورة الحضرمي", is_active: false, sort_order: 2 },
  ];
}

function accounts(store: string | null): PayoutAccount[] {
  return storeState(store, "payments:accounts", () => seedAccounts(store));
}

const sorted = (list: PayoutAccount[]) => [...list].sort((a, b) => (a.account_type === b.account_type ? a.sort_order - b.sort_order : a.account_type === "bank" ? -1 : 1));

export function listAccounts(store: string | null, params: URLSearchParams): PayoutAccountsResponse {
  const all = accounts(store);
  const type = params.get("account_type");
  const results = sorted(type === "bank" || type === "wallet" ? all.filter((a) => a.account_type === type) : all);
  if (params.get("is_active") === "true") results.splice(0, results.length, ...results.filter((a) => a.is_active));
  return {
    count: results.length,
    counts: { bank: all.filter((a) => a.account_type === "bank").length, wallet: all.filter((a) => a.account_type === "wallet").length },
    results,
  };
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function validateAccount(b: Body, partial: boolean): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  const need = (k: string) => !partial || k in b;
  if (need("account_type") && b.account_type !== "bank" && b.account_type !== "wallet") e.account_type = ["اختر بنكاً أو محفظة."];
  if (need("provider_name") && !str(b.provider_name)) e.provider_name = ["اكتب اسم البنك أو المحفظة."];
  if (need("account_number")) {
    const n = str(b.account_number);
    if (n.length < 4) e.account_number = ["أدخل رقم الحساب أو الآيبان."];
    else if (!/^[A-Za-z0-9 -]+$/.test(n)) e.account_number = ["أرقام وحروف لاتينية فقط."];
  }
  if (need("account_name") && str(b.account_name).length < 2) e.account_name = ["اكتب اسم صاحب الحساب."];
  if ("is_active" in b && typeof b.is_active !== "boolean") e.is_active = ["قيمة غير صالحة."];
  return e;
}

export function createAccount(store: string | null, body: Body): MockResult<PayoutAccount> {
  const e = validateAccount(body, false);
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const list = accounts(store);
  const type = body.account_type as AccountType;
  const dup = list.find((a) => a.account_number.replace(/\s/g, "") === str(body.account_number).replace(/\s/g, ""));
  if (dup) return { ok: false, status: 400, body: { account_number: ["هذا الرقم مضاف مسبقاً."] } };
  const row: PayoutAccount = {
    id: nextId(store, "payout-account", 100),
    account_type: type,
    provider_name: str(body.provider_name),
    account_number: str(body.account_number),
    account_name: str(body.account_name),
    is_active: body.is_active !== false,
    sort_order: Math.max(-1, ...list.filter((a) => a.account_type === type).map((a) => a.sort_order)) + 1,
  };
  list.push(row);
  return { ok: true, data: row, status: 201 };
}

export function updateAccount(store: string | null, id: number, body: Body): MockResult<PayoutAccount> {
  const row = accounts(store).find((a) => a.id === id);
  if (!row) return { ok: false, status: 404, body: { detail: "الحساب غير موجود." } };
  const b = Object.fromEntries(Object.entries(body).filter(([k]) => ["provider_name", "account_number", "account_name", "is_active"].includes(k)));
  const e = validateAccount(b, true);
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  for (const k of ["provider_name", "account_number", "account_name"] as const) if (k in b) row[k] = str(b[k]);
  if ("is_active" in b) row.is_active = b.is_active === true;
  return { ok: true, data: row };
}

export function deleteAccount(store: string | null, id: number): MockResult<null> {
  const list = accounts(store);
  const i = list.findIndex((a) => a.id === id);
  if (i === -1) return { ok: false, status: 404, body: { detail: "الحساب غير موجود." } };
  if (walletState(store).withdrawals.some((w) => w.status === "pending" && w.payout_account_id === id)) {
    return {
      ok: false,
      status: 400,
      body: { detail: "هذا الحساب مرتبط بطلب سحب قيد المراجعة ولا يمكن حذفه الآن. عطّله ليختفي عن العملاء، واحذفه بعد البتّ في الطلب.", code: "has_pending_withdrawal" },
    };
  }
  list.splice(i, 1);
  return { ok: true, data: null, status: 204 };
}

export function reorderAccounts(store: string | null, body: Body): MockResult<PayoutAccount[]> {
  const ids = body.ordered_ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "number")) return { ok: false, status: 400, body: { ordered_ids: ["قائمة غير صالحة."] } };
  const list = accounts(store);
  const rows = ids.map((id) => list.find((a) => a.id === id));
  if (rows.some((r) => !r)) return { ok: false, status: 400, body: { ordered_ids: ["حساب غير موجود في القائمة."] } };
  const type = rows[0]?.account_type;
  if (rows.some((r) => r!.account_type !== type)) return { ok: false, status: 400, body: { ordered_ids: ["رتّب حسابات نوع واحد في كل مرة."] } };
  rows.forEach((r, i) => (r!.sort_order = i));
  return { ok: true, data: sorted(list.filter((a) => a.account_type === type)) };
}

// ── Merchant wallet, ledger, withdrawals ─────────────────────────────────────────────
interface LedgerRow {
  id: number;
  type: TransactionType;
  currency: Currency;
  reason: string;
  reference: WalletTransaction["reference"];
  cents: number; // signed
  balance_after: number; // cents
  created_at: string;
}
interface WithdrawalRow {
  id: number;
  currency: Currency;
  cents: number;
  status: WithdrawalStatus;
  payout_account_id: number;
  created_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
}
interface WalletState {
  ledger: LedgerRow[]; // chronological
  withdrawals: WithdrawalRow[];
  balances: Record<Currency, number>;
}

const iso = (msAgo: number) => new Date(FIXTURE_NOW - msAgo).toISOString();
const DAY = 86_400_000;

function seedWallet(store: string | null): WalletState {
  const state: WalletState = { ledger: [], withdrawals: [], balances: { SAR: 0, USD: 0, YER_OLD: 0, YER_NEW: 0 } };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 1414);
  const orderIds = ordersState(store).orders.map((o) => o.id);
  type Ev = Omit<LedgerRow, "id" | "balance_after">;
  const events: Ev[] = [];
  // Opening balance moved from the legacy `StoreSetting.merchant_balance` (§10 assumption).
  events.push({ type: "adjustment", currency: "SAR", reason: "رصيد افتتاحي منقول من الرصيد القديم", reference: null, cents: 85_000, created_at: iso(60 * DAY) });
  events.push({ type: "adjustment", currency: "YER_OLD", reason: "رصيد افتتاحي منقول من الرصيد القديم", reference: null, cents: 9_000_000, created_at: iso(60 * DAY - 3600_000) });
  let commissionId = 300;
  for (let i = 0; i < 34; i++) {
    const day = 58 - Math.floor(i * 1.6);
    const orderId = orderIds[(i * 3) % Math.max(1, orderIds.length)] ?? 1000 + i;
    const currency: Currency = i % 7 === 3 ? "USD" : i % 5 === 1 ? "YER_OLD" : "SAR";
    const base = currency === "USD" ? int(rnd, 40, 160) * 100 : currency === "YER_OLD" ? int(rnd, 12, 60) * 100_000 : int(rnd, 90, 420) * 100;
    const at = iso(day * DAY - int(rnd, 1, 9) * 3600_000);
    events.push({ type: "order_payment", currency, reason: "تحصيل دفع إلكتروني للطلب", reference: { kind: "order", id: orderId, label: `طلب #${orderId}` }, cents: base, created_at: at });
    if (currency === "SAR") {
      commissionId += 1;
      events.push({
        type: "commission",
        currency,
        reason: "عمولة المنصة 2.5%",
        reference: { kind: "commission", id: commissionId, label: `عمولة #${commissionId}` },
        cents: -Math.round(base * 0.025),
        created_at: new Date(Date.parse(at) + 60_000).toISOString(),
      });
    }
    if (i === 9 || i === 22) {
      events.push({ type: "refund", currency, reason: "استرجاع جزئي للعميل", reference: { kind: "order", id: orderId, label: `طلب #${orderId}` }, cents: -Math.round(base * 0.4), created_at: iso((day - 2) * DAY) });
    }
  }
  // Withdrawals: two approved (in the ledger), one rejected, one pending (reserved, not yet debited).
  const w = (id: number, currency: Currency, cents: number, status: WithdrawalStatus, account: number, daysAgo: number, reason: string | null = null): WithdrawalRow => ({
    id,
    currency,
    cents,
    status,
    payout_account_id: account,
    created_at: iso(daysAgo * DAY),
    decided_at: status === "pending" ? null : iso((daysAgo - 1) * DAY),
    rejection_reason: reason,
  });
  state.withdrawals = [
    w(41, "SAR", 50_000, "approved", 1, 40),
    w(42, "YER_OLD", 5_000_000, "approved", 4, 31),
    w(43, "SAR", 30_000, "rejected", 3, 18, "اسم صاحب الحساب لا يطابق السجل التجاري للمتجر."),
    w(44, "USD", 10_000, "approved", 2, 9),
    w(45, "SAR", 20_000, "pending", 1, 2),
  ];
  for (const x of state.withdrawals.filter((x) => x.status === "approved")) {
    events.push({ type: "withdrawal", currency: x.currency, reason: "سحب إلى حساب التاجر", reference: { kind: "withdrawal", id: x.id, label: `طلب سحب #${x.id}` }, cents: -x.cents, created_at: x.decided_at! });
  }
  events.sort((a, b) => a.created_at.localeCompare(b.created_at));
  let id = 7000;
  for (const ev of events) {
    state.balances[ev.currency] += ev.cents;
    state.ledger.push({ ...ev, id: ++id, balance_after: state.balances[ev.currency] });
  }
  return state;
}

function walletState(store: string | null): WalletState {
  return storeState(store, "payments:wallet", () => seedWallet(store));
}

const money = (cents: number, c: Currency) => displayMoney(cents / 100, c);
const decimal = (cents: number) => (cents / 100).toFixed(2);
const toCents = (v: string) => Math.round(Number(v) * 100);

function reserved(s: WalletState, c: Currency) {
  return s.withdrawals.filter((w) => w.currency === c && w.status === "pending").reduce((sum, w) => sum + w.cents, 0);
}

export function readWallet(store: string | null): MerchantWallet {
  const s = walletState(store);
  return {
    balances: CURRENCY_LIST.map((c) => {
      const r = reserved(s, c);
      const available = Math.max(0, s.balances[c] - r);
      return {
        currency: c,
        display_balance: money(s.balances[c], c),
        display_available: money(available, c),
        available: decimal(available),
        display_reserved: money(r, c),
        pending_withdrawals: s.withdrawals.filter((w) => w.currency === c && w.status === "pending").length,
      };
    }),
    updated_at: s.ledger.at(-1)?.created_at ?? new Date(FIXTURE_NOW).toISOString(),
  };
}

function page<T>(rows: T[], params: URLSearchParams) {
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  const p = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return { count: rows.length, results: rows.slice((p - 1) * size, p * size) };
}

export function listTransactions(store: string | null, params: URLSearchParams) {
  const s = walletState(store);
  const currency = params.get("currency");
  const type = params.get("type");
  const from = params.get("from");
  const to = params.get("to");
  const rows = s.ledger
    .filter((t) => !currency || t.currency === currency)
    .filter((t) => !type || t.type === type)
    .filter((t) => !from || t.created_at.slice(0, 10) >= from)
    .filter((t) => !to || t.created_at.slice(0, 10) <= to)
    .reverse();
  const { count, results } = page(rows, params);
  return {
    count,
    results: results.map(
      (t): WalletTransaction => ({
        id: t.id,
        type: t.type,
        currency: t.currency,
        reason: t.reason,
        reference: t.reference,
        amount: decimal(t.cents),
        display_amount: `${t.cents > 0 ? "+" : t.cents < 0 ? "-" : ""}${money(Math.abs(t.cents), t.currency)}`,
        display_balance_after: money(t.balance_after, t.currency),
        created_at: t.created_at,
      }),
    ),
  };
}

function accountLabel(store: string | null, id: number) {
  const a = accounts(store).find((x) => x.id === id);
  return a ? { id, label: `${a.provider_name} — ${a.account_name}`, account_number: a.account_number } : { id, label: "حساب محذوف", account_number: "—" };
}

function withdrawalView(store: string | null, w: WithdrawalRow): Withdrawal {
  return {
    id: w.id,
    currency: w.currency,
    amount: decimal(w.cents),
    display_amount: money(w.cents, w.currency),
    status: w.status,
    payout_account: accountLabel(store, w.payout_account_id),
    created_at: w.created_at,
    decided_at: w.decided_at,
    rejection_reason: w.rejection_reason,
  };
}

export function listWithdrawals(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const currency = params.get("currency");
  const rows = [...walletState(store).withdrawals]
    .filter((w) => !status || w.status === status)
    .filter((w) => !currency || w.currency === currency)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { count, results } = page(rows, params);
  return { count, results: results.map((w) => withdrawalView(store, w)) };
}

export function createWithdrawal(store: string | null, body: Body): MockResult<{ id: number; status: WithdrawalStatus }> {
  const e: Record<string, string[]> = {};
  const currency = body.currency as Currency;
  if (!(CURRENCY_LIST as readonly string[]).includes(String(body.currency))) e.currency = ["اختر عملة."];
  const amount = typeof body.amount === "string" ? body.amount.trim() : "";
  if (!isDecimal(amount) || !/^\d+(\.\d{1,2})?$/.test(amount) || compareDecimal(amount, "0") <= 0) e.amount = ["أدخل مبلغاً موجباً بخانتين عشريتين على الأكثر."];
  const account = accounts(store).find((a) => a.id === Number(body.payout_account_id));
  if (!account) e.payout_account_id = ["اختر حساب الاستلام."];
  else if (!account.is_active) e.payout_account_id = ["هذا الحساب معطّل؛ اختر حساباً نشطاً."];
  if (!e.currency && !e.amount) {
    const s = walletState(store);
    const available = decimal(Math.max(0, s.balances[currency] - reserved(s, currency)));
    if (compareDecimal(amount, available) > 0) e.amount = [`المبلغ أكبر من المتاح للسحب (${money(toCents(available), currency)}).`];
  }
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const row: WithdrawalRow = {
    id: nextId(store, "withdrawal", 45),
    currency,
    cents: toCents(addDecimal(amount, "0")),
    status: "pending",
    payout_account_id: account!.id,
    created_at: new Date().toISOString(),
    decided_at: null,
    rejection_reason: null,
  };
  walletState(store).withdrawals.push(row);
  return { ok: true, data: { id: row.id, status: row.status }, status: 201 };
}

/** Exposed for M20 (platform owner) when it lands: approve debits the ledger, reject releases the reserve. */
export function decideWithdrawal(store: string | null, id: number, decision: "approved" | "rejected", reason: string | null = null): MockResult<Withdrawal> {
  const s = walletState(store);
  const w = s.withdrawals.find((x) => x.id === id);
  if (!w) return { ok: false, status: 404, body: { detail: "الطلب غير موجود." } };
  if (w.status !== "pending") return { ok: false, status: 409, body: { detail: "تم البتّ في هذا الطلب مسبقاً." } };
  w.status = decision;
  w.decided_at = new Date().toISOString();
  w.rejection_reason = decision === "rejected" ? reason : null;
  if (decision === "approved") {
    s.balances[w.currency] -= w.cents;
    s.ledger.push({
      id: (s.ledger.at(-1)?.id ?? 7000) + 1,
      type: "withdrawal",
      currency: w.currency,
      reason: "سحب إلى حساب التاجر",
      reference: { kind: "withdrawal", id: w.id, label: `طلب سحب #${w.id}` },
      cents: -w.cents,
      balance_after: s.balances[w.currency],
      created_at: w.decided_at,
    });
  }
  return { ok: true, data: withdrawalView(store, w) };
}

// ── Platform dues ────────────────────────────────────────────────────────────────────
/** The platform's `commission_enabled` flag — on for `noor` (M14 brief), off elsewhere. */
export function commissionEnabled(store: string | null): boolean {
  return store === "noor";
}

function seedDues(store: string | null): Due[] {
  if (isEmptyStore(store)) return [];
  const s = walletState(store);
  const dues: Due[] = [];
  const statusFor = (i: number): DueStatus => (i < 3 ? "pending" : i === 7 ? "waived" : "collected");
  s.ledger
    .filter((t) => t.type === "commission")
    .reverse()
    .forEach((t, i) => {
      const status = statusFor(i);
      dues.push({
        id: t.reference!.id,
        kind: "commission",
        status,
        title: "عمولة طلب مدفوع إلكترونياً",
        detail: "2.5% من قيمة الطلب",
        reference: { kind: "order", id: s.ledger.find((x) => x.type === "order_payment" && Math.abs(Date.parse(x.created_at) - Date.parse(t.created_at)) <= 60_000)?.reference?.id ?? 0, label: "" },
        display_amount: money(Math.abs(t.cents), "SAR"),
        created_at: t.created_at,
        settled_at: status === "pending" ? null : t.created_at,
      });
    });
  for (const d of dues) if (d.reference) d.reference.label = `طلب #${d.reference.id}`;
  const apps: Array<[string, string, number, DueStatus, number]> = [
    ["تطبيق رسائل واتساب", "اشتراك شهري — أكتوبر", 4900, "pending", 3],
    ["تطبيق رسائل واتساب", "اشتراك شهري — سبتمبر", 4900, "collected", 33],
    ["فواتير ضريبية", "1,200 فاتورة إضافية", 1800, "collected", 21],
    ["تطبيق التقييمات", "اشتراك شهري — سبتمبر", 2900, "waived", 30],
  ];
  apps.forEach(([title, detail, cents, status, days], i) =>
    dues.push({
      id: 900 + i,
      kind: "app_charge",
      status,
      title,
      detail,
      reference: null,
      display_amount: money(cents, "SAR"),
      created_at: iso(days * DAY),
      settled_at: status === "pending" ? null : iso((days - 1) * DAY),
    }),
  );
  return dues;
}

function duesState(store: string | null): Due[] {
  return storeState(store, "payments:dues", () => seedDues(store));
}

export function listDues(store: string | null, params: URLSearchParams): DuesResponse {
  const kind: DueKind = params.get("kind") === "app_charge" ? "app_charge" : "commission";
  const status = params.get("status");
  const enabled = kind === "commission" ? commissionEnabled(store) : true;
  const ofKind = enabled ? duesState(store).filter((d) => d.kind === kind) : [];
  const sum = (st: DueStatus) => ofKind.filter((d) => d.status === st).reduce((acc, d) => addDecimal(acc, d.display_amount.replace(/[^\d.]/g, "")), "0");
  const rows = ofKind.filter((d) => !status || d.status === status).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { count, results } = page(rows, params);
  return {
    commission_enabled: commissionEnabled(store),
    totals: {
      pending: displayMoney(Number(sum("pending")), "SAR"),
      collected: displayMoney(Number(sum("collected")), "SAR"),
      waived: displayMoney(Number(sum("waived")), "SAR"),
    },
    counts: {
      pending: ofKind.filter((d) => d.status === "pending").length,
      collected: ofKind.filter((d) => d.status === "collected").length,
      waived: ofKind.filter((d) => d.status === "waived").length,
    },
    count,
    results,
  };
}

