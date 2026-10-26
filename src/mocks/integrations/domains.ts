import type { MockResult } from "@/lib/bff/mock-route";
import { domainFormatError, type DnsRecord, type Domain } from "@/features/integrations/schemas";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";

/**
 * M19 domains `[NEEDS BACKEND]` (`Domain` is admin-only today). The subdomain row is derived
 * from `<store>.<TENANT_BASE_DOMAIN>`; custom rows live per store. Each «تحقّق الآن» advances
 * `pending_dns → verifying → active` (and `failed → verifying`); anything ending in
 * `.invalid` fails, so the check script can prove every state (FR-19.02, SC-19.2).
 */
type Row = Omit<Domain, "kind">;
interface State {
  custom: Row[];
}

const SUBDOMAIN_ID = 0; // Django parity (INT-023): custom claims are ≥ 1
const EDGE_TARGET = "edge.sharwa.app";
const EDGE_IP = "76.76.21.21";
/** Domains already linked to another store on the platform (§8). */
const TAKEN = ["alnoor.com", "shop.alnoor.com"];

const iso = (msAgo: number) => new Date(FIXTURE_NOW - msAgo).toISOString();
const HOUR = 3_600_000;

function token(domain: string, store: string | null): string {
  let h = seedOf(store);
  for (const ch of domain) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return `sharwa-verify=${h.toString(16).padStart(8, "0")}${(h ^ 0x5bd1e995).toString(16).padStart(8, "0")}`;
}

function isApex(domain: string): boolean {
  const labels = domain.split(".");
  if (labels.length === 2) return true;
  // `example.com.sa` / `example.com.ye` style second-level suffixes.
  return labels.length === 3 && ["com", "net", "org"].includes(labels[1]!) && labels[2]!.length === 2;
}

/** The records the server asks for — different for an apex and a subdomain (FR-19.03). */
function recordsFor(domain: string, store: string | null): DnsRecord[] {
  const verify: DnsRecord = { type: "TXT", name: isApex(domain) ? "_sharwa" : `_sharwa.${domain.split(".")[0]}`, value: token(domain, store) };
  if (isApex(domain)) return [{ type: "A", name: "@", value: EDGE_IP }, verify];
  return [{ type: "CNAME", name: domain.split(".").slice(0, -2).join("."), value: EDGE_TARGET }, verify];
}

function seed(store: string | null): State {
  if (isEmptyStore(store)) return { custom: [] };
  const name = store ?? "store";
  const mk = (id: number, domain: string, status: Row["status"], extra: Partial<Row> = {}): Row => ({
    id,
    domain,
    is_primary: false,
    status,
    dns_ok: status === "active",
    dns_records: recordsFor(domain, store),
    failure_reason: null,
    next_step: null,
    verified_at: status === "active" ? iso(30 * 24 * HOUR) : null,
    last_checked_at: iso(2 * HOUR),
    created_at: iso(40 * 24 * HOUR),
    ...extra,
  });
  return {
    custom: [
      mk(2, `${name}-store.com`, "active"),
      mk(3, `shop.${name}-store.com`, "pending_dns", { created_at: iso(5 * HOUR), last_checked_at: iso(HOUR) }),
    ],
  };
}

function state(store: string | null): State {
  return storeState(store, "integrations:domains", () => seed(store));
}

function subdomainRow(store: string | null, base: string, primary: boolean): Domain {
  return {
    id: SUBDOMAIN_ID,
    domain: `${store ?? "store"}.${base}`,
    is_primary: primary,
    kind: "subdomain",
    status: "active",
    dns_ok: true,
    dns_records: [],
    failure_reason: null,
    next_step: null,
    verified_at: null,
    last_checked_at: null,
    created_at: iso(90 * 24 * HOUR),
  };
}

export function listDomains(store: string | null, base: string) {
  const s = state(store);
  const customPrimary = s.custom.some((d) => d.is_primary);
  return {
    base_domain: base,
    results: [subdomainRow(store, base, !customPrimary), ...s.custom.map((d): Domain => ({ ...d, kind: "custom" }))],
  };
}

