# Contracts — Sharwa Frontend Platform (001)

| File | What it fixes |
|---|---|
| [bff-cross-cutting.md](bff-cross-cutting.md) | عقد الـ proxy (حلّ المستأجر وإعادة الكتابة)، الـ BFF نفس الأصل، الكوكيز وCSRF، شكل الأخطاء، المال، الترقيم، مفاتيح الكاش، متغيرات البيئة، بروتوكول الـ Mock |
| [ready-api-v1.md](ready-api-v1.md) | الـ endpoints الموجودة فعلاً على `/api/v1` اليوم (25) مع اسم شيما Zod لكل منها |
| [needs-backend-inventory.md](needs-backend-inventory.md) | **مولَّد آلياً** من §7 في الوحدات الـ 49: 453 صفاً (65 Ready · 368 `[NEEDS BACKEND]` · 20 محلي) — فهرس فريق الباك إند ومصدر الـ mocks |

قواعد:
1. المصدر الحاكم لأي صف هو ملف الوحدة `modules/M*.md` §7؛ عند التعديل يُعدَّل هناك ثم يُعاد توليد الفهرس (`PYTHONIOENCODING=utf-8 python .specify/scripts/python/gen_contracts_inventory.py` من جذر المستودع).
2. كل عقد `[NEEDS BACKEND]` يُنفَّذ كـ Route Handler تحت `src/app/api/bff/**` يخدم من `src/mocks/<module>/*.ts` بنفس الشكل، ويُعلَّم `x-sharwa-mock: 1`.
3. لا يُزعم اكتمال التكامل لأي وحدة فيها صف `[NEEDS BACKEND]`؛ تقرير التسليم يذكرها.
