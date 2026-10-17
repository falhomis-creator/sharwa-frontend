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

## Quality gates (before any `rp/*-after` tag)

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run visual-check -- --slug 01-landing --url http://localhost:3000/
```

Screenshots land in `docs/visual-checks/<slug>/`. See `specs/001-sharwa-frontend-platform/quickstart.md` for the full validation scenarios and the «استعادة» restore protocol.
