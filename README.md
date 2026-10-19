# Sharwa Frontend — واجهة منصة «شروه»

Standalone Next.js 16 (App Router) frontend for the Sharwa multi-tenant e-commerce SaaS. Headless client over the existing Django backend (read-only, never modified from here).

- Governance: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
- Spec & plan: [`specs/001-sharwa-frontend-platform/`](specs/001-sharwa-frontend-platform/) (spec, 49 module specs, plan, research, data-model, contracts, quickstart, tasks)
- Restore points: [`.specify/memory/restore-points.md`](.specify/memory/restore-points.md)

## Run

```bash
npm install
cp .env.example .env.local   # then edit if needed
npm run dev
```

| URL | Group |
|---|---|
| `http://localhost:3000/` | `(marketing)` landing |
| `http://localhost:3000/register` | `(onboarding)` |
| `http://noor.localhost:3000/` | `(storefront)` for store `noor` |
| `http://noor.localhost:3000/dashboard` | `(dashboard)` |
| `http://console.localhost:3000/` | `(admin)` |

## Quality gates (every phase, before you commit)

```bash
npm run lint                                   # includes sharwa/tenant-cache-key (FR-47.09)
rm -rf .next/types && npx tsc --noEmit
npx tsx scripts/rtl-audit.ts                   # constitution II: logical classes, mirrored icons
npx tsx scripts/anti-ai-audit.ts               # constitution I-ب on every restrained surface
npx tsx scripts/needs-backend-inventory.ts --check
```

With `npm run dev` (or `npm start`) on a port:

```bash
npx tsx scripts/tenant-isolation-check.ts 3000          # SC-009: 10 stores, serial + parallel bursts
SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/<module>-check.ts 3000   # one per module, see scripts/
npm run visual-check -- --slug 01-landing --url http://localhost:3000/
```

Screenshots land in `docs/visual-checks/<slug>/`; the Principle I review is `docs/visual-checks/ANTI-AI-AUDIT.md`; Lighthouse JSON in `docs/lighthouse/`.

## Generated docs

| File | Regenerate with |
|---|---|
| `specs/001-sharwa-frontend-platform/contracts/needs-backend-inventory.md` | `npx tsx scripts/needs-backend-inventory.ts` (from §7 of every module spec + owner-decision additions) |
| `docs/DELIVERY-REPORT.md` | `npx tsx scripts/delivery-report.ts` |

See `specs/001-sharwa-frontend-platform/quickstart.md` for the full validation scenarios and the «استعادة» restore protocol. Restore points are commits (linear history, no tags since Phase 5).
