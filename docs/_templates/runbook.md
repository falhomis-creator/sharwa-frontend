<!--
TEMPLATE — Track 3 runbook (English). Copy to docs/ops/runbooks/<procedure>.md (or docs/ops/<area>/…).
Rules: every command copy-pasteable and tested in a dry run (DOC-532); Windows (cmd/PowerShell)
and Linux variants where they differ; no secrets — use placeholders like <SCHEMA>, <CODE>.
Delete these comments.
-->

# Runbook — <procedure name>

> **Source**: DOC-XXX · inventory A.x · INT-0xx
> **Owner**: fares · **Last dry run**: YYYY-MM-DD (environment: dev / staging)

## When to use

The trigger: what situation or request starts this procedure.

## Impact and risk

What changes, who notices, whether it can be undone, and the expected duration.

## Prerequisites

- Access: …
- Services running: Django, PostgreSQL, Redis, Celery worker + Beat, Next.js …
- Values to have ready: `<SCHEMA>`, …

## Steps

1. Description.

   ```bash
   command --with <PLACEHOLDER>
   ```

   ```bat
   :: Windows cmd variant (e.g. set X=y&& command)
   ```

   Expected output: …

2. …

## Verify

How to confirm it worked: a command, a URL, a log line, or an API call with its expected response.

## Roll back

Exact steps to undo it, or "not reversible", and what to do instead.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|

## Related
