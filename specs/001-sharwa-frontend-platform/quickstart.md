# Quickstart — تشغيل وفحص منصة شروه (الواجهة)

**الهدف**: إثبات أن الأساس يعمل من طرف إلى طرف (حلّ المستأجر → BFF → صفحات المجموعات) قبل وأثناء تنفيذ الوحدات. التفاصيل في `plan.md`, `contracts/`, `data-model.md`.

## 1. المتطلبات
- Node ≥ 20.9 (المثبَّت: 24.20) · npm 11 · Git · Python 3 (لسكربتات SpecKit؛ شغّلها دائماً بـ `PYTHONIOENCODING=utf-8`).
- متصفح Chromium (Playwright MCP متاح في الجلسة؛ `@playwright/test` dev-dep لسكربت اللقطات).
- الباك إند Django **اختياري** في التطوير: `SHARWA_MOCKS=on` يُشغّل كل عقود `[NEEDS BACKEND]` من `src/mocks/`؛ العقود Ready تحتاج `API_INTERNAL_URL` حقيقياً أو mock مكافئاً.
- **ممنوع** أي كتابة في `C:\sharwa_saas`.

## 2. الإعداد
```bash
npm install
```
`.env.local` (لا يُلتزم):
```
TENANT_BASE_DOMAIN=localhost
NEXT_PUBLIC_TENANT_BASE_DOMAIN=localhost
API_INTERNAL_URL=http://localhost:8000
NEXT_PUBLIC_PLATFORM_WHATSAPP=967700000000
SHARWA_MOCKS=on
```
البناء يفشل برسالة واضحة إن غاب `TENANT_BASE_DOMAIN` (`src/env.ts`).

## 3. التشغيل
```bash
npm run dev
```
| Host | ما يجب أن تراه |
|---|---|
| `http://localhost:3000/` | الصفحة الترويجية `(marketing)` بالعربية RTL، خط IBM Plex Sans Arabic، لوحة zinc |
| `http://localhost:3000/register` | معالج التأسيس `(onboarding)` |
| `http://demo.localhost:3000/` | متجر `demo`: مع mocks → واجهة المتجر؛ مع Django بلا متجر → صفحة «لم نجد متجراً» (404) |
| `http://demo.localhost:3000/dashboard` | لوحة التاجر `(dashboard)` (تسجيل دخول عبر BFF) |
| `http://console.localhost:3000/` | لوحة إدارة المنصة `(admin)` |
| `http://localhost:3000/_s/demo/` | **404** (البادئات الداخلية محجوبة من الشبكة) |

## 4. سيناريوهات التحقق (تُنفَّذ لكل وحدة قبل وسم `*-after`)
1. **حلّ المستأجر**: افتح `demo.localhost:3000` و`shop2.localhost:3000` بالتناوب 5 مرات؛ `store_name` في الرأس يطابق الـ host كل مرة؛ لا `?store=` في أي رابط.
2. **503 التجهيز**: اضبط mock الـ probe ليعيد 503 ثم `provisioning`×3 ثم `ready` → صفحة الانتظار تتحول آلياً إلى `dashboard_url` (M47 US-47.3).
3. **كوكيز السلة**: أضف منتجاً من PDP، أعد تحميل الصفحة، العدّاد يبقى (كوكي `sessionid` first-party عبر BFF).
4. **CSRF**: تسجيل دخول التاجر ينجح بلا قراءة `document.cookie`؛ POST تالٍ يحمل `X-CSRFToken`.
5. **RTL/Anti-AI**: `grep -rE "\b(ml|mr|pl|pr|left|right|text-left|text-right)-" src --include=*.tsx` = 0 نتيجة؛ `grep -rE "#[0-9a-fA-F]{3,6}|oklch\(" src --include=*.tsx` = 0 نتيجة (الاستثناء `globals.css`).
6. **الجودة**:
```bash
npm run lint
```
```bash
npx tsc --noEmit
```
7. **الفحص البصري** (يلتقط 1440×900، 768×1024، 390×844 + داكن ويفشل عند خطأ console/hydration أو تمرير أفقي):
```bash
npm run visual-check -- --slug 01-landing --url http://localhost:3000/
```
اللقطات في `docs/visual-checks/01-landing/{desktop,tablet,mobile,desktop-dark}.png`.

## 5. نقاط الاستعادة (الدستور III)
قبل كل مرحلة:
```bash
git add -A; git commit -m "chore(rp): before <slug>"; git tag -a rp/NN-<slug>-before -m "<وصف>"
```
بعد الفحص البصري:
```bash
git commit -m "feat(<module>): <summary>"; git tag -a rp/NN-<slug>-after -m "<وصف>"
```
ثم سطر في `.specify/memory/restore-points.md`. كلمة **«استعادة»** من المالك ⇒ `git stash push -u` ثم `git reset --hard <آخر *-before>` فوراً.

## 6. الخطوة التالية
`/speckit-tasks` لتوليد `tasks.md` (Phase 1 تأسيس → Phase 2 أساسيات مشتركة → M01 → M47/M03 → M02 → M04/M05/M06 → M09–M12 → M34 → P2 → P3).
