import re, pathlib, io, sys
root = pathlib.Path("specs/001-sharwa-frontend-platform")
mods = sorted((root/"modules").glob("M*.md"))
out = io.StringIO()
out.write("# Backend Gap Inventory — عقود البيانات المجمَّعة من الوحدات الـ 49\n\n")
out.write("> مولَّد آلياً من §7 «عقد البيانات» في كل `modules/M*.md` (2026-10-17). المصدر الحاكم هو ملف الوحدة؛ هذا الملف فهرس تجميعي لـ `/speckit-tasks` ولفريق الباك إند.\n")
out.write("> **Ready** = موجود اليوم على `/api/v1` ويُستهلك مباشرة عبر الـ BFF. **`[NEEDS BACKEND]`** = يُبنى على Mock محلي بنفس العقد تحت `src/mocks/` ويُعلَّم في الواجهة.\n\n")
tot_ready = tot_nb = tot_other = 0
rows_all = []
for m in mods:
    txt = m.read_text(encoding="utf-8")
    title = txt.splitlines()[0].lstrip("# ").strip()
    sec = re.search(r"^## 7\..*?$(.*?)^## 8\.", txt, re.S|re.M)
    if not sec: continue
    rows = [l for l in sec.group(1).splitlines() if l.startswith("|") and not re.match(r"^\|\s*Need", l) and not re.match(r"^\|-{2,}", l)]
    ready = sum(1 for r in rows if "[NEEDS BACKEND]" not in r and re.search(r"\bReady\b", r))
    nb = sum(1 for r in rows if "[NEEDS BACKEND]" in r)
    other = len(rows) - ready - nb
    tot_ready += ready; tot_nb += nb; tot_other += other
    rows_all.append((m.name, title, rows, ready, nb, other))
out.write("## Summary\n\n| Module | Rows | Ready | `[NEEDS BACKEND]` | n/a / local |\n|---|---|---|---|---|\n")
for name, title, rows, ready, nb, other in rows_all:
    code = name.split("-")[0]
    out.write(f"| [{code}](../modules/{name}) | {len(rows)} | {ready} | {nb} | {other} |\n")
out.write(f"| **Total** | **{tot_ready+tot_nb+tot_other}** | **{tot_ready}** | **{tot_nb}** | **{tot_other}** |\n\n")
out.write("## Per-module rows\n\n")
for name, title, rows, ready, nb, other in rows_all:
    out.write(f"### {title}\n\n| Need | Backend today | Status |\n|---|---|---|\n")
    for r in rows: out.write(r + "\n")
    out.write("\n")
(root/"contracts"/"needs-backend-inventory.md").write_text(out.getvalue(), encoding="utf-8")
print(f"rows={tot_ready+tot_nb+tot_other} ready={tot_ready} needs_backend={tot_nb} other={tot_other}")
