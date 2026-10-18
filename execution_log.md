# Execution log — Phase 3C · M02 Onboarding Wizard (T061–T067)

**Date:** 2026-10-18 · **Branch:** `master` · **Base:** `57a5da8` · **Restore point:** `rp/13-onboarding-before`
**Status:** T061–T066 done. T067 gates pass. **No commit and no `*-after` tag**: both are held for owner review, as the directive asked.

---

## T061 — Restore point

```
$ git commit -am "chore: prepare for 3C and fix PPR status codes" || true
On branch master
nothing to commit, working tree clean
$ git tag -a rp/13-onboarding-before -m "Before M02 Onboarding"
$ git show --no-patch --format='%h %s' rp/13-onboarding-before
57a5da8 feat(tenant,dashboard): M47 tenant guard + M03 dashboard shell and overview
```

The tree was clean, so the commit was a no-op. The tag points to `57a5da8`, the same commit as `rp/12-tenant-shell-after`. It's logged in `.specify/memory/restore-points.md`.

**The approved PPR fix was NOT applied.** Measured against `node_modules/next/dist/docs` for Next 16.4.2:

- Both `experimental.ppr` and the per-segment `experimental_ppr` are **removed** (`migrating-to-cache-components.md` §`experimental_ppr`). Next 16.4 can't disable PPR "for the tenant layout" alone.
- The only remaining lever is the global `cacheComponents: false`. That would break `"use cache"` + `cacheLife`/`cacheTag` in `src/features/landing/api/{plans,stats}.ts` and `site-footer.tsx` (M01), `partialPrefetching: true`, and the `export const instant` segment exports in 3B. It is a cross-module R-02 change, outside M02's scope.
- **Owner decision needed:** go global (and migrate M01 caching to `unstable_cache`/`fetch` caching), or accept the measured 3B deviation (correct status in dev and on RSC requests, while the production document returns 200 with `Retry-After`).

---

## T062 — Schemas + content

- `src/features/onboarding/schemas.ts`
  - `registrationDraftSchema`: exactly the `TenantRegistrationForm` fields (FR-02.02). The store name is 3–100 characters with the verbatim message «اسم المتجر من 3 إلى 100 حرف». The phone is normalized and must match `^(967|966)\d{9}$`. The subdomain uses the shared `validateSubdomain`, so the four reasons are verbatim. Consent is required.
  - Response schemas: `marketCategoriesSchema`, `checkSubdomainSchema` (Django omits `reason` when the name is available), `registerResponseSchema`, `verifyResponseSchema`, `resendResponseSchema`.
- `src/features/onboarding/onboarding.content.ts`: every visible string, the three FR-02.08 headings verbatim (emoji removed), and the terms text. Numeric sentences are split into `before`/`after` parts so every number renders in `<Mono>`.
- `src/features/onboarding/handoff.ts`: the `sharwa_prov` cookie helpers, the single localStorage key (FR-02.09), and `firstEntryUrl()`.

## T063 — Mocks + BFF handlers

| Adapter | Mode |
|---|---|
| `GET /api/bff/public/market-categories` | target `/api/v1/public/market-categories/` → mock |
| `POST /api/bff/public/register` | target → mock (400 `{field:[msg]}`, taken phone `967770000011`, taken subdomain) |
| `POST /api/bff/public/register/verify-otp` | target → mock (400 wrong code · 410 expired · 429 after 5 wrong codes, 60s · uniqueness re-checked) + sets `sharwa_prov` |
| `POST /api/bff/public/register/resend-otp` | target → mock (429 within 30s or after 3 sends) |
| `GET /api/bff/public/provisioning/[token]` (existing) | `gone…` / unknown → 404 `{detail}`; clears `sharwa_prov` on `ready` |

- The shared `target → mock` helper is in `src/lib/bff/target-adapter.ts`. Django on :8000 returns 404 for the four `[NEEDS BACKEND]` routes, so the mock answers with `x-sharwa-mock: 1`. `check-subdomain` remains the real legacy Django answer.
- **Decision: a wizard registry on `globalThis`** (`src/mocks/public/register.ts`). `tenantFixture()` consults it, so `<new>.localhost` returns 503 + token while provisioning and a zinc-default store once `ready`. The session mock reads the real name, and the overview mock treats the store as empty. Reason: route handlers and Server Components get separate module copies in one process; without the registry, the redirect after `ready` lands on the 404 guard. The fixture code is the single documented `MOCK_OTP_CODE` (`123456`).

