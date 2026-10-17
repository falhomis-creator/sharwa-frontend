import { env } from "@/env";

/** Platform origin (`<base>`), used for links that must leave a store host. */
export function platformOrigin(): string {
  const base = env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
  return base === "localhost" ? "http://localhost:3000" : `https://${base}`;
}
