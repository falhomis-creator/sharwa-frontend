import type { MockResult } from "@/lib/bff/mock-route";
import { addDecimal, compareDecimal, isDecimal } from "@/lib/decimal";
import { displayMoney, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { ordersState } from "@/mocks/orders/state";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";

/**
 * Customer `Wallet` (SAR only, keyed by phone) + `WalletTransaction` (append-only) +
 * `CustomerPoints` (discovery 02 §5, §12) — shared by M35 (the merchant's wallets screens),
 * M07 (the customer profile's wallet/points tabs) and the storefront checkout (M12 pays
 * with `use_wallet`). Seeded from the order fixture, so wallets belong to real customers.
 */
export const WALLET_REASONS = ["manual_topup", "refund", "reward", "order_payment", "adjustment", "loyalty_redeem"] as const;
export type WalletReason = (typeof WALLET_REASONS)[number];
export const WALLET_REASON_LABELS: Record<WalletReason, string> = {
  manual_topup: "تعبئة يدوية",
  refund: "استرجاع",
  reward: "مكافأة",
  order_payment: "دفع طلب",
  adjustment: "تسوية",
  loyalty_redeem: "استبدال نقاط",
};
/** The reasons a merchant may pick by hand (M35 FR-35.03); the rest are written by the system. */
export const MANUAL_WALLET_REASONS = ["manual_topup", "reward", "adjustment"] as const;

export interface MockWallet {
  id: number;
  customer_phone: string;
  customer_name: string;
  balance: string;
  is_active: boolean;
  created_at: string;
}

export interface MockWalletTransaction {
  id: number;
  wallet_id: number;
  amount: string; // signed decimal
  reason: WalletReason;
  note: string | null;
  reference: { type: "order" | "refund"; id: number; label: string } | null;
  balance_after: string;
  actor: string;
  created_at: string;
}

export interface MockPoints {
  customer_phone: string;
  balance: number;
}

export interface MockPointsTransaction {
  id: number;
  customer_phone: string;
  type: "earn" | "redeem";
  points: number;
  order_id: number | null;
  wallet_transaction_id: number | null;
  created_at: string;
}

interface WalletsState {
  wallets: MockWallet[];
  transactions: MockWalletTransaction[];
  points: MockPoints[];
  pointsTransactions: MockPointsTransaction[];
}

const at = (daysAgo: number, hour = 11) => new Date(FIXTURE_NOW - daysAgo * 86_400_000 + (hour - 20) * 3_600_000).toISOString();

function seed(store: string | null): WalletsState {
  const state: WalletsState = { wallets: [], transactions: [], points: [], pointsTransactions: [] };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 35);
  const orders = ordersState(store).orders;
  // Distinct customers, oldest first, so wallet ids are stable.
  const customers = new Map<string, { name: string; orders: typeof orders }>();
  for (const o of [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const c = customers.get(o.customer_phone);
    if (c) c.orders.push(o);
    else customers.set(o.customer_phone, { name: o.customer_name, orders: [o] });
  }
  let wid = 0;
  let tid = 0;
  let pid = 0;
  let i = 0;
  for (const [phone, c] of customers) {
    i++;
    // Every third customer has a wallet; every second has points.
    if (i % 3 === 0 && state.wallets.length < 40) {
      wid++;
      const wallet: MockWallet = { id: wid, customer_phone: phone, customer_name: c.name, balance: "0.00", is_active: wid !== 7, created_at: at(200 - wid * 3) };
      const txs: MockWalletTransaction[] = [];
      let balance = "0.00";
      const push = (amount: string, reason: WalletReason, daysAgo: number, reference: MockWalletTransaction["reference"], actor: string, note: string | null = null) => {
        balance = addDecimal(balance, amount);
        tid++;
        txs.push({ id: tid, wallet_id: wallet.id, amount, reason, note, reference, balance_after: balance, actor, created_at: at(daysAgo, 9 + (tid % 9)) });
      };
      push((50 + Math.floor(rnd() * 20) * 10).toFixed(2), "manual_topup", 180 - wid, null, "فارس العمري", "رصيد ترحيبي");
      const last = c.orders.at(-1)!;
      if (c.orders.length > 1 || wid % 2 === 0) push(`-${(20 + Math.floor(rnd() * 8) * 5).toFixed(2)}`, "order_payment", 120 - wid, { type: "order", id: c.orders[0]!.id, label: `#${c.orders[0]!.id}` }, "النظام");
      if (wid % 4 === 0) push((30 + Math.floor(rnd() * 5) * 10).toFixed(2), "refund", 60 - wid, { type: "refund", id: last.id, label: `استرجاع #${last.id}` }, "النظام");
      if (wid % 5 === 0) push("25.00", "reward", 30, null, "فارس العمري", "تعويض تأخير التوصيل");
      if (wid % 6 === 0) push("-15.00", "adjustment", 12, null, "فارس العمري", "تصحيح تعبئة مكررة");
      if (wid % 3 === 0) {
        push("10.00", "loyalty_redeem", 8, null, "النظام");
        pid++;
        state.pointsTransactions.push({ id: pid, customer_phone: phone, type: "redeem", points: 100, order_id: null, wallet_transaction_id: tid, created_at: at(8, 14) });
      }
      wallet.balance = balance;
      state.wallets.push(wallet);
      state.transactions.push(...txs);
    }
    if (i % 2 === 0 && state.points.length < 60) {
      let bal = 0;
      for (const o of c.orders.slice(-3)) {
        const earned = Math.max(1, Math.round(o.lines.reduce((s, l) => s + Number(l.price) * Number(l.quantity), 0) / 10));
        bal += earned;
        pid++;
        state.pointsTransactions.push({ id: pid, customer_phone: phone, type: "earn", points: earned, order_id: o.id, wallet_transaction_id: null, created_at: o.created_at });
      }
      const redeemed = state.pointsTransactions.filter((t) => t.customer_phone === phone && t.type === "redeem").reduce((s, t) => s + t.points, 0);
      state.points.push({ customer_phone: phone, balance: Math.max(0, bal - redeemed) });
    }
  }
  state.transactions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  state.pointsTransactions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return state;
}

export function walletsState(store: string | null): WalletsState {
  return storeState(store, "wallets", () => seed(store));
}

export const walletMoney = (amount: string | number) => displayMoney(Number(amount), "SAR");

export function walletByPhone(store: string | null, phone: string): MockWallet | undefined {
  return walletsState(store).wallets.find((w) => w.customer_phone === phone);
}

export function walletById(store: string | null, id: number): MockWallet | undefined {
  return walletsState(store).wallets.find((w) => w.id === id);
}

export function walletTransactions(store: string | null, walletId: number): MockWalletTransaction[] {
  return walletsState(store).transactions.filter((t) => t.wallet_id === walletId);
}

/** `POST /api/v1/customers/wallets/` `{customer_phone, customer_name?}` → 201 / 400 (exists). */
export function createWallet(store: string | null, phone: string, name: string | null): MockResult<MockWallet> {
  const state = walletsState(store);
  if (!/^9(66|67)\d{8,9}$/.test(phone)) return { ok: false, status: 400, body: { customer_phone: ["رقم الهاتف غير صالح."] } };
  if (state.wallets.some((w) => w.customer_phone === phone)) return { ok: false, status: 400, body: { customer_phone: ["توجد محفظة لهذا الرقم."] } };
  const fromOrders = ordersState(store).orders.find((o) => o.customer_phone === phone);
  const wallet: MockWallet = {
    id: nextId(store, "wallets", 1000),
    customer_phone: phone,
    customer_name: name?.trim() || fromOrders?.customer_name || "عميل",
    balance: "0.00",
    is_active: true,
    created_at: new Date().toISOString(),
  };
  state.wallets.unshift(wallet);
  return { ok: true, data: wallet, status: 201 };
}

/**
 * Append a transaction — the ONLY way a balance changes (append-only ledger, M35 FR-35.05).
 * Manual reasons come from the merchant (M35 US-35.2); the system reasons from orders/refunds.
 */
export function appendWalletTransaction(
  store: string | null,
  walletId: number,
  input: { amount: string; reason: WalletReason; note?: string | null; reference?: MockWalletTransaction["reference"]; actor: string; idempotency_key?: string },
): MockResult<{ wallet: MockWallet; transaction: MockWalletTransaction }> {
  const state = walletsState(store);
  const wallet = state.wallets.find((w) => w.id === walletId);
  if (!wallet) return { ok: false, status: 404, body: { detail: "المحفظة غير موجودة." } };
  if (!wallet.is_active) return { ok: false, status: 400, body: { detail: "المحفظة معطّلة." } };
  if (!isDecimal(input.amount) || Number(input.amount) === 0) return { ok: false, status: 400, body: { amount: ["أدخل مبلغاً غير صفري."] } };
  if (input.idempotency_key) {
    const seen = storeState(store, "wallets:idempotency", () => new Map<string, number>());
    const prior = seen.get(input.idempotency_key);
    if (prior) {
      const tx = state.transactions.find((t) => t.id === prior)!;
      return { ok: true, data: { wallet, transaction: tx } };
    }
  }
  const next = addDecimal(wallet.balance, input.amount);
  if (compareDecimal(next, "0") < 0) return { ok: false, status: 400, body: { amount: ["المبلغ يتجاوز رصيد المحفظة."] } };
  if (Number(input.amount) < 0 && !(input.note && input.note.trim())) return { ok: false, status: 400, body: { note: ["الملاحظة مطلوبة عند الخصم."] } };
  wallet.balance = next;
  const tx: MockWalletTransaction = {
    id: nextId(store, "wallet-tx", 5000),
    wallet_id: wallet.id,
    amount: input.amount,
    reason: input.reason,
    note: input.note?.trim() || null,
    reference: input.reference ?? null,
    balance_after: next,
    actor: input.actor,
    created_at: new Date().toISOString(),
  };
  state.transactions.unshift(tx);
  if (input.idempotency_key) storeState(store, "wallets:idempotency", () => new Map<string, number>()).set(input.idempotency_key, tx.id);
  return { ok: true, data: { wallet, transaction: tx } };
}

export function pointsByPhone(store: string | null, phone: string): { balance: number; transactions: MockPointsTransaction[] } {
  const state = walletsState(store);
  return {
    balance: state.points.find((p) => p.customer_phone === phone)?.balance ?? 0,
    transactions: state.pointsTransactions.filter((t) => t.customer_phone === phone),
  };
}

// ── M35 read models (`/api/v1/customers/wallets/*`, `/api/v1/loyalty/points/*`) ──────────

const digitsOf = (q: string) => q.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, "").replace(/^(00|\+)/, "");