function view(d: Row): Domain {
  return { ...d, kind: "custom" };
}

export function addDomain(store: string | null, base: string, body: Record<string, unknown>): MockResult<Domain> {
  const domain = String(body.domain ?? "").trim().toLowerCase().replace(/\.$/, "");
  const formatError = domainFormatError(domain, base);
  if (formatError) return { ok: false, status: 400, body: { domain: [formatError] } };
  const s = state(store);
  if (s.custom.some((d) => d.domain === domain)) return { ok: false, status: 400, body: { domain: ["هذا النطاق مضاف لمتجرك بالفعل."] } };
  if (TAKEN.includes(domain)) return { ok: false, status: 400, body: { domain: ["هذا النطاق مرتبط بمتجر آخر."] } };
  if (s.custom.length >= 5) return { ok: false, status: 400, body: { detail: "وصلت إلى الحد الأقصى (5 نطاقات مخصصة)." } };
  const row: Row = {
    id: nextId(store, "domain", 10),
    domain,
    is_primary: false,
    status: "pending_dns",
    dns_ok: false,
    dns_records: recordsFor(domain, store),
    failure_reason: null,
    next_step: null,
    verified_at: null,
    last_checked_at: null,
    created_at: new Date().toISOString(),
  };
  s.custom.push(row);
  return { ok: true, status: 201, data: view(row) };
}

function find(store: string | null, id: number): Row | undefined {
  return state(store).custom.find((d) => d.id === id);
}

const notFound = { ok: false as const, status: 404, body: { detail: "النطاق غير موجود." } };

export function verifyDomain(store: string | null, id: number): MockResult<Domain> {
  if (id === SUBDOMAIN_ID) return { ok: false, status: 400, body: { detail: "النطاق الفرعي يعمل دائماً ولا يحتاج تحققاً." } };
  const d = find(store, id);
  if (!d) return notFound;
  d.last_checked_at = new Date().toISOString();
  if (d.status === "active") return { ok: true, data: view(d) };
  if (d.domain.endsWith(".invalid")) {
    d.status = "failed";
    d.dns_ok = false;
    d.failure_reason = `لم نجد سجل ${d.dns_records[0]?.type ?? "DNS"} المطلوب لـ ${d.domain} عند مزوّد النطاق.`;
    d.next_step = "أضف السجلات أعلاه كما هي عند مزوّد النطاق، انتظر حتى ساعة لانتشارها، ثم اضغط «تحقّق الآن».";
    return { ok: true, data: view(d) };
  }
  if (d.status === "pending_dns" || d.status === "failed") {
    d.status = "verifying";
    d.dns_ok = true;
    d.failure_reason = null;
    d.next_step = null;
  } else if (d.status === "verifying") {
    d.status = "active";
    d.verified_at = new Date().toISOString();
  }
  return { ok: true, data: view(d) };
}

export function setPrimaryDomain(store: string | null, id: number): MockResult<Domain | { id: number; is_primary: true }> {
  const s = state(store);
  if (id === SUBDOMAIN_ID) {
    s.custom.forEach((d) => (d.is_primary = false));
    return { ok: true, data: { id, is_primary: true } };
  }
  const d = find(store, id);
  if (!d) return notFound;
  if (d.status !== "active") return { ok: false, status: 400, body: { detail: "لا يصير النطاق أساسياً قبل أن يكون نشطاً." } };
  s.custom.forEach((x) => (x.is_primary = x.id === id));
  return { ok: true, data: view(d) };
}

export function deleteDomain(store: string | null, id: number): MockResult<null> {
  if (id === SUBDOMAIN_ID) return { ok: false, status: 400, body: { detail: "النطاق الفرعي لا يُحذف." } };
  const s = state(store);
  const d = find(store, id);
  if (!d) return notFound;
  if (d.is_primary) return { ok: false, status: 400, body: { detail: "لا يُحذف النطاق الأساسي — اجعل نطاقاً آخر أساسياً أولاً." } };
  s.custom = s.custom.filter((x) => x.id !== id);
  return { ok: true, status: 204, data: null };
}
