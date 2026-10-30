# Page templates

> Source: DOC-004 (Step 01). Every documentation page starts from one of these templates ([docs/README.md §5.1](../README.md#51-templates)).

| Template | Use for | Language | Destination |
|---|---|---|---|
| [`api-endpoint.md`](api-endpoint.md) | Track 1 — one module / endpoint-group page, or an overview topic | English | `docs/api/domains/NN-<slug>/`, `docs/api/overview/`, `docs/api/integrators/` |
| [`guide-page.md`](guide-page.md) | Track 2 — one task-oriented user page | Arabic (RTL) | `docs/guides/<audience>/NN-<slug>/` |
| [`architecture-page.md`](architecture-page.md) | Track 3 — component, data model, job, security or integrity page | English | `docs/architecture/`, `docs/architecture/data-model/`, `docs/architecture/jobs/` |
| [`runbook.md`](runbook.md) | Track 3 — an operational procedure with steps, verification and rollback | English | `docs/ops/runbooks/`, `docs/ops/deployment/`, `docs/ops/migrations/`, `docs/ops/testing/` |

The section structure follows the inventory's entry shape: *Before · Django provider · Routes & payloads · Gates · Rules · Mapping · Gaps closed / migrations · Bugs fixed · Frontend · Tests · Out of scope / open*. Each template lays that shape out for its audience.

Links and image paths inside the templates are placeholders (`<audience>`, `<NN-slug>`, `<page>`). The Track 4 link checker (DOC-534) excludes `docs/_templates/`.