API smoke test (curl, literal):

```
--- register bad      {"store_name":["اسم المتجر من 3 إلى 100 حرف"],"merchant_phone":["رقم واتساب غير صحيح"],"subdomain":["محجوز للنظام"],"agree_terms":["يجب الموافقة على الشروط"]}
--- register taken    {"merchant_phone":["هذا الرقم مرتبط بمتجر"]}
--- resend <30s       HTTP/1.1 429 · retry-after: 29 · {"detail":"محاولات كثيرة، حاول بعد 29 ثانية"}
--- verify wrong      HTTP/1.1 400 · {"code":["الرمز غير صحيح"]}
--- verify ok         set-cookie: sharwa_prov=st-…; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax
--- store before      307 http://smoke284.localhost:3000/_tenant/provisioning
--- polls             pending, pending, provisioning, provisioning, ready (+ set-cookie: sharwa_prov=; Max-Age=0)
--- store after       200
--- gone token        HTTP/1.1 404 · {"detail":"لم نجد طلب التأسيس هذا."}
```

## T064 — Panel 01 `/register`

`src/app/(onboarding)/register/{layout,page}.tsx`, `features/onboarding/components/{register-form,wizard-steps}.tsx`, `hooks/use-subdomain-check.ts`, `src/stores/onboarding.ts`.

- **Frame:** one 480px column with a text wordmark (no emoji, I-ب) and an `01 / 02 / 03` Mono counter. On desktop, the opposite column explains the steps with large Mono numerals.
- **Live check:** local rules first (reserved names make no network request), then a TanStack query on a 400ms-debounced value. The query consumes `signal`, so a superseded request is aborted. The result shows inside the field: «جارٍ الفحص» / «متاح» in `text-success` / the verbatim reason. A network failure shows «سيُفحص عند الإرسال» and still allows submitting. A `{sub}.{base}` Mono LTR preview sits under the field.
- **Other fields:** the phone is `dir="ltr"` + `inputMode="numeric"`, with a normalized Mono hint. The name auto-suggests a Latin subdomain until the subdomain field is edited. Category chips are 44px on mobile, show a skeleton while loading, and are hidden silently on error. Consent opens a terms dialog. The submit button is sticky on mobile.
- **State:** Zustand persisted to **sessionStorage** with `skipHydration`, so the first render matches the server. Nothing personal ever appears in a URL.
- **Decision:** consent is not part of the disabled-button rule. US-02.1 ("disabled until valid") and US-02.1.3 ("pressing without consent focuses the box") contradict each other, so the button waits for the three fields and the consent box is checked on submit.
- **Decision:** a server field error keeps the button disabled until that field is edited, even if the live check says «متاح».

## T065 — Panel 02 `/register/verify`

`register/verify/page.tsx`, `components/otp-form.tsx`.

- Six cells in an LTR grid. The sixth digit auto-submits; pasting six digits fills the cells; Backspace and arrow keys move between cells.
- A Mono TTL countdown is derived from `expires_at`, so a reload doesn't reset it. At 00:00 the cells are disabled and «إرسال رمز جديد» is the only action.
- Error handling:
  - 400 → «الرمز غير صحيح» and the cells clear.
  - 410 → the expired state.
  - 429 → a live «محاولات كثيرة، حاول بعد N ثانية» countdown with the cells (or resend) locked.
  - A uniqueness rejection → back to panel 01, with the message on its field and the other values kept.
  - A network error → keeps the values and offers one retry button.
- On success, the BFF sets `sharwa_prov`; the client stores `{token, store_name, masked_phone}` (no full number) and drops the draft.
- **Bugs found and fixed during verification:**
  1. A race: clearing the session triggered the "no session → /register" effect before the status navigation landed. Fixed with a `verifiedToken` field in the store; a revisit to `/verify` after success now goes to the status page.
  2. Next 16 keeps visited routes mounted but hidden (`<Activity>`, see `preserving-ui-state.md`). The OTP panel is now keyed by `otp_token`, so a lockout or expired state can't leak into a new registration. Panel 01 subscribes to `draftErrors` so a returning server error lands even though the form doesn't remount.

## T066 — Panel 03 `/register/status/[token]`

`register/status/[token]/page.tsx`, `components/registration-status.tsx`. Changed: `features/tenant/components/provisioning-poller.tsx`.