/** Phone search accepts the local form (`0777…`) and matches the normalised number (M35 §8). */
function phoneMatches(phone: string, q: string): boolean {
  const d = digitsOf(q);
  if (d.length < 3) return false;
  const local = d.startsWith("0") ? d.slice(1) : d;
  return phone.includes(local) || phone.includes(d);
}

function nameMatches(name: string, q: string): boolean {
  const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();
  return norm(name).includes(norm(q));
}

export function walletListItem(store: string | null, w: MockWallet) {
  const txs = walletTransactions(store, w.id);
  return {
    id: w.id,
    customer_phone: w.customer_phone,
    customer_name: w.customer_name,
    display_balance: walletMoney(w.balance),
    is_active: w.is_active,
    last_transaction_at: txs[0]?.created_at ?? null,
    transactions_count: txs.length,
  };
}

export function walletDetailView(store: string | null, w: MockWallet) {
  const points = walletsState(store).points.find((p) => p.customer_phone === w.customer_phone);
  return { ...walletListItem(store, w), created_at: w.created_at, points: points ? { balance: points.balance } : null };
}

export function transactionView(t: MockWalletTransaction) {
  const positive = Number(t.amount) >= 0;
  return {
    id: t.id,
    amount: t.amount,
    display_amount: `${positive ? "+" : "-"}${walletMoney(Math.abs(Number(t.amount)))}`,
    reason: t.reason,
    note: t.note,
    reference: t.reference,
    display_balance_after: walletMoney(t.balance_after),
    actor: t.actor,
    created_at: t.created_at,
  };
}

