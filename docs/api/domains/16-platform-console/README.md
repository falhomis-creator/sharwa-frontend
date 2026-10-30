# Platform owner console — لوحة مالك المنصة

> Domain 16 — modules M20, M45, M46.

> The roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Pages

| Page | DOC | Task | Status |
|---|---|---|---|
| [`auth.md`](auth.md) | DOC-021 | Document platform console authentication | Written (Step 03) |
| [`m20-console.md`](m20-console.md) | DOC-266, DOC-267, DOC-268, DOC-269, DOC-270, DOC-271, DOC-272, DOC-273 | Document console authentication and roles (`platform/auth/login|logout|me`); Document the console overview, stores list and clients (`overview/`, `stores/`, `clients/`); Document store re-provisioning (`stores/reprovision/`); Document store detail and the per-store Sharwa Ship toggle (`stores/<schema>/`, `stores/<schema>/sharwa-ship/`); Document per-store features, domains and deactivation; Document the feature catalogue, resolution and overrides; Document the carrier webhook dead-letter queue (`webhook-events/`, `<id>/retry|discard/`); Document M20 migrations, robustness, BFF wiring and tests | Written (Step 40) |
| [`m45-dues-sharwa-pay-admin.md`](m45-dues-sharwa-pay-admin.md) | DOC-274, DOC-275, DOC-276, DOC-277, DOC-278 | Document platform dues overview and per-store dues detail (`dues/overview/`, `dues/<schema>/`); Document dues actions (`dues/<schema>/actions/`); Document Sharwa Pay top-up review (`sharwa-pay/topups/`, `<id>/approve|reject/`); Document Sharwa Pay withdrawals review and wallet lookup; Document Sharwa Ship zone administration (`sharwa-ship/zones/`, `<id>/`) | Written (Step 40 + Step 41) |
| [`m46-plans-billing.md`](m46-plans-billing.md) | DOC-279, DOC-280, DOC-281, DOC-282, DOC-283 | Document plans (`plans/`, `plans/<id>/`); Document the plan × feature matrix and subscriptions (`plan-features/`, `subscriptions/`, `subscriptions/assign/`); Document billing settings and the auto-assignment of the free plan (`billing-settings/`); Document platform apps and app billing overrides (`apps/`, `apps/<code>/`, `app-billing-overrides/`); Document market categories (`market-categories/`, `reorder/`, `<id>/`) | Written (Step 41) |

Back to the [documentation home](../../../README.md).
