#!/usr/bin/env python3
"""Link checker for sharwa-frontend/docs (DOC-534).

Checks every relative Markdown link and image in docs/**/*.md:
  * the target file or folder exists in the repository;
  * a `#fragment` matches a GitHub heading slug or an explicit `<a id="…">` in the target page.

Screenshots that are registered but not captured yet (an id in docs/guides/_assets/shots.json,
or an image line carrying a `<!-- capture: … -->` comment) are reported as PENDING, not as broken.
Links containing a `<placeholder>` (templates) are skipped.

Usage (from the sharwa-frontend folder):  python docs/_tools/check_links.py [--list-pending]
Exit code 0 = no broken link, 1 = broken links (printed).
"""
import json, os, re, sys, unicodedata
from urllib.parse import unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOCS = os.path.join(ROOT, "docs")
LINK = re.compile(r"(!?)\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")


def slug(text):
    parts = text.split("`")
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r"<[^>]+>", "", parts[i])
    text = "".join(parts).strip().lower()
    out = []
    for ch in text:
        cat = unicodedata.category(ch)
        if ch == " ":
            out.append("-")
        elif ch in "-_" or cat[0] in "LN" or cat in ("Mn", "Mc"):
            out.append(ch)
    return "".join(out)


_anchors = {}


def anchors(path):
    if path in _anchors:
        return _anchors[path]
    found, seen, fence = set(), {}, False
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if line.lstrip().startswith("```"):
                fence = not fence
                continue
            if fence:
                continue
            m = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", line)
            if m:
                base = slug(m.group(2))
                n = seen.get(base, 0)
                seen[base] = n + 1
                found.add(base if n == 0 else f"{base}-{n}")
            found.update(a.lower() for a in re.findall(r"<a\s+(?:name|id)=[\"']([^\"']+)[\"']", line))
    _anchors[path] = found
    return found


def registered_shots():
    try:
        with open(os.path.join(DOCS, "guides", "_assets", "shots.json"), encoding="utf-8") as fh:
            return {s["id"] for s in json.load(fh)}
    except (OSError, ValueError, KeyError):
        return set()


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Arabic + "·" on Windows consoles


def main():
    shots = registered_shots()
    broken, pending, total = [], [], 0
    for dirpath, _, files in os.walk(DOCS):
        for name in sorted(files):
            if not name.endswith(".md"):
                continue
            page = os.path.join(dirpath, name)
            rel = os.path.relpath(page, ROOT).replace(os.sep, "/")
            fence = False
            with open(page, encoding="utf-8", errors="replace") as fh:
                for lineno, line in enumerate(fh, 1):
                    if line.lstrip().startswith("```"):
                        fence = not fence
                        continue
                    if fence:
                        continue
                    code_free = re.sub(r"`[^`]*`", "", line)
                    for m in LINK.finditer(code_free):
                        is_img, target = m.group(1) == "!", m.group(2)
                        if re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I) or "<" in target or "{" in target:
                            continue
                        total += 1
                        path_part, _, frag = target.partition("#")
                        path_part = unquote(path_part.split("?")[0])
                        dest = page if not path_part else os.path.normpath(os.path.join(dirpath, path_part))
                        if not os.path.abspath(dest).startswith(ROOT + os.sep):
                            broken.append((rel, lineno, target, "outside the repository"))
                            continue
                        if not os.path.exists(dest):
                            dest_rel = os.path.relpath(dest, ROOT).replace(os.sep, "/")
                            shot_id = re.sub(r"(-mobile)?\.png$", "", dest_rel.replace("docs/guides/_assets/", ""))
                            if is_img and dest_rel.startswith("docs/guides/_assets/") and (shot_id in shots or "<!-- capture:" in line):
                                pending.append((rel, lineno, dest_rel, "registered" if shot_id in shots else "capture comment only"))
                            else:
                                broken.append((rel, lineno, target, "missing file"))
                            continue
                        if frag and dest.endswith(".md") and unquote(frag).lower() not in anchors(dest):
                            broken.append((rel, lineno, target, "missing anchor"))
    print(f"links checked: {total} · broken: {len(broken)} · pending screenshots: {len(pending)} "
          f"({sum(1 for p in pending if p[3] == 'registered')} registered in shots.json, "
          f"{sum(1 for p in pending if p[3] != 'registered')} with a capture comment only)")
    for b in broken:
        print("BROKEN  {}:{}  {}  ({})".format(*b))
    if "--list-pending" in sys.argv:
        for p in pending:
            print("PENDING {}:{}  {}  ({})".format(*p))
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
