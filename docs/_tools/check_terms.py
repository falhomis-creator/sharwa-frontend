#!/usr/bin/env python3
"""Consistency checker for sharwa-frontend/docs (DOC-534).

Rules (each finding names the file and line):
  T1  live keys     — every key in a `SHARWA_LIVE_MODULES=` line is one of the 39 keys of glossary §4,
                      and the `.env.example` sample line lists exactly those 39 keys (A.13 KI-01 parity).
  T2  module ids    — M01–M49 only (two digits); mermaid blocks are skipped.
  T3  permissions   — every backticked `area.action` token whose area and action are those of a seeded key
                      (and every `check(request, "…")`) is one of the keys of api/overview/permissions.md §2.
  T4  plan features — a code written as "plan feature `x`" exists in api/overview/plan-features.md.
  T5  money         — «… ر.س» / «… ر.ي» amounts follow format_money (A.6): thousands commas; SAR whole
                      amounts without decimals, otherwise two; Yemeni rials whole.
  T6  UI terms      — Arabic guides use the UI label, not the words the UI does not use
                      (guides/_glossary.md): «عضو فريق», «صندوق الوارد», «محفظة التاجر», «طابور البوليصات»;
                      courier guides say «المناوبة», never «الوردية».
  T7  anchors       — no `{#id}` heading attributes (GitHub does not render them); use `<a id="…"></a>`.
  T8  phone numbers — only the fixture numbers listed in allow.json appear.
  T9  secrets       — no live-looking keys or tokens, except test fixtures listed in allow.json.

Accepted exceptions live in docs/_tools/allow.json as {"rule", "file", "text", "reason"}.
docs/_verification.md (the report of these checks, which quotes the findings) is not scanned.
Usage (from the sharwa-frontend folder): python docs/_tools/check_terms.py
Exit code 0 = no finding outside allow.json, 1 = findings (printed).
"""
import json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOCS = os.path.join(ROOT, "docs")
HERE = os.path.dirname(os.path.abspath(__file__))


def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


glossary = read(os.path.join(DOCS, "glossary.md"))
LIVE_KEYS = set()
for row in re.finditer(r"^\| M\d\d \| INT-\d+ \|[^|]*\|[^|]*\| \d\d \| ([^|]*)\|", glossary, re.M):
    LIVE_KEYS.update(re.findall(r"`([a-z0-9_]+)`", row.group(1)))
PERMS = set(re.findall(r"^\|\s*`([a-z0-9_]+(?:\.[a-z0-9_]+)+)`\s*\|", read(os.path.join(DOCS, "api/overview/permissions.md")), re.M))
PERM_HEADS = {k.split(".")[0] for k in PERMS}
PERM_VERBS = {k.split(".")[-1] for k in PERMS}
FEATURES = set(re.findall(r"^\|\s*`([a-z0-9_]+)`\s*\|", read(os.path.join(DOCS, "api/overview/plan-features.md")), re.M))
ALLOW = json.load(open(os.path.join(HERE, "allow.json"), encoding="utf-8"))
PHONE = re.compile(r"(?<![\d.])(?:\+?967\s?7\d{8}|\+?966\s?5\d{8}|0[57]\d{8}|7\d{8})(?![\d])")
SECRET = re.compile(r"(sk_live_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|"
                    r"shw_pat_[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xox[bap]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{35}|EAA[A-Za-z0-9]{40,})")
MONEY = re.compile(r"(?<![\w.,$])([0-9][0-9,]*(?:\.[0-9]+)?)\s*(ر\.س|ر\.ي)")
SELF_REPORTS = {"docs/_verification.md"}  # the report of this checker quotes its findings on purpose
UI_WORDS = ["عضو فريق", "صندوق الوارد", "محفظة التاجر", "طابور البوليصات"]


def allowed(rule, rel, text):
    return any(a["rule"] == rule and a["file"] == rel and a["text"] in text for a in ALLOW)


def money_problem(num, cur):
    whole = num.split(".")[0]
    if whole.replace(",", "") == "" or whole != f"{int(whole.replace(',', '')):,}":
        return "thousands separator"
    if "." in num:
        dec = num.split(".")[1]
        if cur == "ر.ي":
            return "Yemeni rial amounts are whole numbers"
        if len(dec) != 2:
            return "SAR takes 0 or 2 decimals"
        if dec == "00":
            return "a whole SAR amount has no decimals"
    return None


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Arabic + "·" on Windows consoles


