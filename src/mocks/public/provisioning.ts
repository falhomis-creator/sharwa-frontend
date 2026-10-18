import type { ProvisioningStatus } from "@/lib/schemas/provisioning";
import { buildStoreUrl } from "@/lib/tenant";
import { registeredStatus, registeredStoreByToken } from "@/mocks/public/register";

/**
 * `GET /register/status/<token>/` fixture (M47 US-47.3, M02).
 *
 * Deterministic by token prefix so a screenshot of any state is reproducible
 * (constitution IV — a progressing fixture cannot be captured):
 *   `pend…` → pending · `prov…` → provisioning · `ready…` → ready · `fail…` → failed ·
 *   `gone…` → `null` (unknown or expired token → 404, M02 §8)
 * A token issued by the mocked wizard (`verifyOtpMock`) advances its own store
 * pending → provisioning → ready, two calls per stage, and answers with THAT store's
 * origin. Any other token advances the same way against `store` (M47 behaviour).
 */
const progress = new Map<string, number>();

export function provisioningMock(
  token: string,
  opts: { store?: string | null; baseDomain: string; port?: string | null; protocol?: "http" | "https" } = {
    baseDomain: "localhost",
  },
): ProvisioningStatus | null {
  const t = token.toLowerCase();
  if (t.startsWith("gone")) return null;

  const registered = registeredStoreByToken(token);
  if (registered) {
    registered.polls += 1;
    const status = registeredStatus(registered.polls);
    if (status !== "ready") return { status };
    const origin = buildStoreUrl(registered.subdomain, opts.baseDomain, { protocol: opts.protocol, port: opts.port });
    return { status, store_url: origin, dashboard_url: `${origin}/dashboard` };
  }

  const store = opts.store ?? "noor";
  // The port comes from the live request: a fixture that hard-codes :3000 sends the
  // merchant to a dead origin whenever the app runs anywhere else (a production build on
  // :3100, say) — which is exactly how the first run of `tenant-shell-check` failed.
  const origin = buildStoreUrl(store, opts.baseDomain, { protocol: opts.protocol, port: opts.port });
  const ready: ProvisioningStatus = {
    status: "ready",
    store_url: origin,
    dashboard_url: `${origin}/dashboard`,
  };

  if (t.startsWith("pend")) return { status: "pending" };
  if (t.startsWith("prov")) return { status: "provisioning" };
  if (t.startsWith("ready")) return ready;
  if (t.startsWith("fail")) return { status: "failed" };

  const n = (progress.get(token) ?? 0) + 1;
  progress.set(token, n);
  if (n <= 2) return { status: "pending" };
  if (n <= 4) return { status: "provisioning" };
  return ready;
}
