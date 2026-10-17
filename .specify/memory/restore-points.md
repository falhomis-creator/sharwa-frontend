# Restore Points — نقاط الاستعادة (الدستور III)

> كل سطر: التاريخ · الوسم · الوصف · لقطات الفحص البصري (إن وُجدت). الوسوم سجل دائم؛ يُمنع حذفها أو `push --force`.
> بروتوكول «استعادة»: `git stash push -u -m "wip-before-restore-<ts>"` ثم `git reset --hard <tag>` (الافتراضي: آخر وسم `*-before` للمرحلة الجارية)، ثم إعادة الفحص البصري وإبلاغ المالك.

| Date | Tag | Description | Visual checks |
|---|---|---|---|
| 2026-10-17 | `rp/00-constitution-after` | ratify constitution v1.0.0 + read-only backend discovery notes | n/a (docs) |
| 2026-10-17 | `rp/00-specify-after` | feature 001 master spec + 49 module specs + SpecKit scaffolding + shadcn base-nova | n/a (docs) |
| 2026-10-17 | `rp/00-plan-after` | `/speckit-plan`: plan.md, research.md, data-model.md, contracts/ (3 + generated inventory), quickstart.md; `components.json.rtl=true`; button regenerated with logical classes; remaining packages installed (R-06) | n/a (no UI yet) |
| 2026-10-17 | `rp/01-foundation-before` | tasks.md generated (194 tasks); state before Phase 1 Setup (tokens, fonts, RTL root, env, lint rules, visual-check) | n/a |
| 2026-10-17 | `rp/01-foundation-after` | Phase 1 Setup: zinc tokens in globals.css, self-hosted IBM Plex Sans Arabic + Geist Mono (next/font/local), RTL root + next-themes, env schema (t3-env), ESLint constitution guards, shadcn base components (rtl), scripts/visual-check.ts; lint+tsc pass; Principle I review: 0 violations | `docs/visual-checks/01-foundation/{desktop,tablet,mobile,desktop-dark}.png` |
| 2026-10-17 | `rp/02-core-before` | same commit as 01-foundation-after; state before Phase 2 Foundational (tenant resolver, proxy.ts, BFF, api-client, providers, shared components, mocks runtime) | n/a |