- The poll engine was extracted into `useProvisioningPoll` with two policies:
  - `store` (M47): unchanged behaviour, except a 404 token now falls back to the visitor path, as the T051 comment intended.
  - `platform` (M02): 3s; 15s while `failed`; exponential backoff up to 30s on errors; 404 is final.
- **Pre-existing M47 bug fixed:** «تحقق من اتصالك» could never appear, because with `retry:false` TanStack resets `failureCount` on every fetch. Consecutive failures are now counted by the hook.
- **Screens:**
  - Waiting: «جارٍ تجهيز متجرك {name}», text steps, one status dot, Mono elapsed time, the quiet 90s line, and «نحاول الاتصال…» with the last successful check.
  - Failed: the heading, the masked number in Mono, and WhatsApp support; polling continues.
  - Unknown token: «لم نجد طلب التأسيس هذا» + «ابدأ من جديد».
- **Decision:** `ready` shows the verbatim heading, both buttons and a copyable Mono link, then a visible 5-second countdown to `dashboard_url/setup-password?t=<token>`. This combines US-02.4.1 (buttons) with T066 (auto-redirect). A new store has no password, so the bare `dashboard_url` would bounce to login (US-02.6). Copying the link pauses the redirect. `ready` also clears the localStorage entry and the cookie.

## T067 — Quality gates

```
$ npm run lint            → exit 0
$ npx tsc --noEmit        → exit 0
```

**tsc caveat (pre-existing, not 3C code):** `tsconfig` includes both `.next/types` (from `next build`/`typegen`, route `/_d/[store]/dashboard`) and `.next/dev/types` (from `next dev`, route `/%5Fd/[store]/dashboard`). When both exist they conflict (TS2344 in `validator.ts`). This comes from the approved `%5F` folders. I deleted the stale build copy (regenerated output). A permanent fix, such as including only one folder, is for the owner to decide.

**Functional check:** `npx tsx scripts/onboarding-check.ts 3000`. **33 checks passed, 0 console errors**, re-confirmed on a cold server on :3200.

```
Timing: OTP accepted after 7.5s, dashboard after 30.7s      (budget ≤ 60s)
✓ onboarding check passed
```

It covers: the `?store_name=` prefill · the `nourshop` suggestion · submit disabled · no scroll at 1440×900 · `www` rejected with no request · `My-Store` · the name-length message · the Mono-normalized number · consent focus · no personal data in any URL · 6 cells · wrong code · paste + auto-submit · the `sharwa_prov` HttpOnly cookie on `<base>` · localStorage without the number · waiting → ready headings · the entry cleared at ready · auto-redirect to the store's `/dashboard/setup-password?t=` · the cookie cleared · setting a password → the new store's dashboard · `x-sharwa-mock: 1` · 429 · TTL expiry (Playwright clock) · the uniqueness race back to panel 01 · a direct visit to `/verify`.

**Visual check:** `scripts/visual-check.ts`. **All pass** (0 console errors, 0 horizontal overflow, every target ≥ 44px on mobile). `docs/visual-checks/02-onboarding/` holds 25 screenshots:

- Form: desktop · tablet · mobile · desktop-dark · mobile-dark
- Waiting, ready, failed, not-found: desktop · mobile · mobile-dark each
- From the flow script: form errors · form filled · server error · OTP (desktop, mobile) · 429 · expired · first-entry dashboard

Fixed during visual review:

- Touch targets: the subdomain input and the copy button were 42px, and the ready-panel links were 22px (`flex-1` in a column sets `flex-basis: 0`).
- The status divider was on the wrong side (`border-s` resolved inside `dir="rtl"`).
- A duplicate global `:focus-visible` ring on the subdomain input.
- The OTP cells hugged the left edge; they now span the column.

**M47/M03 regression:** `scripts/tenant-shell-check.ts`. 8/8 on :3000. On a cold :3200 server, `M03 §6 — [ يطوي الشريط` failed in one run out of two, with zero diff under `dashboard-shell/` and `stores/shell.ts`. The script presses `[` 250ms after navigation without waiting for hydration. This is a pre-existing test race, left untouched (out of scope).

**Environment notes:**

- The :3000 dev server (started outside this session) stopped near the end of the run. I started a temporary `next dev -p 3200` for the final regression, then stopped it, and the port is free.
- One stale Turbopack SSR module after rewriting `provisioning-poller.tsx` caused a transient 500 that cleared after a recompile.

**Not done (stop rule):** the T067 commit and the `rp/13-onboarding-after` tag. T067 is left unchecked in `tasks.md` for that reason.