def main():
    findings = []

    def hit(rule, rel, n, text, why):
        if not allowed(rule, rel, text):
            findings.append((rule, rel, n, why, text.strip()[:140]))

    env = read(os.path.join(ROOT, ".env.example"))
    sample = re.search(r"^# SHARWA_LIVE_MODULES=([a-z0-9_,]+)\s*$", env, re.M)
    env_keys = set(sample.group(1).split(",")) if sample else set()
    if env_keys != LIVE_KEYS:
        findings.append(("T1", ".env.example", 0, "sample line differs from glossary §4",
                         f"missing {sorted(LIVE_KEYS - env_keys)} extra {sorted(env_keys - LIVE_KEYS)}"))
    for dirpath, _, files in os.walk(DOCS):
        for name in sorted(files):
            if not name.endswith(".md"):
                continue
            page = os.path.join(dirpath, name)
            rel = os.path.relpath(page, ROOT).replace(os.sep, "/")
            if rel in SELF_REPORTS:
                continue
            in_guides = rel.startswith("docs/guides/") and not rel.endswith("_glossary.md")
            fence, lang = False, ""
            for n, line in enumerate(read(page).split("\n"), 1):
                if line.lstrip().startswith("```"):
                    fence, lang = (not fence), line.strip()[3:]
                    continue
                if re.search(r"\{#[A-Za-z0-9_-]+\}", re.sub(r"`[^`]*`", "", line)) and not fence:
                    hit("T7", rel, n, line, "{#id} anchor attribute")
                for m in re.finditer(r"SHARWA_LIVE_MODULES=([A-Za-z0-9_,]+)", line):
                    for key in m.group(1).split(","):
                        if key and key not in LIVE_KEYS and key not in ("none",):
                            hit("T1", rel, n, line, f"unknown live key «{key}»")
                if not (fence and lang.startswith("mermaid")):
                    for m in re.finditer(r"(?<![\w-])M(\d{1,3})(?![\w-])", line):
                        if len(m.group(1)) == 2 and 1 <= int(m.group(1)) <= 49:
                            continue
                        if not fence:
                            hit("T2", rel, n, line, f"module id «M{m.group(1)}»")
                for key in re.findall(r"`([a-z0-9_]+(?:\.[a-z0-9_]+)+)`", line) + re.findall(r"check\(request,\s*\"([a-z0-9_.]+)\"", line):
                    if key.split(".")[0] in PERM_HEADS and key.split(".")[-1] in PERM_VERBS and key not in PERMS:
                        hit("T3", rel, n, line, f"permission-shaped «{key}» is not a seeded key")
                for m in re.finditer(r"plan feature\s+`([a-z][a-z0-9_]*)`", line, re.I):
                    if m.group(1) not in FEATURES:
                        hit("T4", rel, n, line, f"unknown plan feature «{m.group(1)}»")
                for m in MONEY.finditer(line):
                    why = money_problem(*m.groups())
                    if why:
                        hit("T5", rel, n, line, f"«{m.group(0)}»: {why}")
                if in_guides and not line.lstrip().startswith("<!--"):
                    for w in UI_WORDS:
                        if w in line:
                            hit("T6", rel, n, line, f"«{w}» is not a UI label")
                    if "/courier/" in rel and "الوردية" in line:
                        hit("T6", rel, n, line, "courier guides say «المناوبة»")
                for m in PHONE.finditer(line):
                    digits = re.sub(r"\D", "", m.group(0))
                    if not any(a["rule"] == "T8" and a["text"] == digits for a in ALLOW):
                        hit("T8", rel, n, line, f"phone-like number {digits} is not a listed fixture")
                for m in SECRET.finditer(line):
                    hit("T9", rel, n, line, f"secret-like value {m.group(0)[:24]}…")
    counts = {}
    for f in findings:
        counts[f[0]] = counts.get(f[0], 0) + 1
    print(f"live keys {len(LIVE_KEYS)} · permission keys {len(PERMS)} · plan features {len(FEATURES)} · "
          f"findings {len(findings)} {counts if counts else ''}")
    for f in findings:
        print("{} {}:{}  {}  | {}".format(*f))
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
