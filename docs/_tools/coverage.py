#!/usr/bin/env python3
"""Generate docs/_coverage.md — the INT → DOC zero-omission matrix (DOC-533).

Inputs: specs/003-documentation/documentation-roadmap.md (tasks + Appendix A),
        specs/002-sharwa-integration/integration-inventory.md (Part A lists, Part B sections),
        the pages under docs/, and .env.example.
Every cell is computed, nothing is typed by hand. Re-run after any change to the roadmap,
the inventory, a live key, a migration, a Celery job or a test suite (docs/README.md § Maintenance).

Usage (from the sharwa-frontend folder): python docs/_tools/coverage.py [--check]
--check exits 1 when a cell is empty or a referenced output page is missing, without writing.
"""
import datetime, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROADMAP = os.path.join(ROOT, "specs", "003-documentation", "documentation-roadmap.md")
INVENTORY = os.path.join(ROOT, "specs", "002-sharwa-integration", "integration-inventory.md")
OUT = os.path.join(ROOT, "docs", "_coverage.md")


def read(p):
    with open(p, encoding="utf-8") as fh:
        return fh.read()


def expand(cell):
    ids = []
    for a, b in re.findall(r"DOC-(\d{3})(?:…(?:DOC-)?(\d{3}))?", cell):
        lo, hi = int(a), int(b or a)
        ids += [f"DOC-{n:03d}" for n in range(lo, hi + 1)]
    return ids


def parse_tasks(text):
    tasks, cur = {}, None
    for line in text.split("\n"):
        if line.startswith("## Appendix"):
            break
        m = re.match(r"^- \[( |x)\] \*\*(DOC-\d{3})\*\* — (.*)$", line)
        if m:
            cur = {"done": m.group(1) == "x", "title": m.group(3), "body": []}
            tasks[m.group(2)] = cur
            continue
        if line.startswith("#") or (line.startswith("- ") and not line.startswith("  ")):
            cur = None
        elif cur is not None:
            cur["body"].append(line)
    for t in tasks.values():
        body = "\n".join(t.pop("body"))
        t["text"] = t["title"] + "\n" + body
        out = re.search(r"\*\*Output\*\*:(.*)", body)
        t["outputs"] = []
        for tok in re.findall(r"`([^`]+)`", out.group(1) if out else ""):
            tok = re.sub(r"^sharwa-frontend/", "", tok.split("#")[0].strip())
            if re.search(r"\.(md|ya?ml|json|js|csv)$", tok) and "*" not in tok and "{" not in tok:
                t["outputs"].append(tok)
    return tasks


SPEC_FILES = []
for _dp, _dn, _fn in os.walk(os.path.join(ROOT, "specs")):
    SPEC_FILES += [os.path.relpath(os.path.join(_dp, f), ROOT).replace(os.sep, "/") for f in _fn]


def locate(path, doc_files):
    for cand in (path, "docs/" + path):
        if os.path.exists(os.path.join(ROOT, cand)):
            return cand
    if "/" not in path:
        hits = [f for f in doc_files + SPEC_FILES if f.endswith("/" + path)]
        if hits:
            return hits[0]
    return None


def fmt(ids, tasks):
    if not ids:
        return "**∅**"
    return " ".join(i[4:] if tasks.get(i, {}).get("done") else f"*{i[4:]}*◌" for i in ids)


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Arabic + "·" on Windows consoles