/** `GET /api/v1/customers/wallets/?q&sort&page&page_size` */
export function listWallets(store: string | null, params: URLSearchParams) {
  const state = walletsState(store);
  const q = (params.get("q") ?? "").trim();
  const sort = params.get("sort") ?? "last_transaction_at";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size")) || 50));
  let rows = state.wallets.map((w) => walletListItem(store, w));
  if (q) rows = rows.filter((r) => phoneMatches(r.customer_phone, q) || nameMatches(r.customer_name, q));
  rows.sort((a, b) =>
    sort === "balance"
      ? compareDecimal(state.wallets.find((w) => w.id === b.id)!.balance, state.wallets.find((w) => w.id === a.id)!.balance)
      : (b.last_transaction_at ?? "").localeCompare(a.last_transaction_at ?? ""),
  );
  const sum = state.wallets.reduce((s, w) => addDecimal(s, w.balance), "0.00");
  return {
    count: rows.length,
    totals: { display_balance_sum: walletMoney(sum), active_count: state.wallets.filter((w) => w.is_active).length },
    results: rows.slice((page - 1) * pageSize, page * pageSize),
  };
}

/** `GET /api/v1/customers/wallets/<id>/transactions/?reason&from&to&page` */
export function listWalletTransactions(store: string | null, walletId: number, params: URLSearchParams) {
  const reason = params.get("reason");
  const from = params.get("from");
  const to = params.get("to");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size")) || 50));
  let rows = walletTransactions(store, walletId);
  if (reason) rows = rows.filter((t) => t.reason === reason);
  if (from) rows = rows.filter((t) => t.created_at.slice(0, 10) >= from);
  if (to) rows = rows.filter((t) => t.created_at.slice(0, 10) <= to);
  return { count: rows.length, results: rows.slice((page - 1) * pageSize, page * pageSize).map(transactionView) };
}

