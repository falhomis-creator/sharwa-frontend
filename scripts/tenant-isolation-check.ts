/**
 * T191 — automated tenant isolation (SC-009, M47 FR-47.09). ONE Next process, TEN stores
 * hit in rotation and in parallel bursts; every response must carry its own store and no
 * other:
 *   - `GET /api/bff/dashboard/me` (merchant session) → `store_name` + `store_host` of THAT host;
 *   - `GET /` (storefront HTML) → contains its own store name and none of the other nine.
 * A cache key or a module-level variable that leaks across tenants shows up as a store
 * answering with a neighbour's name, usually only under concurrency — hence the bursts.
 *
 * The ten stores are the two storefront fixtures (`noor`, `shop`) plus eight stores this script
 * registers through the mocked M02 wizard (register → verify-otp → provisioning polls until
 * `ready`), so every one of them has a live storefront AND a dashboard session.
 *
 * Requests go to 127.0.0.1 with an explicit `Host` header, so no `*.localhost` DNS is needed.
 *
 *   npx tsx scripts/tenant-isolation-check.ts [port] [rounds]   (default 3000, 5)
 */
import { request } from "node:http";

const PORT = Number(process.argv[2] ?? 3000);
const ROUNDS = Number(process.argv[3] ?? 5);
const BASE = "localhost";
const RUN = Date.now().toString(36).slice(-5);
const LETTERS = ["alif", "baa", "taa", "thaa", "jeem", "haa", "khaa", "dal"];
const WIZARD = LETTERS.map((l, i) => ({ sub: `iso${RUN}${i}`, name: `متجر العزل ${l} ${RUN}`, phone: `7773${RUN.replace(/\D/g, "").padEnd(3, "0").slice(0, 3)}${String(i).padStart(2, "0")}` }));
/** Ten stores: the two storefront fixtures + eight wizard-provisioned ones. */
const STORES = ["noor", "shop", ...WIZARD.map((w) => w.sub)];

const failures: string[] = [];
function check(ok: boolean, label: string) {
  if (!ok) {
    failures.push(label);
    console.log(`✗ ${label}`);
  }
}

function send(hostLabel: string | null, method: string, path: string, opts: { cookie?: string; json?: unknown } = {}): Promise<{ status: number; body: string }> {
  const host = `${hostLabel ? `${hostLabel}.` : ""}${BASE}:${PORT}`;
  const payload = opts.json === undefined ? undefined : JSON.stringify(opts.json);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port: PORT,
        path,
        method,
        headers: {
          host,
          origin: `http://${host}`,
          accept: path.startsWith("/api/") ? "application/json" : "text/html",
          ...(opts.cookie ? { cookie: opts.cookie } : {}),
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    req.on("error", reject);
    req.setTimeout(60_000, () => req.destroy(new Error(`timeout ${host}${path}`)));
    req.end(payload);
  });
}

const get = (store: string, path: string, cookie?: string) => send(store, "GET", path, { cookie });

/** M02 wizard on the platform origin: register → OTP 123456 → poll until `ready`. */
async function provision(w: (typeof WIZARD)[number]) {
  const reg = await send(null, "POST", "/api/bff/public/register", { json: { store_name: w.name, merchant_phone: w.phone, subdomain: w.sub, interested_categories: [], agree_terms: true } });
  if (reg.status !== 200) throw new Error(`register ${w.sub}: ${reg.status} ${reg.body.slice(0, 160)}`);
  const { otp_token } = JSON.parse(reg.body) as { otp_token: string };
  const ver = await send(null, "POST", "/api/bff/public/register/verify-otp", { json: { otp_token, code: "123456" } });
  if (ver.status !== 200) throw new Error(`verify ${w.sub}: ${ver.status} ${ver.body.slice(0, 160)}`);
  const { status_token } = JSON.parse(ver.body) as { status_token: string };
  for (let i = 0; i < 10; i++) {
    const st = await send(null, "GET", `/api/bff/public/provisioning/${status_token}`);
    if ((JSON.parse(st.body) as { status?: string }).status === "ready") return;
  }
  throw new Error(`provisioning ${w.sub}: never ready`);
}

const MERCHANT = "sharwa_mock_session=merchant";

async function me(store: string) {
  const r = await get(store, "/api/bff/dashboard/me", MERCHANT);
  const json = JSON.parse(r.body) as { store_name?: string; store_host?: string };
  return { status: r.status, name: json.store_name ?? "", host: json.store_host ?? "" };
}

async function main() {
  for (const w of WIZARD) await provision(w);
  console.log(`provisioned ${WIZARD.length} stores through the wizard (${WIZARD.map((w) => w.sub).join(", ")})`);
  // Warm-up (dev compiles on first hit) and the reference name of each store.
  const names = new Map<string, string>();
  for (const s of STORES) {
    const r = await me(s);
    check(r.status === 200, `${s}: /dashboard/me answers 200 (${r.status})`);
    names.set(s, r.name);
  }
  const distinct = new Set(names.values());
  check(distinct.size === STORES.length, `10 stores resolve to 10 distinct names (${[...distinct].join(" · ")})`);

  let calls = 0;
  for (let round = 0; round < ROUNDS; round++) {
    // Rotation, serial: noor → shop → … → techy.
    for (const s of STORES) {
      const r = await me(s);
      calls++;
      check(r.name === names.get(s) && r.host.startsWith(`${s}.`), `round ${round} serial: ${s} answered «${r.name}» @ ${r.host}`);
    }
    // Burst: all ten at once, shuffled, twice over.
    const burst = [...STORES, ...STORES].sort(() => Math.random() - 0.5);
    const results = await Promise.all(burst.map(async (s) => ({ s, r: await me(s) })));
    calls += results.length;
    for (const { s, r } of results) check(r.name === names.get(s) && r.host.startsWith(`${s}.`), `round ${round} burst: ${s} answered «${r.name}» @ ${r.host}`);
  }

  // Storefront HTML: own name present, the nine others absent (in parallel).
  const pages = await Promise.all(STORES.map(async (s) => ({ s, r: await get(s, "/") })));
  for (const { s, r } of pages) {
    calls++;
    const own = names.get(s)!;
    const others = STORES.filter((o) => o !== s).map((o) => names.get(o)!).filter((n) => n && r.body.includes(n));
    check(r.status === 200, `${s}: storefront 200 (${r.status})`);
    check(r.body.includes(own), `${s}: storefront HTML carries its own name «${own}»`);
    check(others.length === 0, `${s}: storefront HTML carries no other store's name (${others.join(", ")})`);
  }

  console.log(`\n${calls} tenant-scoped responses across ${STORES.length} stores, ${ROUNDS} rounds`);
  if (failures.length) {
    console.log(`✗ ${failures.length} isolation failure(s)`);
    process.exit(1);
  }
  console.log("✓ tenant isolation: every response carried its own store (SC-009)");
}

void main();