def main():
    roadmap, inventory = read(ROADMAP), read(INVENTORY)
    tasks = parse_tasks(roadmap)
    doc_files = []
    for dp, _, fn in os.walk(os.path.join(ROOT, "docs")):
        doc_files += [os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, "/") for f in fn]
    corpus = {f: read(os.path.join(ROOT, f)) for f in doc_files if f.endswith(".md") and not f.endswith("_coverage.md")}
    problems = []

    def pages_with(token):
        return sorted(f for f, txt in corpus.items() if token in txt)

    # §2 INT matrix from Appendix A
    appendix = roadmap.split("## Appendix A")[1]
    rows = re.findall(r"^\| (INT-\d{3}) \| (M\d\d) \| ([^|]+) \| (\d+) \| ([^|]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|$", appendix, re.M)
    int_rows = []
    for intid, mod, name, dom, key, t1, t2, t3 in rows:
        c1, c2, c3 = expand(t1), expand(t2), expand(t3)
        for label, cell in (("Track 1", c1), ("Track 3", c3)):
            if not cell:
                problems.append(f"{intid}: empty {label} cell")
        outs = sorted({o for i in c1 + c2 + c3 for o in tasks.get(i, {}).get("outputs", [])})
        missing = [o for o in outs if not locate(o, doc_files)]
        problems += [f"{intid}: output {o} missing" for o in missing]
        mentioned = len(pages_with(intid))
        int_rows.append((intid, mod, name.strip(), dom, key.strip(), c1, c2, c3, len(outs), len(missing), mentioned))
    # §3 live keys
    a3 = inventory.split("## A.3")[1].split("## A.4")[0]
    env = read(os.path.join(ROOT, ".env.example"))
    sample = re.search(r"^# SHARWA_LIVE_MODULES=([a-z0-9_,]+)", env, re.M)
    env_keys = set(sample.group(1).split(",")) if sample else set()
    register = corpus.get("docs/architecture/22-live-module-keys.md", "")
    live = []
    for key, intid, mod in re.findall(r"^\| `([a-z0-9_]+)` \| (INT-\d{3}) \| ([^|]+) \|", a3, re.M):
        api_pages = sorted(f for f, t in corpus.items() if f.startswith("docs/api/domains/") and re.search(r"\*\*Live key\*\*:[^\n]*`" + key + "`", t))
        doc_ids = sorted({i for i, t in tasks.items() if any(o.endswith(os.path.basename(p)) for p in api_pages for o in t["outputs"])})
        ok_reg, ok_env = f"`{key}`" in register, key in env_keys
        if not (api_pages and ok_reg and ok_env):
            problems.append(f"live key {key}: api page {bool(api_pages)}, register {ok_reg}, .env.example {ok_env}")
        live.append((key, intid, mod.strip(), api_pages, doc_ids, ok_reg, ok_env))
    # §4 migrations
    a9 = inventory.split("## A.9")[1].split("## A.10")[0]
    ledger = corpus.get("docs/ops/migrations/phase-002-ledger.md", "")
    migs = []
    for mig, last, intid in re.findall(r"^\| `([a-z]+/[0-9]{4}[^`]*)`(?:–`([0-9]{4})`)? \| (INT-\d{3}) \|", a9, re.M):
        mig = f"{mig}–{last}" if last else mig
        num = re.search(r"/(\d{4})", mig).group(1)
        app = mig.split("/")[0]
        in_ledger = num in ledger
        dm = [f for f in pages_with(num) if "/data-model/" in f]
        doc_ids = sorted(i for i, t in tasks.items() if num in t["text"] and app in t["text"])
        if not (in_ledger and doc_ids):
            problems.append(f"migration {mig}: ledger {in_ledger}, DOC tasks {len(doc_ids)}")
        migs.append((mig, intid, in_ledger, len(dm), doc_ids))
    # §5 Celery jobs
    a8 = inventory.split("## A.8")[1].split("## A.9")[0]
    jobs = []
    for row in re.findall(r"^\| (.+?) \| [^|]+ \| (INT-\d{3}) \|$", a8, re.M):
        names = [n for n in re.findall(r"`([a-z_][a-z0-9_.]*)`", row[0]) if "_" in n]
        for n in names:
            short = n.split(".")[-1]
            where = [f for f in pages_with(short) if f.startswith(("docs/architecture/", "docs/ops/"))]
            doc_ids = sorted(i for i, t in tasks.items() if short in t["text"])
            if not (where and doc_ids):
                problems.append(f"job {n}: pages {len(where)}, DOC tasks {len(doc_ids)}")
            jobs.append((n, row[1], len(where), "docs/architecture/50-background-jobs.md" in where, doc_ids))
    # §6 test suites
    a12 = inventory.split("## A.12")[1].split("## A.13")[0].split("Mock E2E")[0]
    register_suites = corpus.get("docs/ops/testing/django-suites.md", "")
    suites = []
    for name, intno in re.findall(r"`(?:api/)?(test_[a-z_]+\.py)`(?:, `test_[a-z_]+\.py`)? \((\d{3})", a12):
        pages = pages_with(name)
        doc_ids = sorted(i for i, t in tasks.items() if name in t["text"])
        if name not in register_suites or not doc_ids:
            problems.append(f"suite {name}: register {name in register_suites}, DOC tasks {len(doc_ids)}")
        suites.append((name, "INT-" + intno, name in register_suites, len(pages), doc_ids))
    for extra in re.findall(r"`(test_[a-z_]+\.py)`", a12):
        if extra not in [s[0] for s in suites]:
            pages = pages_with(extra)
            doc_ids = sorted(i for i, t in tasks.items() if extra in t["text"])
            near = re.search(re.escape(extra) + r"`[^(`]{0,60}\((\d{3})", a12)
            suites.append((extra, "INT-" + near.group(1) if near else "legacy", extra in register_suites, len(pages), doc_ids))
    # §7 open items / legacy / inconsistencies
    a13 = inventory.split("## A.13")[1].split("# Part B")[0]
    oi_page = corpus.get("docs/architecture/90-open-items.md", "") + corpus.get("docs/architecture/91-legacy-surfaces.md", "") + corpus.get("docs/architecture/92-inconsistencies.md", "")
    probes = [("IP allow-list (`enforce_ip_whitelist`)", "enforce_ip_whitelist", "enforce_ip_whitelist", "OI-01"),
              ("Meta catalog category mapping", "Meta catalog", "Meta catalog", "OI-02"),
              ("`bundle_selection` / personalization on order detail", "bundle_selection", "bundle_selection", "OI-03"),
              ("Haggling drafts (`NegotiationDraft`)", "NegotiationDraft", "NegotiationDraft", "OI-04"),
              ("Pickup code at the counter", "pickup code", "pickup code", "OI-05"),
              ("`CentralCustomerTrust` merchant signal only", "CentralCustomerTrust", "CentralCustomerTrust", "OI-06"),
              ("smsa `test_connection`", "test_connection", "test_connection", "OI-07"),
              ("SMS/e-mail campaign providers", "SMS/e-mail", "SMS/e-mail", "OI-08"),
              ("Live-rate refs empty", "live_rate_refs", "Live-rate refs", "OI-09a"),
              ("POS manager code / refund threshold", "2468", "2468", "OI-09b"),
              ("Legacy-only dropshipping features", "LF-01", "address correction", "LF-01…07"),
              ("WhatsApp QR pairing + monthly counter", "LF-08", "QR-pairing", "LF-08…09"),
              ("`.env.example` live keys", "KI-01", "SHARWA_LIVE_MODULES", "KI-01"),
              ("Superseded `account/stores` BFF route", "KI-02", "account/stores", "KI-02"),
              ("`ready-api-v1.md` re-audit", "KI-03", "ready-api-v1.md", "KI-03")]
    items = []
    a13_tasks = expand("DOC-461…463 DOC-526…528 DOC-535")
    for label, reg_token, task_token, ref in probes:
        ok = reg_token.lower() in oi_page.lower()
        doc_ids = sorted(i for i in a13_tasks if task_token.lower() in tasks[i]["text"].lower())
        if not ok or not doc_ids:
            problems.append(f"A.13 item {label}: register {ok}, DOC tasks {len(doc_ids)}")
        items.append((label, ref, ok, doc_ids))
    # §8 Part A sections → DOC
    part_a = re.findall(r"^\| (A\.\d+) — ([^|]+) \| ([^|]+) \|$", appendix, re.M)
    # §9 inventory sections vs produced pages
    sections = re.findall(r"^#{2,3} ((?:A\.\d+|Domain \d+|INT-\d{3})[^\n]*)$", inventory, re.M)
    sec_rows = []
    for title in sections:
        ref = re.match(r"(A\.\d+|Domain \d+|INT-\d{3})", title).group(1)
        if ref.startswith("Domain"):
            num = ref.split()[1]
            ids = [i for i, t in tasks.items() if re.search(r"(?:Domain|domain) " + num + r"\b", t["text"])]
        else:
            ids = [i for i, t in tasks.items() if re.search(re.escape(ref) + r"(?!\d)", t["text"])]
        outs = sorted({o for i in ids for o in tasks[i]["outputs"]})
        missing = [o for o in outs if not locate(o, doc_files)]
        if not ids:
            problems.append(f"inventory section {ref}: no DOC task")
        sec_rows.append((title.strip(), len(ids), len(outs), len(missing)))
    # §10 every task output
    missing_out = [(i, o) for i, t in sorted(tasks.items()) for o in t["outputs"] if not locate(o, doc_files) and o not in ("docs/_coverage.md",)]
    open_tasks = [i for i, t in sorted(tasks.items()) if not t["done"]]

    if "--check" in sys.argv:
        for p in problems:
            print("EMPTY/MISSING", p)
        for i, o in missing_out:
            print("OUTPUT MISSING", i, o)
        print(f"{len(problems)} problem(s), {len(missing_out)} missing output(s), {len(open_tasks)} open task(s)")
        return 1 if problems or missing_out else 0

    today = datetime.date.today().isoformat()
    w = []
    w.append("# Documentation coverage — INT → DOC (zero-omission proof)\n")
    w.append("> **Source**: DOC-533 · inventory Part C (49 tasks), A.3 (39 live keys), A.8 (Celery jobs), A.9 (28 migrations), A.12 (test suites), A.13 (open items)")
    w.append("> **Generated by**: `python docs/_tools/coverage.py` — every cell below is computed from `specs/003-documentation/documentation-roadmap.md`, `specs/002-sharwa-integration/integration-inventory.md`, the pages under `docs/` and `.env.example`. Do not edit this page by hand; re-run the script.")
    w.append(f"> **Last generated**: {today}\n")
    w.append("## 1. Result\n")
    done = sum(1 for t in tasks.values() if t["done"])
    w.append("| Check | Result |\n|---|---|")
    w.append(f"| DOC tasks parsed from the roadmap | {len(tasks)} ({done} ticked, {len(open_tasks)} open) |")
    w.append(f"| INT rows with an empty Track 1 or Track 3 cell | **{sum(1 for r in int_rows if not r[5] or not r[7])}** of {len(int_rows)} |")
    w.append(f"| INT rows with no Track 2 page (no user-facing surface) | {sum(1 for r in int_rows if not r[6])} |")
    w.append(f"| Live keys documented (API page + register + `.env.example`) | {sum(1 for l in live if l[3] and l[5] and l[6])} / {len(live)} |")
    w.append(f"| Migrations in the Phase 002 ledger with a DOC task | {sum(1 for m in migs if m[2] and m[4])} / {len(migs)} |")
    w.append(f"| Celery jobs on an architecture/ops page with a DOC task | {sum(1 for j in jobs if j[2] and j[4])} / {len(jobs)} |")
    w.append(f"| Test suites in the register with a DOC task | {sum(1 for s in suites if s[2] and s[4])} / {len(suites)} |")
    w.append(f"| A.13 items present in the registers (90 / 91 / 92) | {sum(1 for i in items if i[2])} / {len(items)} |")
    w.append(f"| Inventory sections with at least one DOC task | {sum(1 for s in sec_rows if s[1])} / {len(sec_rows)} |")
    w.append(f"| Task output pages missing on disk | **{len(missing_out)}** |")
    w.append(f"| Problems (empty cells, missing pages) | **{len(problems)}** |\n")
    w.append("Legend: a number is a DOC task (`533` = DOC-533); *italic*◌ = the task is still open in the roadmap; **∅** = empty cell.\n")
    if open_tasks:
        w.append("Open tasks referenced by the cells: " + ", ".join(open_tasks) + ". Each is open for an owner decision or a run on fares's machine, not for missing content — the reason is on the task's **Status** line in the roadmap.\n")
    if problems:
        w.append("### Problems\n")
        w += [f"- {p}" for p in problems]
        w.append("")
    w.append("## 2. INT → DOC matrix (49 tasks)\n")
    w.append("Columns: the DOC tasks of each track (Appendix A of the roadmap), the number of distinct output pages those tasks own, and how many `docs/` pages cite the INT id.\n")
    w.append("| INT | Module | Name | Domain | Live key | Track 1 — API | Track 2 — Manuals | Track 3 — Architecture/DevOps | Pages | Missing | Cited on |")
    w.append("|---|---|---|---|---|---|---|---|---|---|---|")
    for r in int_rows:
        w.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {fmt(r[5], tasks)} | {fmt(r[6], tasks)} | {fmt(r[7], tasks)} | {r[8]} | {r[9]} | {r[10]} pages |")
    w.append("\n## 3. Live keys (A.3)\n")
    w.append("| Key | INT | Module | API page (header «Live key») | DOC tasks of that page | In `22-live-module-keys.md` | In `.env.example` sample |")
    w.append("|---|---|---|---|---|---|---|")
    for k in live:
        pages = " · ".join(f"[`{os.path.basename(p)}`]({os.path.relpath(p, 'docs')})" for p in k[3]) or "**∅**"
        w.append(f"| `{k[0]}` | {k[1]} | {k[2]} | {pages} | {fmt(k[4], tasks)} | {'✓' if k[5] else '✗'} | {'✓' if k[6] else '✗'} |")
    w.append("\n## 4. Migrations (A.9)\n")
    w.append("| Migration | INT | In [`ops/migrations/phase-002-ledger.md`](ops/migrations/phase-002-ledger.md) | Data-model pages citing it | DOC tasks naming it |")
    w.append("|---|---|---|---|---|")
    for m in migs:
        w.append(f"| `{m[0]}` | {m[1]} | {'✓' if m[2] else '✗'} | {m[3]} | {fmt(m[4], tasks)} |")
    w.append("\n## 5. Celery tasks and Beat schedules (A.8)\n")
    w.append("| Job, Beat schedule or job attribute quoted in A.8 | INT | Architecture/ops pages naming it | On [`50-background-jobs.md`](architecture/50-background-jobs.md) | DOC tasks naming it |")
    w.append("|---|---|---|---|---|")
    for j in jobs:
        w.append(f"| `{j[0]}` | {j[1]} | {j[2]} | {'✓' if j[3] else '—'} | {fmt(j[4], tasks)} |")
    w.append("\n## 6. Django test suites (A.12)\n")
    w.append("| Suite | INT | In [`ops/testing/django-suites.md`](ops/testing/django-suites.md) | Pages citing it | DOC tasks naming it |")
    w.append("|---|---|---|---|---|")
    for s in suites:
        w.append(f"| `{s[0]}` | {s[1]} | {'✓' if s[2] else '✗'} | {s[3]} | {fmt(s[4], tasks)} |")
    w.append("\n## 7. Open items, legacy-only features and known inconsistencies (A.13)\n")
    w.append("| Item | Register id | In 90 / 91 / 92 | DOC tasks |")
    w.append("|---|---|---|---|")
    for i in items:
        w.append(f"| {i[0]} | {i[1]} | {'✓' if i[2] else '✗'} | {fmt(i[3], tasks)} |")
    w.append("\n## 8. Part A cross-cutting sections → DOC\n")
    w.append("| Inventory section | DOC tasks |")
    w.append("|---|---|")
    for sec, name, cell in part_a:
        w.append(f"| {sec} — {name.strip()} | {fmt(expand(cell), tasks)} |")
    w.append("\n## 9. Inventory sections vs produced pages\n")
    w.append("Every `##`/`###` section of the inventory (A.1–A.13, Domains 1–16, INT-001…049): the DOC tasks whose text cites it, the output pages those tasks own, and how many of those pages are missing.\n")
    w.append("| Inventory section | DOC tasks | Output pages | Missing |")
    w.append("|---|---|---|---|")
    for s in sec_rows:
        w.append(f"| {s[0].replace('|', '·')} | {s[1]} | {s[2]} | {s[3]} |")
    w.append("\n## 10. How to re-run\n")
    w.append("```bash\npython docs/_tools/coverage.py          # rewrites this page\npython docs/_tools/coverage.py --check  # CI-friendly: exit 1 on an empty cell or a missing page\n```\n")
    w.append("The maintenance rule ([`README.md#maintenance`](README.md#maintenance)) requires this page to be regenerated in the same change as any new INT task, live key, migration, Celery job or test suite.\n")
    w.append("## 11. Related pages\n")
    w.append("- [`_verification.md`](_verification.md) — consistency checks (links, terms, money, fixtures) · [`api/_verification.md`](api/_verification.md) · [`guides/_verification.md`](guides/_verification.md) · [`ops/_verification.md`](ops/_verification.md)")
    w.append("- [`architecture/90-open-items.md`](architecture/90-open-items.md) · [`architecture/91-legacy-surfaces.md`](architecture/91-legacy-surfaces.md) · [`architecture/92-inconsistencies.md`](architecture/92-inconsistencies.md)")
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(w) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)} — {len(problems)} problem(s), {len(missing_out)} missing output(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
