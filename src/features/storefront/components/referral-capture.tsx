"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";

/**
 * M17 FR-17.03 — an affiliate's share link is `<store origin>/?aff_id=<code>` (any page works).
 * On arrival the code goes to `POST /api/bff/storefront/referral` once per tab session: Django counts
 * the click and sets the HttpOnly `sharwa_aff` cookie the checkout attributes the order with. No
 * client code touches `document.cookie`; `sessionStorage` only avoids re-posting on every navigation
 * (Django dedupes by the cookie anyway). Inert in the dashboard's theme preview frame (`?preview=1`).
 */
const SEEN_KEY = "sharwa_aff_seen";
const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/;
const resultSchema = z.object({ recorded: z.boolean() });

export function ReferralCapture() {
  const pathname = usePathname();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("aff_id")?.trim() ?? "";
    if (!code || !CODE_RE.test(code) || params.get("preview") === "1") return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY) === code) return;
      window.sessionStorage.setItem(SEEN_KEY, code);
    } catch {
      // Storage blocked (private mode): post anyway — Django's cookie check prevents a double click.
    }
    void apiFetch("/api/bff/storefront/referral", resultSchema, { method: "POST", json: { code } }).catch(() => undefined);
  }, [pathname]);
  return null;
}