/** `GET /api/v1/loyalty/points/?q&page` — read-only (US-35.5). */
export function listPoints(store: string | null, params: URLSearchParams) {
  const state = walletsState(store);
  const q = (params.get("q") ?? "").trim();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size")) || 50));
  const orders = ordersState(store).orders;
  let rows = state.points.map((p) => {
    const wallet = state.wallets.find((w) => w.customer_phone === p.customer_phone);
    const name = wallet?.customer_name ?? orders.find((o) => o.customer_phone === p.customer_phone)?.customer_name ?? "عميل";
    const lastEarn = state.pointsTransactions.find((t) => t.customer_phone === p.customer_phone && t.type === "earn");
    return { customer_phone: p.customer_phone, customer_name: name, balance: p.balance, last_earn_at: lastEarn?.created_at ?? null, has_wallet: Boolean(wallet), wallet_id: wallet?.id ?? null };
  });
  if (q) rows = rows.filter((r) => phoneMatches(r.customer_phone, q) || nameMatches(r.customer_name, q));
  rows.sort((a, b) => b.balance - a.balance);
  return { count: rows.length, results: rows.slice((page - 1) * pageSize, page * pageSize) };
}

/** `GET /api/v1/loyalty/points/<phone>/transactions/?type&page` */
export function listPointsTransactions(store: string | null, phone: string, params: URLSearchParams) {
  const type = params.get("type");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size")) || 50));
  const { balance, transactions } = pointsByPhone(store, phone);
  const rows = type ? transactions.filter((t) => t.type === type) : transactions;
  return {
    balance,
    count: rows.length,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((t) => ({ id: t.id, type: t.type, points: t.points, order_id: t.order_id, wallet_transaction_id: t.wallet_transaction_id, created_at: t.created_at })),
  };
}
