# Documentation tools

> **Source**: DOC-533 · DOC-534 · DOC-536 (official Step 52, 2026-10-30)

Three Python 3 scripts that keep `docs/` correct. Standard library only — nothing to install. Run them from the `sharwa-frontend` folder; each prints a one-line summary and exits `1` when something is wrong, so they can run in CI (option A of [`../ops/testing/ci.md`](../ops/testing/ci.md) §8).

| Script | Task | What it does |
|---|---|---|
| `check_links.py` | DOC-534 | Every relative link and image in `docs/**/*.md` resolves; every `#fragment` matches a GitHub heading slug or an `<a id>`. Uncaptured screenshots are listed as *pending* (`--list-pending`). |
| `check_terms.py` | DOC-534 | Rules T1–T9: live keys and `.env.example` parity, module ids, permission keys, plan-feature codes, `format_money` examples, UI words in the Arabic guides, `{#id}` anchors, fixture-only phone numbers, secrets. |
| `coverage.py` | DOC-533 | Rebuilds [`../_coverage.md`](../_coverage.md) from the roadmap, the inventory, the pages and `.env.example`. `--check` only verifies (no write). |
| `allow.json` | — | Accepted exceptions for `check_terms.py`: `{rule, file, text, reason}`. Every entry needs a reason a reviewer accepts. |

```bash
python docs/_tools/check_links.py
python docs/_tools/check_terms.py
python docs/_tools/coverage.py          # then commit docs/_coverage.md
```

Results of the Step 52 run and the fixes they led to: [`../_verification.md`](../_verification.md). The rule that makes them part of every change: [`../README.md#maintenance`](../README.md#maintenance).
